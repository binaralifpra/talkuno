"use client";

import { Suspense, useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  collection,
  doc,
  getDocs,
  getDoc,
  deleteDoc,
  writeBatch,
  serverTimestamp,
  query,
  orderBy,
} from "firebase/firestore";
import { supabase, VIDEO_BUCKET } from "@/lib/supabase";
import {
  IconPlayerPlay,
  IconCheck,
  IconTrash,
  IconPlayerRecord,
  IconAlertTriangle,
} from "@tabler/icons-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { completeDayAndUpdateStreak } from "@/lib/streak";
import { getTopicById } from "@/lib/curriculum";

// ── Helpers ────────────────────────────────────────────────────────────────

function pad(n: number) { return n.toString().padStart(2, "0"); }
function formatDur(s: number) { return `${pad(Math.floor(s / 60))}:${pad(s % 60)}`; }

// ── Types ──────────────────────────────────────────────────────────────────

interface Take {
  id: string;              // Firestore document ID
  take_id: string;
  video_url: string;
  storage_path?: string;   // might be missing on older takes
  duration_seconds: number;
  is_best: boolean;
}

// ── Video thumbnail component ──────────────────────────────────────────────
// Shows first frame via <video preload="metadata"> + play icon overlay

function TakeCard({
  take,
  index,
  isSelected,
  onSelect,
  onDeleteRequest,
  onView,
}: {
  take: Take;
  index: number;
  isSelected: boolean;
  onSelect: () => void;
  onDeleteRequest: () => void;
  onView: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hovered, setHovered] = useState(false);

  return (
    <div
      style={{ position: "relative", cursor: "pointer" }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onSelect}
    >
      {/* ── Thumbnail box ─────────────────────────────────────────────── */}
      <div
        style={{
          aspectRatio: "4/3",
          borderRadius: 12,
          overflow: "hidden",
          backgroundColor: "#1c1210",
          border: isSelected
            ? "2.5px solid var(--color-talkuno-coral)"
            : "2.5px solid transparent",
          transition: "border-color 0.15s",
          position: "relative",
        }}
      >
        {/* Video element — shows first frame */}
        <video
          ref={videoRef}
          src={take.video_url}
          preload="metadata"
          muted
          playsInline
          onLoadedMetadata={() => {
            if (videoRef.current) videoRef.current.currentTime = 0.1;
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            display: "block",
            transform: "scaleX(-1)", // mirror, same as recording
          }}
        />

        {/* Dark overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.25)",
            transition: "background-color 0.15s",
            ...(hovered && { backgroundColor: "rgba(0,0,0,0.38)" }),
          }}
        />

        {/* Play icon center (always visible, clickable) */}
        <button
          onClick={(e) => { e.stopPropagation(); onView(); }}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 40,
            height: 40,
            borderRadius: "50%",
            backgroundColor: "rgba(0,0,0,0.4)",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
          }}
          title="Lihat video"
        >
          <IconPlayerPlay size={20} stroke={2} style={{ color: "#FFFFFF", marginLeft: 2 }} />
        </button>

        {/* Duration badge — bottom right */}
        <div
          style={{
            position: "absolute",
            bottom: 7,
            right: 8,
            backgroundColor: "rgba(0,0,0,0.55)",
            borderRadius: 4,
            padding: "1px 6px",
            pointerEvents: "none",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 11,
              fontWeight: 600,
              color: "#fff",
              letterSpacing: "0.04em",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {formatDur(take.duration_seconds)}
          </span>
        </div>

        {/* Trash icon — top left, only on hover */}
        {hovered && (
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteRequest(); }}
            title="Hapus take ini"
            style={{
              position: "absolute",
              top: 7,
              left: 7,
              width: 28, height: 28, borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.55)",
              border: "none", display: "flex",
              alignItems: "center", justifyContent: "center",
              cursor: "pointer", color: "rgba(255,255,255,0.8)",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "rgba(217,79,61,0.8)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.55)")}
          >
            <IconTrash size={13} stroke={2} />
          </button>
        )}

        {/* Selected checkmark badge — top right */}
        {isSelected && (
          <div
            style={{
              position: "absolute",
              top: 7,
              right: 7,
              width: 22,
              height: 22,
              borderRadius: "50%",
              backgroundColor: "var(--color-talkuno-coral)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              pointerEvents: "none",
            }}
          >
            <IconCheck size={13} stroke={3} style={{ color: "#fff" }} />
          </div>
        )}
      </div>

      {/* Take label */}
      <p
        style={{
          fontFamily: "var(--font-body)",
          fontSize: 12,
          fontWeight: 500,
          color: isSelected
            ? "var(--color-talkuno-coral)"
            : "rgba(43,36,32,0.45)",
          marginTop: 6,
          textAlign: "center",
          transition: "color 0.15s",
        }}
      >
        Take {index + 1}
      </p>
    </div>
  );
}

