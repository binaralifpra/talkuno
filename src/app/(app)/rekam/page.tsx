"use client";

import { useEffect, useRef, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  doc,
  getDoc,
  collection,
  getDocs,
  query,
  orderBy,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { supabase, VIDEO_BUCKET } from "@/lib/supabase";
import {
  IconPlayerRecord,
  IconPlayerStop,
  IconRefresh,
  IconAlertTriangle,
  IconCamera,
  IconChevronDown,
  IconChevronUp,
  IconExternalLink,
} from "@tabler/icons-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { type Topic, getTopicById } from "@/lib/curriculum";

// ── Helpers ────────────────────────────────────────────────────────────────

function pad(n: number) {
  return n.toString().padStart(2, "0");
}
function formatTime(s: number) {
  return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
}

function getSupportedMimeType() {
  const types = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm",
    "video/mp4",
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) ?? "video/webm";
}

function getExtension(mime: string) {
  return mime.startsWith("video/mp4") ? "mp4" : "webm";
}

// ── Types ──────────────────────────────────────────────────────────────────

type Phase =
  | "loading"
  | "requesting"
  | "denied"
  | "ready"
  | "countdown"
  | "recording"
  | "uploading"
  | "error";

interface DayData {
  day_number: number;
  topic_id: string;
  status: string;
}

const PREP_OPTIONS = [3, 5, 10, 15] as const;

// ── Component ──────────────────────────────────────────────────────────────

export default function RekamPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" style={{ backgroundColor: "var(--color-talkuno-cream)" }} />}>
      <RekamPageContent />
    </Suspense>
  );
}

function RekamPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [phase, setPhase] = useState<Phase>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [uploadMsg, setUploadMsg] = useState("");

  const [currentDay, setCurrentDay] = useState<DayData | null>(null);
  const [topic, setTopic] = useState<Topic | null>(null);
  const [showNotes, setShowNotes] = useState(false);
  const [prepTime, setPrepTime] = useState(5);

  const [countdown, setCountdown] = useState(0);
  const [elapsed, setElapsed] = useState(0);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const elapsedRef = useRef(0); // authoritative value readable inside intervals

  // ── Data fetch ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!user) return;

    async function load() {
      try {
        const userSnap = await getDoc(doc(db, "users", user!.uid));
        const defaultPrep: number = userSnap.exists()
          ? (userSnap.data().default_prep_seconds ?? 5)
          : 5;
        setPrepTime(defaultPrep);

        const daysSnap = await getDocs(
          query(
            collection(db, "users", user!.uid, "days"),
            orderBy("day_number", "asc")
          )
        );
        const days = daysSnap.docs.map((d) => d.data() as DayData);
        
        const urlDayStr = searchParams?.get("day");
        const urlDay = urlDayStr ? parseInt(urlDayStr, 10) : null;
        
        let day = null;
        if (urlDay && !isNaN(urlDay)) {
          day = days.find((d) => d.day_number === urlDay);
        }
        if (!day) {
          day = days.find((d) => d.status === "unlocked") ?? days[0];
        }
        
        if (!day) throw new Error("Tidak ada hari yang aktif.");

        setCurrentDay({ day_number: day.day_number, topic_id: day.topic_id, status: day.status });

        // Ambil topic dari data lokal — tidak perlu fetch Firestore
        const found = getTopicById(day.topic_id);
        if (found) setTopic(found as Topic);

        setPhase("requesting");
      } catch (e) {
        setErrorMsg("Gagal memuat data: " + String(e));
        setPhase("error");
      }
    }

    load();
  }, [user]);

  // ── Request camera ─────────────────────────────────────────────────────────

  const requestCamera = useCallback(async () => {
    setPhase("requesting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPhase("ready");
    } catch {
      setPhase("denied");
    }
  }, []);

  useEffect(() => {
    if (phase === "requesting") requestCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase === "requesting"]);

  // Attach stream to video whenever ref or stream changes
  useEffect(() => {
    if (videoRef.current && streamRef.current && !videoRef.current.srcObject) {
      videoRef.current.srcObject = streamRef.current;
    }
  });

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimers();
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Timer helpers ─────────────────────────────────────────────────────────

  function clearTimers() {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
  }

  // ── Recording flow ────────────────────────────────────────────────────────

  function startCountdown() {
    setCountdown(prepTime);
    setPhase("countdown");

    let rem = prepTime;
    countdownRef.current = setInterval(() => {
      rem -= 1;
      setCountdown(rem);
      if (rem <= 0) {
        clearTimers();
        beginRecording();
      }
    }, 1000);
  }

  function beginRecording() {
    if (!streamRef.current) return;

    const mimeType = getSupportedMimeType();
    const recorder = new MediaRecorder(streamRef.current, { mimeType });
    recorderRef.current = recorder;
    chunksRef.current = [];
    elapsedRef.current = 0;
    setElapsed(0);

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      uploadAndSave(blob, mimeType);
    };

    recorder.start(500);
    setPhase("recording");

    const targetSec = topic?.duration_target_seconds ?? 60;

    // Elapsed counter — runs independently of React render cycles
    const id = setInterval(() => {
      elapsedRef.current += 1;
      setElapsed(elapsedRef.current);

      if (elapsedRef.current >= targetSec) {
        clearInterval(id);
        if (recorder.state !== "inactive") recorder.stop();
      }
    }, 1000);

    // Store id so we can clear if user manually stops early
    countdownRef.current = id; // reuse ref slot
  }

  function stopManual() {
    clearTimers();
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
  }

  // ── Upload ────────────────────────────────────────────────────────────────

  async function uploadAndSave(blob: Blob, mimeType: string) {
    if (!user || !currentDay) return;
    setPhase("uploading");
    setUploadMsg("Mengunggah video…");

    try {
      const takeId = Date.now().toString();
      const ext = getExtension(mimeType);
      // Path di Supabase Storage bucket "videos"
      const storagePath = `${user.uid}/${currentDay.day_number}/${takeId}.${ext}`;

      // Upload ke Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(VIDEO_BUCKET)
        .upload(storagePath, blob, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) throw uploadError;

      setUploadMsg("Menyimpan data…");

      // Ambil public URL
      const { data: urlData } = supabase.storage
        .from(VIDEO_BUCKET)
        .getPublicUrl(storagePath);

      const videoUrl = urlData.publicUrl;

      // Simpan metadata take ke Firestore
      await addDoc(
        collection(
          db,
          "users",
          user.uid,
          "days",
          String(currentDay.day_number),
          "takes"
        ),
        {
          take_id: takeId,
          video_url: videoUrl,
          storage_path: storagePath,     // path di Supabase, dipakai saat delete
          duration_seconds: elapsedRef.current,
          is_best: false,
          created_at: serverTimestamp(),
        }
      );

      router.push(`/rekam/pilih-take?day=${currentDay.day_number}`);
    } catch (e) {
      console.error("Upload error:", e);
      setErrorMsg("Gagal mengunggah video. " + String(e));
      setPhase("error");
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  const targetSec = topic?.duration_target_seconds ?? 60;
  const cameraPhases: Phase[] = ["ready", "countdown", "recording"];
  const showCamera = cameraPhases.includes(phase);

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-talkuno-cream)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Banner: camera active ──────────────────────────────────────────── */}
      {showCamera && (
        <div
          className="flex items-center gap-2 px-5 text-sm"
          style={{
            height: 40,
            backgroundColor: "rgba(79,155,142,0.1)",
            borderBottom: "1px solid rgba(79,155,142,0.18)",
            fontFamily: "var(--font-body)",
            color: "var(--color-talkuno-teal)",
            fontWeight: 500,
          }}
        >
          <IconCamera size={15} stroke={2} />
          Kamera aktif melalui izin browser
        </div>
      )}

      {/* ── Content ───────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          padding: "20px 24px 28px",
          maxWidth: 600,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* Loading */}
        {phase === "loading" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(43,36,32,0.4)" }}>
              Memuat…
            </p>
          </div>
        )}

        {/* Requesting */}
        {phase === "requesting" && (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(43,36,32,0.4)" }}>
              Meminta izin kamera…
            </p>
          </div>
        )}

        {/* Permission denied */}
        {phase === "denied" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
              textAlign: "center",
              padding: "0 16px",
            }}
          >
            <IconAlertTriangle
              size={44}
              stroke={1.5}
              style={{ color: "var(--color-talkuno-coral)" }}
            />
            <div>
              <p
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  fontSize: 17,
                  color: "var(--color-talkuno-dark)",
                }}
              >
                Izin Kamera Ditolak
              </p>
              <p
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  color: "rgba(43,36,32,0.5)",
                  marginTop: 8,
                  lineHeight: 1.65,
                  maxWidth: 280,
                }}
              >
                Talkuno butuh akses kamera dan mikrofon untuk merekam. Izinkan
                di pengaturan browser lalu coba lagi.
              </p>
            </div>
            <button
              onClick={requestCamera}
              className="flex items-center gap-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-85"
              style={{
                fontFamily: "var(--font-body)",
                backgroundColor: "var(--color-talkuno-coral)",
                padding: "10px 24px",
                cursor: "pointer",
                border: "none",
              }}
            >
              <IconRefresh size={15} stroke={2} />
              Coba lagi
            </button>
          </div>
        )}

        {/* Error */}
        {phase === "error" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
              textAlign: "center",
              padding: "0 16px",
            }}
          >
            <IconAlertTriangle size={40} stroke={1.5} style={{ color: "#D94F3D" }} />
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 13,
                color: "#D94F3D",
                maxWidth: 320,
                lineHeight: 1.6,
              }}
            >
              {errorMsg}
            </p>
          </div>
        )}

        {/* Uploading */}
        {phase === "uploading" && (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 16,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: "50%",
                border: "3px solid var(--color-talkuno-coral)",
                borderTopColor: "transparent",
                animation: "spin 0.8s linear infinite",
              }}
            />
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 14,
                color: "rgba(43,36,32,0.5)",
              }}
            >
              {uploadMsg}
            </p>
          </div>
        )}

        {/* ── Camera view ──────────────────────────────────────────────────── */}
        {showCamera && (
          <>
            {/* Header Konteks */}
            {topic && (
              <div style={{ marginBottom: 20 }}>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--color-talkuno-coral)",
                    margin: 0,
                    marginBottom: 4,
                  }}
                >
                  Hari ke-{topic.day_number}
                </p>
                <h1
                  style={{
                    fontFamily: "var(--font-heading)",
                    fontSize: 18,
                    fontWeight: 600,
                    color: "var(--color-talkuno-dark)",
                    margin: 0,
                    marginBottom: 8,
                  }}
                >
                  {topic.title}
                </h1>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    color: "#5C5348",
                    margin: 0,
                    marginBottom: 12,
                    lineHeight: 1.5,
                  }}
                >
                  {topic.instruction}
                </p>
              </div>
            )}

            {/* Camera preview box */}
            <div
              style={{
                position: "relative",
                width: "100%",
                aspectRatio: "4/3",
                borderRadius: 16,
                overflow: "hidden",
                backgroundColor: "#1c1210",
                marginBottom: 20,
              }}
            >
              {/* Live video */}
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  display: "block",
                  transform: "scaleX(-1)", // mirror
                }}
              />

              {/* Placeholder icon if no stream yet */}
              {phase === "ready" && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    pointerEvents: "none",
                  }}
                >
                  <IconCamera
                    size={48}
                    stroke={1}
                    style={{ color: "rgba(255,255,255,0.12)" }}
                  />
                </div>
              )}

              {/* Timer overlay (recording) */}
              {phase === "recording" && (
                <div
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    backgroundColor: "rgba(0,0,0,0.5)",
                    borderRadius: 6,
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 7,
                  }}
                >
                  {/* Pulsing red dot */}
                  <div
                    style={{
                      width: 7,
                      height: 7,
                      borderRadius: "50%",
                      backgroundColor: "#E74C3C",
                      animation: "recPulse 1.2s ease-in-out infinite",
                      flexShrink: 0,
                    }}
                  />
                  <span
                    style={{
                      fontFamily: "var(--font-body)",
                      fontSize: 13,
                      fontWeight: 600,
                      color: "#fff",
                      letterSpacing: "0.04em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {formatTime(elapsed)} / {formatTime(targetSec)}
                  </span>
                </div>
              )}

              {/* Countdown overlay */}
              {phase === "countdown" && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    backgroundColor: "rgba(0,0,0,0.62)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: 100,
                      fontWeight: 600,
                      color: "#fff",
                      lineHeight: 1,
                      animation: "countPop 0.35s ease-out",
                    }}
                  >
                    {countdown}
                  </span>
                </div>
              )}
            </div>

            {/* Prep time selector — only in ready state */}
            {phase === "ready" && (
              <div style={{ marginBottom: 20 }}>
                <p
                  style={{
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "rgba(43,36,32,0.42)",
                    marginBottom: 10,
                    letterSpacing: "0.01em",
                  }}
                >
                  Jeda persiapan
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  {PREP_OPTIONS.map((sec) => {
                    const isSelected = prepTime === sec;
                    return (
                      <button
                        key={sec}
                        onClick={() => setPrepTime(sec)}
                        className="rounded-full transition-colors"
                        style={{
                          padding: "6px 14px",
                          fontFamily: "var(--font-body)",
                          fontSize: 13,
                          fontWeight: 500,
                          border: "1.5px solid",
                          borderColor: isSelected
                            ? "var(--color-talkuno-coral)"
                            : "rgba(43,36,32,0.15)",
                          backgroundColor: isSelected
                            ? "var(--color-talkuno-coral)"
                            : "transparent",
                          color: isSelected ? "#fff" : "rgba(43,36,32,0.5)",
                          cursor: "pointer",
                        }}
                      >
                        {sec}d
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Record / Stop button */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              {phase === "ready" && (
                <button
                  id="btn-start-record"
                  onClick={startCountdown}
                  aria-label="Mulai rekam"
                  className="flex items-center justify-center rounded-full transition-opacity hover:opacity-85 active:scale-95"
                  style={{
                    width: 56,
                    height: 56,
                    backgroundColor: "var(--color-talkuno-coral)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    transition: "opacity 0.15s, transform 0.1s",
                  }}
                >
                  <IconPlayerRecord size={24} stroke={2} />
                </button>
              )}

              {phase === "recording" && (
                <button
                  id="btn-stop-record"
                  onClick={stopManual}
                  aria-label="Hentikan rekaman"
                  className="flex items-center justify-center rounded-full transition-opacity hover:opacity-85 active:scale-95"
                  style={{
                    width: 56,
                    height: 56,
                    backgroundColor: "var(--color-talkuno-coral)",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    transition: "opacity 0.15s, transform 0.1s",
                  }}
                >
                  <IconPlayerStop size={22} stroke={2} />
                </button>
              )}
            </div>

            {/* Expanded Notes Section */}
            {topic && (topic.instruction_detail || topic.reference_note || topic.reference_url) && (
              <div style={{ marginTop: 24, paddingTop: 14, borderTop: "0.5px solid #E4DACD" }}>
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "var(--font-body)",
                    fontSize: 12,
                    fontWeight: 500,
                    color: "#4F9B8E",
                    marginBottom: showNotes ? 16 : 0,
                  }}
                >
                  {showNotes ? "Sembunyikan materi" : "Lihat materi lagi"}
                  {showNotes ? <IconChevronUp size={16} /> : <IconChevronDown size={16} />}
                </button>
                
                {showNotes && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                    {topic.instruction_detail && (
                      <p
                        style={{
                          margin: 0,
                          fontFamily: "var(--font-body)",
                          fontSize: 14,
                          color: "#5C5348",
                          lineHeight: 1.6,
                        }}
                      >
                        {topic.instruction_detail}
                      </p>
                    )}
                    {topic.reference_note && (
                      <div
                        style={{
                          backgroundColor: "#FFFFFF",
                          borderRadius: 10,
                          padding: 16,
                          border: "1px solid rgba(0,0,0,0.05)",
                        }}
                      >
                        <p
                          style={{
                            margin: 0,
                            marginBottom: 8,
                            fontFamily: "var(--font-body)",
                            fontSize: 11,
                            fontWeight: 600,
                            color: "#8A7F72",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                          }}
                        >
                          Yang perlu kamu tahu
                        </p>
                        <p
                          style={{
                            margin: 0,
                            fontFamily: "var(--font-body)",
                            fontSize: 14,
                            color: "#2B2420",
                            lineHeight: 1.6,
                          }}
                        >
                          {topic.reference_note}
                        </p>
                      </div>
                    )}
                    {topic.reference_url && topic.reference_label && (
                      <div>
                        <a
                          href={topic.reference_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 8,
                            border: "1px solid #4F9B8E",
                            color: "#4F9B8E",
                            backgroundColor: "transparent",
                            borderRadius: 20,
                            padding: "10px 18px",
                            textDecoration: "none",
                            fontFamily: "var(--font-body)",
                            fontSize: 13,
                            fontWeight: 500,
                            transition: "opacity 0.2s",
                          }}
                          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
                        >
                          <IconExternalLink size={18} stroke={2} />
                          {topic.reference_label}
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Keyframe animations ───────────────────────────────────────────── */}
      <style>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes recPulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.3; }
        }
        @keyframes countPop {
          from { transform: scale(1.4); opacity: 0; }
          to   { transform: scale(1);   opacity: 1; }
        }
      `}</style>
    </div>
  );
}
