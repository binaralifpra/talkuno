"use client";

import { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import {
  IconX,
  IconPlayerPlay,
  IconPlayerPause,
  IconVolume,
  IconVolumeOff,
  IconMaximize,
  IconMinimize,
} from "@tabler/icons-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getTopicById } from "@/lib/curriculum";

// ── Helpers ────────────────────────────────────────────────────────────────

function pad(n: number) { return n.toString().padStart(2, "0"); }

function fmtTime(s: number): string {
  if (!isFinite(s) || isNaN(s) || s < 0) return "0:00";
  return `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`;
}

function fmtDate(ts: Take["created_at"]): string {
  const anyTs = ts as { toDate?: () => Date } | null;
  if (!anyTs || typeof anyTs.toDate !== "function") return "";
  return anyTs.toDate().toLocaleDateString("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  });
}

// ── Types ──────────────────────────────────────────────────────────────────

interface Take {
  id: string;
  take_id: string;
  video_url: string;
  storage_path?: string;
  duration_seconds: number;
  is_best: boolean;
  created_at: unknown;
}

const BACK: Record<string, string> = {
  dashboard: "/dashboard",
  kalender: "/kalender",
  riwayat: "/riwayat",
};

const SPEEDS = [0.5, 1, 1.5, 2];

// Shared icon button style inside the dark control bar
const iconBtn: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "#fff",
  cursor: "pointer",
  padding: 4,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  opacity: 0.85,
  borderRadius: 4,
};

// ── Take thumbnail (horizontal strip) ─────────────────────────────────────

function TakeThumb({
  take, index, isActive, onClick,
}: {
  take: Take; index: number; isActive: boolean; onClick: () => void;
}) {
  const vRef = useRef<HTMLVideoElement>(null);
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0, width: 140, background: "none",
        border: "none", padding: 0, cursor: "pointer", textAlign: "left",
      }}
    >
      {/* Thumbnail box */}
      <div
        style={{
          width: 140, height: 105, borderRadius: 8,
          overflow: "hidden", backgroundColor: "#1c1210",
          border: isActive
            ? "2.5px solid var(--color-talkuno-coral)"
            : "2.5px solid transparent",
          position: "relative",
          transition: "border-color 0.15s",
        }}
      >
        <video
          ref={vRef}
          src={take.video_url}
          preload="metadata"
          muted
          playsInline
          onLoadedMetadata={() => { if (vRef.current) vRef.current.currentTime = 0.1; }}
          style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
        />
        {/* Dark overlay */}
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.2)" }} />

        {/* "Terbaik" badge */}
        {take.is_best && (
          <div
            style={{
              position: "absolute", top: 5, left: 5,
              backgroundColor: "var(--color-talkuno-coral)",
              borderRadius: 4, padding: "1px 5px",
            }}
          >
            <span style={{ fontFamily: "var(--font-body)", fontSize: 9, fontWeight: 700, color: "#fff", letterSpacing: "0.06em" }}>
              TERBAIK
            </span>
          </div>
        )}

        {/* Duration badge */}
        <div
          style={{
            position: "absolute", bottom: 5, right: 5,
            backgroundColor: "rgba(0,0,0,0.55)",
            borderRadius: 3, padding: "1px 5px",
          }}
        >
          <span style={{ fontFamily: "var(--font-body)", fontSize: 10, fontWeight: 600, color: "#fff", fontVariantNumeric: "tabular-nums" }}>
            {fmtTime(take.duration_seconds)}
          </span>
        </div>
      </div>

      {/* Label */}
      <p
        style={{
          fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500,
          color: isActive ? "var(--color-talkuno-coral)" : "rgba(43,36,32,0.45)",
          marginTop: 5, transition: "color 0.15s",
        }}
      >
        Take {index + 1}
      </p>
    </button>
  );
}

// ── Main component ─────────────────────────────────────────────────────────

function RekamanContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();

  const dayNumber = parseInt((params.day_number as string) ?? "1", 10);
  const fromParam = searchParams.get("from") ?? "";
  const initTakeId = searchParams.get("take") ?? "";

  const topic = getTopicById(`day-${dayNumber}`);

  // ── Data state ─────────────────────────────────────────────────────────

  const [takes, setTakes] = useState<Take[]>([]);
  const [activeTakeId, setActiveTakeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Video player state ─────────────────────────────────────────────────

  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  // ── Refs ───────────────────────────────────────────────────────────────

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTake = takes.find((t) => t.id === activeTakeId) ?? null;
  const activeTakeIndex = takes.findIndex((t) => t.id === activeTakeId);

  // ── Load takes ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;
    async function load() {
      try {
        const snap = await getDocs(
          query(
            collection(db, "users", user!.uid, "days", String(dayNumber), "takes"),
            orderBy("created_at", "asc")
          )
        );
        const list: Take[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<Take, "id">),
        }));
        setTakes(list);

        // Pick initial take
        if (initTakeId && list.some((t) => t.id === initTakeId)) {
          setActiveTakeId(initTakeId);
        } else {
          const best = list.find((t) => t.is_best);
          setActiveTakeId(best?.id ?? list[0]?.id ?? null);
        }
      } catch (e) {
        console.error("Load takes error:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [user, dayNumber, initTakeId]);

  // Reset player state when take changes
  useEffect(() => {
    setPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setHasStarted(false);
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }, [activeTakeId]);

  // ── Fullscreen listener ────────────────────────────────────────────────

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ── Auto-hide controls ─────────────────────────────────────────────────

  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  }, []);

  // ── Video event handlers ───────────────────────────────────────────────

  function onTimeUpdate() {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  }

  function onLoadedMetadata() {
    if (videoRef.current) {
      // Workaround for WebM Infinity duration:
      videoRef.current.currentTime = Number.MAX_SAFE_INTEGER;
      videoRef.current.playbackRate = speed;
      videoRef.current.volume = volume;
      videoRef.current.muted = muted;
    }
  }

  function onDurationChange() {
    if (videoRef.current) {
      const dur = videoRef.current.duration;
      if (dur !== Infinity && !isNaN(dur)) {
        setDuration(dur);
        // Reset to 0 if it was pushed to the end by the workaround
        if (!hasStarted && videoRef.current.currentTime > dur * 0.9) {
          videoRef.current.currentTime = 0;
        }
      }
    }
  }

  function onEnded() {
    setPlaying(false);
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
  }

  // ── Controls ───────────────────────────────────────────────────────────

  function togglePlay() {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setPlaying(true);
      setHasStarted(true);
      resetHideTimer();
    } else {
      videoRef.current.pause();
      setPlaying(false);
      setShowControls(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    }
  }

  function handleVideoClick() {
    if (!showControls) { resetHideTimer(); return; }
    togglePlay();
  }

  function onSeek(e: React.ChangeEvent<HTMLInputElement>) {
    const t = parseFloat(e.target.value);
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  }

  function onVolumeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = parseFloat(e.target.value);
    setVolume(v);
    setMuted(v === 0);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
    }
  }

  function toggleMute() {
    if (!videoRef.current) return;
    const next = !muted;
    setMuted(next);
    videoRef.current.muted = next;
  }

  function changeSpeed(s: number) {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  }

  function toggleFullscreen() {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }

  function goBack() {
    const dest = BACK[fromParam];
    if (dest) router.push(dest);
    else router.back();
  }

  // ── Computed ───────────────────────────────────────────────────────────

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const controlsVisible = showControls || !playing;

  return (
    <div
      style={{
        padding: "28px 32px",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      {/* ── Header ────────────────────────────────────────────────────────── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <button
          onClick={goBack}
          style={{
            width: 32, height: 32, borderRadius: "50%",
            backgroundColor: "rgba(43,36,32,0.06)",
            border: "none", cursor: "pointer", color: "var(--color-talkuno-dark)",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconX size={16} stroke={2} />
        </button>
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 15,
              color: "var(--color-talkuno-dark)", margin: 0,
              overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
            }}
          >
            Hari {dayNumber}{topic ? ` — ${topic.title}` : ""}
          </p>
          {activeTake && (
            <p
              style={{
                fontFamily: "var(--font-body)", fontSize: 12,
                color: "rgba(43,36,32,0.5)", margin: 0, marginTop: 2,
              }}
            >
              Take {activeTakeIndex + 1}
              {fmtDate(activeTake.created_at) ? ` · ${fmtDate(activeTake.created_at)}` : ""}
            </p>
          )}
        </div>
      </div>

      {/* ── Video player ──────────────────────────────────────────────────── */}
      <div>
        <div
          ref={containerRef}
          style={{
            position: "relative",
            backgroundColor: "#000",
            userSelect: "none",
            maxWidth: 640,
            borderRadius: 12,
            overflow: "hidden",
            aspectRatio: "16/9",
            width: "100%",
          }}
          onMouseMove={resetHideTimer}
          onMouseLeave={() => { if (playing) setShowControls(false); }}
        >
          {/* Video element */}
          {activeTake ? (
            <video
              ref={videoRef}
              key={activeTakeId ?? ""}
              src={activeTake.video_url}
              style={{
                position: "absolute", inset: 0,
                width: "100%", height: "100%",
                objectFit: "cover",
                cursor: controlsVisible ? "pointer" : "none",
              }}
              onTimeUpdate={onTimeUpdate}
              onLoadedMetadata={onLoadedMetadata}
              onDurationChange={onDurationChange}
              onEnded={onEnded}
              onClick={handleVideoClick}
            />
          ) : (
            <div
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(255,255,255,0.3)" }}>
                {loading ? "Memuat rekaman…" : "Tidak ada rekaman"}
              </p>
            </div>
          )}

          {/* Big play overlay — shown before first play */}
          {!hasStarted && activeTake && (
            <div
              style={{
                position: "absolute", inset: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer",
              }}
              onClick={togglePlay}
            >
              <div
                style={{
                  width: 72, height: 72, borderRadius: "50%",
                  backgroundColor: "rgba(255,255,255,0.14)",
                  backdropFilter: "blur(6px)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "transform 0.15s",
                }}
              >
                <IconPlayerPlay size={32} stroke={2} style={{ color: "#fff", marginLeft: 4 }} />
              </div>
            </div>
          )}

          {/* ── Custom control bar ──────────────────────────────────────── */}
          {activeTake && (
            <div
              style={{
                position: "absolute", bottom: 0, left: 0, right: 0,
                background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 65%, transparent 100%)",
                padding: "28px 16px 12px",
                opacity: controlsVisible ? 1 : 0,
                transition: "opacity 0.3s",
                pointerEvents: controlsVisible ? "auto" : "none",
              }}
            >
              {/* Timeline row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                {/* Current time */}
                <span
                  style={{
                    fontFamily: "var(--font-body)", fontSize: 11,
                    color: "rgba(255,255,255,0.75)",
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 32, textAlign: "right", flexShrink: 0,
                  }}
                >
                  {fmtTime(currentTime)}
                </span>

                {/* Scrubber */}
                <input
                  type="range"
                  className="talkuno-scrubber"
                  min={0}
                  max={duration || 100}
                  step={0.1}
                  value={currentTime}
                  onChange={onSeek}
                  style={{
                    flex: 1,
                    background: `linear-gradient(to right,
                      #FF6B45 0%, #FF6B45 ${progressPct}%,
                      rgba(255,255,255,0.22) ${progressPct}%, rgba(255,255,255,0.22) 100%)`,
                  }}
                />

                {/* Duration */}
                <span
                  style={{
                    fontFamily: "var(--font-body)", fontSize: 11,
                    color: "rgba(255,255,255,0.45)",
                    fontVariantNumeric: "tabular-nums",
                    minWidth: 32, flexShrink: 0,
                  }}
                >
                  {fmtTime(duration)}
                </span>
              </div>

              {/* Controls row */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>

                {/* Left: play/pause · volume */}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <button onClick={togglePlay} style={iconBtn} title={playing ? "Pause" : "Play"}>
                    {playing
                      ? <IconPlayerPause size={20} stroke={2} />
                      : <IconPlayerPlay size={20} stroke={2} />}
                  </button>
                  <button onClick={toggleMute} style={iconBtn} title="Mute/Unmute">
                    {muted || volume === 0
                      ? <IconVolumeOff size={18} stroke={2} />
                      : <IconVolume size={18} stroke={2} />}
                  </button>
                  <input
                    type="range"
                    className="talkuno-volume"
                    min={0}
                    max={1}
                    step={0.05}
                    value={muted ? 0 : volume}
                    onChange={onVolumeChange}
                    style={{ width: 68 }}
                  />
                </div>

                {/* Right: speed · fullscreen */}
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <select
                    value={speed}
                    onChange={(e) => changeSpeed(parseFloat(e.target.value))}
                    style={{
                      backgroundColor: "rgba(255,255,255,0.1)",
                      color: "#fff",
                      border: "1px solid rgba(255,255,255,0.15)",
                      borderRadius: 5,
                      padding: "3px 8px",
                      fontSize: 12,
                      fontFamily: "var(--font-body)",
                      cursor: "pointer",
                      outline: "none",
                    }}
                  >
                    {SPEEDS.map((s) => (
                      <option key={s} value={s} style={{ backgroundColor: "#1a100d" }}>
                        {s}x
                      </option>
                    ))}
                  </select>

                  <button onClick={toggleFullscreen} style={iconBtn} title="Fullscreen">
                    {isFullscreen
                      ? <IconMinimize size={18} stroke={2} />
                      : <IconMaximize size={18} stroke={2} />}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Take strip ────────────────────────────────────────────────────── */}
      {!loading && takes.length > 0 && (
        <div
          style={{
            marginTop: 16,
          }}
        >
          <p
            style={{
              fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 600,
              color: "rgba(43,36,32,0.4)", marginBottom: 14,
              letterSpacing: "0.04em", textTransform: "uppercase",
            }}
          >
            Take lain dari hari ini
          </p>
          <div
            style={{
              display: "flex", gap: 12,
              overflowX: "auto", paddingBottom: 6,
              /* Hide scrollbar but keep scrollable */
              msOverflowStyle: "none",
            }}
          >
            {takes.map((take, i) => (
              <TakeThumb
                key={take.id}
                take={take}
                index={i}
                isActive={take.id === activeTakeId}
                onClick={() => setActiveTakeId(take.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── CSS for custom range inputs ───────────────────────────────────── */}
      <style>{`
        /* Scrubber (progress bar) */
        .talkuno-scrubber {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 4px;
          outline: none;
          cursor: pointer;
        }
        .talkuno-scrubber::-webkit-slider-runnable-track {
          height: 4px;
          border-radius: 4px;
          background: transparent;
        }
        .talkuno-scrubber::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #FF6B45;
          cursor: pointer;
          margin-top: -5px;
          box-shadow: 0 0 6px rgba(255,107,69,0.6);
          transition: transform 0.1s;
        }
        .talkuno-scrubber:hover::-webkit-slider-thumb {
          transform: scale(1.2);
        }
        .talkuno-scrubber::-moz-range-thumb {
          width: 14px;
          height: 14px;
          border: none;
          border-radius: 50%;
          background: #FF6B45;
          cursor: pointer;
        }
        .talkuno-scrubber::-moz-range-track {
          height: 4px;
          border-radius: 4px;
          background: rgba(255,255,255,0.22);
        }

        /* Volume slider */
        .talkuno-volume {
          -webkit-appearance: none;
          appearance: none;
          height: 3px;
          border-radius: 3px;
          background: rgba(255,255,255,0.25);
          outline: none;
          cursor: pointer;
        }
        .talkuno-volume::-webkit-slider-runnable-track {
          height: 3px;
          border-radius: 3px;
          background: transparent;
        }
        .talkuno-volume::-webkit-slider-thumb {
          -webkit-appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
          margin-top: -4.5px;
        }
        .talkuno-volume::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border: none;
          border-radius: 50%;
          background: #fff;
          cursor: pointer;
        }
        .talkuno-volume::-moz-range-track {
          height: 3px;
          border-radius: 3px;
          background: rgba(255,255,255,0.25);
        }

        /* Hide scrollbar on take strip */
        div::-webkit-scrollbar { display: none; }

        /* Fullscreen: video takes full screen, controls stay */
        :fullscreen { 
          background: #000; 
          max-width: 100% !important;
          border-radius: 0 !important;
        }
      `}</style>
    </div>
  );
}

// ── Export with Suspense (required for useSearchParams + useParams) ─────────

export default function RekamanPage() {
  return (
    <Suspense>
      <RekamanContent />
    </Suspense>
  );
}