// ── Delete Confirm Dialog ──────────────────────────────────────────────────

function DeleteDialog({
  onConfirm,
  onCancel,
  loading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    // Backdrop
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.4)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 24,
      }}
      onClick={onCancel}
    >
      {/* Dialog card */}
      <div
        style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: "24px 28px",
          width: "100%",
          maxWidth: 320,
          boxShadow: "0 16px 40px rgba(0,0,0,0.16)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 mb-3">
          <IconAlertTriangle
            size={20}
            stroke={2}
            style={{ color: "#D94F3D", flexShrink: 0 }}
          />
          <p
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: 15,
              color: "var(--color-talkuno-dark)",
            }}
          >
            Hapus take ini?
          </p>
        </div>
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 13,
            color: "rgba(43,36,32,0.5)",
            lineHeight: 1.6,
            marginBottom: 20,
          }}
        >
          Video ini akan dihapus permanen dari penyimpanan. Tindakan ini tidak bisa dibatalkan.
        </p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-full text-sm font-medium border transition-colors"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-talkuno-dark)",
              borderColor: "rgba(43,36,32,0.18)",
              backgroundColor: "transparent",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.5 : 1,
            }}
          >
            Batal
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 py-2 rounded-full text-sm font-medium text-white transition-opacity"
            style={{
              fontFamily: "var(--font-body)",
              backgroundColor: "#D94F3D",
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Menghapus…" : "Ya, hapus"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page content ──────────────────────────────────────────────────────

function PilihTakeContent() {
  const { user } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const dayNumber = parseInt(params.get("day") ?? "1", 10);

  const [takes, setTakes] = useState<Take[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Take | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const topic = getTopicById(`day-${dayNumber}`);

  // ── Load takes ───────────────────────────────────────────────────────────

  const loadTakes = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError("");
    try {
      const snap = await getDocs(
        query(
          collection(db, "users", user.uid, "days", String(dayNumber), "takes"),
          orderBy("created_at", "asc")
        )
      );
      const list: Take[] = snap.docs.map((d) => ({
        id: d.id,
        ...(d.data() as Omit<Take, "id">),
      }));
      setTakes(list);
      // Pre-select existing is_best take if any
      const best = list.find((t) => t.is_best);
      if (best) setSelectedId(best.id);
      else if (list.length > 0) setSelectedId(list[list.length - 1].id); // default: last take
    } catch (e) {
      setError("Gagal memuat rekaman: " + String(e));
    } finally {
      setLoading(false);
    }
  }, [user, dayNumber]);

  useEffect(() => {
    loadTakes();
  }, [loadTakes]);

  // ── Delete take ───────────────────────────────────────────────────────────

  async function handleConfirmDelete() {
    if (!deleteTarget || !user) return;
    setDeleting(true);
    try {
      // Delete Firestore document
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "days",
          String(dayNumber),
          "takes",
          deleteTarget.id
        )
      );

      // Delete Storage file di Supabase (graceful jika path tidak ada)
      if (deleteTarget.storage_path) {
        try {
          const { error } = await supabase.storage
            .from(VIDEO_BUCKET)
            .remove([deleteTarget.storage_path]);
          if (error) console.warn("Supabase delete failed:", error.message);
        } catch {
          console.warn("Storage delete failed (file may already be gone)");
        }
      }

      // Update local state
      setTakes((prev) => {
        const next = prev.filter((t) => t.id !== deleteTarget.id);
        // If deleted take was selected, auto-select last remaining
        if (selectedId === deleteTarget.id) {
          setSelectedId(next.length > 0 ? next[next.length - 1].id : null);
        }
        return next;
      });
      setDeleteTarget(null);
    } catch (e) {
      setError("Gagal menghapus: " + String(e));
    } finally {
      setDeleting(false);
    }
  }

  // ── Save best take + complete day ─────────────────────────────────────────

  async function saveAndComplete() {
    if (!selectedId || !user) return;

    const selectedTake = takes.find((t) => t.id === selectedId);
    if (!selectedTake) return;

    setSaving(true);
    setError("");

    try {
      const allTakes = takes.map(t => ({ id: t.id }));
      
      await completeDayAndUpdateStreak(
        user.uid,
        dayNumber,
        selectedId,
        selectedTake.video_url,
        allTakes
      );

      router.push("/dashboard");
    } catch (e) {
      console.error("saveAndComplete error:", e);
      setError("Gagal menyimpan: " + String(e));
      setSaving(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const canSave = selectedId !== null && takes.length > 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-talkuno-cream)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Delete dialog */}
      {deleteTarget && (
        <DeleteDialog
          onConfirm={handleConfirmDelete}
          onCancel={() => setDeleteTarget(null)}
          loading={deleting}
        />
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <div
        style={{
          padding: "24px 28px 0",
          maxWidth: 700,
          width: "100%",
          margin: "0 auto",
        }}
      >
        <p
          style={{
            fontFamily: "var(--font-body)",
            fontSize: 12,
            fontWeight: 500,
            color: "var(--color-talkuno-coral)",
            letterSpacing: "0.03em",
            marginBottom: 4,
          }}
        >
          Hari ke-{dayNumber}
        </p>
        <h1
          style={{
            fontFamily: "var(--font-heading)",
            fontWeight: 600,
            fontSize: 20,
            color: "var(--color-talkuno-dark)",
            marginBottom: 4,
          }}
        >
          Pilih Take Terbaik
        </h1>
        {topic && (
          <p
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              color: "rgba(43,36,32,0.45)",
            }}
          >
            {topic.title}
          </p>
        )}
      </div>

      {/* ── Content ─────────────────────────────────────────────────────── */}
      <div
        style={{
          flex: 1,
          padding: "20px 28px 0",
          maxWidth: 700,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-16">
            <p style={{ fontFamily: "var(--font-body)", fontSize: 14, color: "rgba(43,36,32,0.4)" }}>
              Memuat rekaman…
            </p>
          </div>
        )}

        {/* Empty */}
        {!loading && takes.length === 0 && !error && (
          <div className="flex flex-col items-center justify-center py-16 gap-4 text-center">
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 14,
                color: "rgba(43,36,32,0.4)",
              }}
            >
              Belum ada rekaman untuk hari ini.
            </p>
            <button
              onClick={() => router.push("/rekam")}
              className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium border"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--color-talkuno-dark)",
                borderColor: "rgba(43,36,32,0.18)",
                backgroundColor: "transparent",
                cursor: "pointer",
              }}
            >
              <IconPlayerRecord size={15} stroke={2} />
              Mulai rekam
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="flex items-start gap-2 rounded-xl px-4 py-3 mb-4"
            style={{ backgroundColor: "rgba(217,79,61,0.07)" }}
          >
            <IconAlertTriangle size={15} stroke={2} style={{ color: "#D94F3D", marginTop: 2, flexShrink: 0 }} />
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#D94F3D" }}>
              {error}
            </p>
          </div>
        )}

        {/* Takes grid */}
        {!loading && takes.length > 0 && (
          <>
            {/* Counter */}
            <p
              style={{
                fontFamily: "var(--font-body)",
                fontSize: 12,
                color: "rgba(43,36,32,0.38)",
                marginBottom: 14,
              }}
            >
              {takes.length} rekaman · take lama tidak terhapus saat rekam ulang
            </p>

            {/* 3-column grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
              }}
            >
              {takes.map((take, i) => (
                <TakeCard
                  key={take.id}
                  take={take}
                  index={i}
                  isSelected={selectedId === take.id}
                  onSelect={() => setSelectedId(take.id)}
                  onDeleteRequest={() => setDeleteTarget(take)}
                  onView={() =>
                    router.push(`/rekaman/${dayNumber}?take=${take.id}&from=pilih-take`)
                  }
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* ── Footer buttons ───────────────────────────────────────────────── */}
      {!loading && (
        <div
          style={{
            padding: "20px 28px 28px",
            maxWidth: 700,
            width: "100%",
            margin: "0 auto",
            display: "flex",
            gap: 12,
            alignItems: "center",
            justifyContent: "flex-end",
          }}
        >
          {/* Rekam ulang — secondary/outline */}
          <button
            onClick={() => router.push("/rekam")}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium border transition-colors"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-talkuno-dark)",
              borderColor: "rgba(43,36,32,0.18)",
              backgroundColor: "transparent",
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.5 : 1,
            }}
          >
            <IconPlayerRecord size={15} stroke={2} />
            Rekam ulang
          </button>

          {/* Simpan — primary/coral */}
          <button
            id="btn-simpan-take"
            onClick={saveAndComplete}
            disabled={saving || !canSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium text-white transition-opacity"
            style={{
              fontFamily: "var(--font-body)",
              backgroundColor: "var(--color-talkuno-coral)",
              cursor: saving || !canSave ? "not-allowed" : "pointer",
              opacity: saving || !canSave ? 0.55 : 1,
            }}
          >
            {saving ? "Menyimpan…" : "Simpan sebagai take terbaik"}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Export with Suspense (required for useSearchParams) ────────────────────

export default function PilihTakePage() {
  return (
    <Suspense>
      <PilihTakeContent />
    </Suspense>
  );
}
