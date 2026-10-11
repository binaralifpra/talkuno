"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, getDocs, doc, onSnapshot, updateDoc, writeBatch } from "firebase/firestore";
import { sendPasswordResetEmail, signOut } from "firebase/auth";
import { IconChevronRight, IconLogout, IconCalendarPlus, IconAlertTriangle } from "@tabler/icons-react";
import { db, auth } from "@/lib/firebase";
import { supabase, VIDEO_BUCKET } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";
import { CURRICULUM } from "@/lib/curriculum";

const PREP_TIMES = [3, 5, 10, 15];

export default function PengaturanPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [userDoc, setUserDoc] = useState<any>(null);
  
  // Modal state
  const [skipModalOpen, setSkipModalOpen] = useState(false);
  const [selectedLevelId, setSelectedLevelId] = useState<number>(2); // Default to week 2
  const [skipping, setSkipping] = useState(false);

  // Reset Data state
  const [resetModalStep, setResetModalStep] = useState<0 | 1 | 2>(0);
  const [resetInput, setResetInput] = useState("");
  const [resetting, setResetting] = useState(false);

  // Extract unique weeks for dropdown
  const levels = useMemo(() => {
    const list: { week_number: number; week_title: string; start_day: number }[] = [];
    const seen = new Set();
    for (const t of CURRICULUM) {
      if (!seen.has(t.week_number)) {
        seen.add(t.week_number);
        list.push({
          week_number: t.week_number,
          week_title: t.week_title,
          start_day: t.day_number,
        });
      }
    }
    return list;
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) setUserDoc(snap.data());
    });
    return unsub;
  }, [user]);

  // Handle Prep Time
  async function handlePrepUpdate(t: number) {
    if (!user) return;
    try {
      await updateDoc(doc(db, "users", user.uid), { default_prep_seconds: t });
    } catch (e) {
      console.error(e);
    }
  }

  // Handle Notifications
  async function handleNotifToggle() {
    if (!user) return;
    const current = userDoc?.notif_enabled ?? false;
    try {
      await updateDoc(doc(db, "users", user.uid), { notif_enabled: !current });
    } catch (e) {
      console.error(e);
    }
  }

  // Handle Skip Level
  async function handleSkip() {
    if (!user) return;
    const selected = levels.find(l => l.week_number === selectedLevelId);
    if (!selected) return;

    setSkipping(true);
    try {
      const batch = writeBatch(db);
      
      batch.update(doc(db, "users", user.uid), {
        current_level: selected.week_number
      });

      CURRICULUM.forEach((t) => {
        const dayRef = doc(db, "users", user.uid, "days", String(t.day_number));
        if (t.day_number < selected.start_day) {
          batch.update(dayRef, { status: "completed" });
        } else if (t.day_number === selected.start_day) {
          batch.update(dayRef, { status: "unlocked" });
        }
      });

      await batch.commit();
      setSkipModalOpen(false);
      alert("Berhasil melewati level.");
    } catch (e) {
      console.error(e);
      alert("Gagal melewati level.");
    } finally {
      setSkipping(false);
    }
  }

  // Handle Add to Google Calendar
  function handleAddCalendar() {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 0, 0);
    const end = new Date(start.getTime() + 15 * 60000);

    const formatUTC = (d: Date) => {
      const pad = (n: number) => n.toString().padStart(2, "0");
      return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
    };

    const startStr = formatUTC(start);
    const endStr = formatUTC(end);

    const title = "Latihan Talkuno";
    const details = "Waktunya latihan public speaking harian di Talkuno!";
    
    const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${startStr}/${endStr}&details=${encodeURIComponent(details)}&recur=RRULE:FREQ=DAILY`;

    window.open(url, "_blank");
  }

  // Handle Password Reset
  async function handleResetPassword() {
    if (!user || !user.email) return;
    try {
      await sendPasswordResetEmail(auth, user.email);
      alert("Link reset password sudah dikirim ke email kamu");
    } catch (e) {
      console.error(e);
      alert("Gagal mengirim email reset password.");
    }
  }

  // Handle Logout
  async function handleLogout() {
    try {
      await signOut(auth);
      router.replace("/login");
    } catch (e) {
      console.error(e);
    }
  }

  // Handle Reset Data
  async function handleResetData() {
    if (!user) return;
    setResetting(true);
    try {
      // 1. Hapus SEMUA file video milik user ini di Supabase Storage
      const { data: files, error: listError } = await supabase.storage.from(VIDEO_BUCKET).list(user.uid);
      if (listError) {
        console.error("Gagal melist file Supabase:", listError);
        throw new Error("Gagal mengambil daftar file video");
      }
      
      if (files && files.length > 0) {
        const filePaths = files.map(f => `${user.uid}/${f.name}`);
        const { error: removeError } = await supabase.storage.from(VIDEO_BUCKET).remove(filePaths);
        if (removeError) {
          console.error("Gagal menghapus file Supabase:", removeError);
          throw new Error("Gagal menghapus file video");
        }
      }

      const batch = writeBatch(db);

      // 2 & 3. Hapus takes dan reset status days
      for (let dayNum = 1; dayNum <= 31; dayNum++) {
        // Hapus takes
        const takesSnap = await getDocs(collection(db, "users", user.uid, "days", String(dayNum), "takes"));
        takesSnap.forEach(takeDoc => {
          batch.delete(takeDoc.ref);
        });

        // Reset day
        const dayRef = doc(db, "users", user.uid, "days", String(dayNum));
        if (dayNum === 1) {
          batch.update(dayRef, { status: "unlocked", completed_at: null, best_take_url: null });
        } else {
          batch.update(dayRef, { status: "locked", completed_at: null, best_take_url: null });
        }
      }

      // 4. Update dokumen users/{uid}
      batch.update(doc(db, "users", user.uid), {
        current_level: 1,
        streak_current: 0,
        streak_longest: 0,
        streak_at_risk_until: null
      });

      // Commit
      await batch.commit();

      // 5. Tutup modal, notifikasi, redirect
      setResetModalStep(0);
      setResetInput("");
      alert("Data berhasil direset");
      router.push("/dashboard");
    } catch (e) {
      console.error(e);
      alert("Gagal mereset data: " + String(e));
    } finally {
      setResetting(false);
    }
  }

  const currentPrep = userDoc?.default_prep_seconds ?? 5;
  const notifEnabled = userDoc?.notif_enabled ?? false;

  return (
    <div style={{ backgroundColor: "var(--color-talkuno-cream)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "28px 24px 60px" }}>
        
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 20, color: "#2B2420", marginBottom: 28 }}>
          Pengaturan
        </h1>

        {/* ── BAGIAN 1: Preferensi latihan ────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#8A7F72", marginBottom: 8, fontWeight: 500 }}>
            Preferensi latihan
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Card 1: Jeda persiapan */}
            <div style={{ backgroundColor: "#FFFFFF", border: "0.5px solid #E4DACD", borderRadius: 10, padding: "14px 16px" }}>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2B2420", fontWeight: 500, margin: 0 }}>
                Jeda persiapan default
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                {PREP_TIMES.map(t => {
                  const isActive = currentPrep === t;
                  return (
                    <button 
                      key={t}
                      onClick={() => handlePrepUpdate(t)}
                      style={{
                        backgroundColor: isActive ? "#FF6B45" : "#F1EFE8",
                        color: isActive ? "#FFFFFF" : "#5C5348",
                        padding: "6px 18px",
                        borderRadius: 20,
                        border: "none",
                        fontSize: 13,
                        fontWeight: 500,
                        fontFamily: "var(--font-body)",
                        cursor: "pointer",
                        transition: "all 0.15s"
                      }}
                    >
                      {t}d
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Card 2: Lewati level */}
            <div 
              onClick={() => setSkipModalOpen(true)}
              style={{ 
                backgroundColor: "#FFFFFF", border: "0.5px solid #E4DACD", borderRadius: 10, padding: "14px 16px",
                display: "flex", alignItems: "center", justifyContent: "space-between", cursor: "pointer"
              }}
            >
              <div>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2B2420", fontWeight: 500, margin: 0 }}>
                  Lewati ke level lanjutan
                </p>
                <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#8A7F72", margin: 0, marginTop: 4 }}>
                  Melewati fondasi minggu 1-2
                </p>
              </div>
              <IconChevronRight size={18} style={{ color: "#B9AFA0" }} />
            </div>
          </div>
        </div>

        {/* ── BAGIAN 2: Notifikasi ───────────────────────────────────────────── */}
        <div style={{ marginBottom: 28 }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#8A7F72", marginBottom: 8, fontWeight: 500 }}>
            Notifikasi
          </p>
          <div style={{ 
            backgroundColor: "#FFFFFF", border: "0.5px solid #E4DACD", borderRadius: 10, padding: "14px 16px",
            display: "flex", flexDirection: "column", gap: 16
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2B2420", fontWeight: 500, margin: 0 }}>
                Pengingat latihan harian
              </p>
              
              <button 
                onClick={handleNotifToggle}
                style={{
                  width: 38, height: 22, borderRadius: 12,
                  backgroundColor: notifEnabled ? "#FF6B45" : "#E4DACD",
                  border: "none", cursor: "pointer", position: "relative",
                  display: "flex", alignItems: "center", padding: 2,
                  justifyContent: notifEnabled ? "flex-end" : "flex-start",
                  transition: "background-color 0.2s"
                }}
              >
                <div style={{
                  width: 18, height: 18, backgroundColor: "#FFFFFF", borderRadius: "50%",
                  boxShadow: "0 1px 3px rgba(0,0,0,0.1)"
                }} />
              </button>
            </div>

            <div>
              <button
                onClick={handleAddCalendar}
                style={{
                  display: "inline-flex", alignItems: "center", gap: 8,
                  border: "1px solid #4F9B8E", color: "#4F9B8E", backgroundColor: "transparent",
                  borderRadius: 20, padding: "8px 16px", cursor: "pointer",
                  fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500,
                  transition: "opacity 0.15s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                <IconCalendarPlus size={16} stroke={2} />
                Tambah ke Google Calendar
              </button>
              <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#8A7F72", margin: 0, marginTop: 8 }}>
                Reminder akan ditambahkan sebagai event berulang harian di kalendermu, klik simpan di halaman Google Calendar yang terbuka.
              </p>
            </div>
          </div>
        </div>

        {/* ── BAGIAN 3: Akun ─────────────────────────────────────────────────── */}
        <div>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#8A7F72", marginBottom: 8, fontWeight: 500 }}>
            Akun
          </p>
          <div style={{ 
            backgroundColor: "#FFFFFF", border: "0.5px solid #E4DACD", borderRadius: 10, padding: "14px 16px",
            marginBottom: 16
          }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2B2420", fontWeight: 500, margin: 0 }}>
              {user?.email || "Email tidak tersedia"}
            </p>
            <button 
              onClick={handleResetPassword}
              style={{ 
                fontFamily: "var(--font-body)", fontSize: 12, color: "#8A7F72", 
                margin: 0, marginTop: 6, background: "none", border: "none", padding: 0, 
                cursor: "pointer", textDecoration: "underline" 
              }}
            >
              Ganti kata sandi
            </button>
          </div>

          <button 
            onClick={handleLogout}
            style={{ 
              display: "flex", alignItems: "center", gap: 8, 
              background: "none", border: "none", padding: "8px 0", cursor: "pointer",
              fontFamily: "var(--font-body)", fontSize: 13, color: "#E24B4A", fontWeight: 500
            }}
          >
            <IconLogout size={16} color="#E24B4A" stroke={2.5} />
            Keluar
          </button>
        </div>

        {/* ── BAGIAN 4: Zona berbahaya ─────────────────────────────────────────── */}
        <div style={{ marginTop: 40 }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#E24B4A", marginBottom: 8, fontWeight: 500 }}>
            Zona berbahaya
          </p>
          <div style={{ 
            backgroundColor: "#FFFFFF", border: "1px solid #F5C6C6", borderRadius: 10, padding: "14px 16px"
          }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#2B2420", fontWeight: 500, margin: 0 }}>
              Reset semua data
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#8A7F72", margin: 0, marginTop: 4, marginBottom: 16 }}>
              Menghapus semua rekaman, riwayat, dan progres. Kamu akan kembali mulai dari Hari 1.
            </p>
            <button 
              onClick={() => setResetModalStep(1)}
              style={{ 
                backgroundColor: "#E24B4A", color: "#FFFFFF", padding: "8px 20px", borderRadius: 20, 
                border: "none", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, cursor: "pointer"
              }}
            >
              Reset Data
            </button>
          </div>
        </div>

      </div>

      {/* ── MODAL: Lewati Level ───────────────────────────────────────────── */}
      {skipModalOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24
        }}>
          <div style={{
            backgroundColor: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 360,
            padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
          }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 18, color: "#2B2420", margin: 0, marginBottom: 12 }}>
              Lewati ke level lanjutan?
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#5C5348", lineHeight: 1.5, margin: 0, marginBottom: 20 }}>
              Kamu akan melewati minggu 1 dan 2 (fondasi dasar berbicara di kamera dan teknik vokal). Semua hari di minggu tersebut akan otomatis ditandai selesai tanpa perlu direkam. Progres ini tidak bisa dibatalkan.
            </p>

            <select
              value={selectedLevelId}
              onChange={(e) => setSelectedLevelId(Number(e.target.value))}
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #E4DACD",
                fontFamily: "var(--font-body)", fontSize: 14, color: "#2B2420", outline: "none", marginBottom: 24,
                backgroundColor: "#F9F8F6"
              }}
            >
              {levels.map(l => (
                <option key={l.week_number} value={l.week_number}>
                  Level {l.week_number} - {l.week_title}
                </option>
              ))}
            </select>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setSkipModalOpen(false)}
                disabled={skipping}
                style={{
                  flex: 1, padding: "10px", borderRadius: 20, border: "1px solid #E4DACD",
                  backgroundColor: "transparent", color: "#5C5348", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, cursor: "pointer"
                }}
              >
                Batal
              </button>
              <button
                onClick={handleSkip}
                disabled={skipping}
                style={{
                  flex: 1, padding: "10px", borderRadius: 20, border: "none",
                  backgroundColor: "#FF6B45", color: "#FFFFFF", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  opacity: skipping ? 0.7 : 1
                }}
              >
                {skipping ? "Menyimpan..." : "Ya, lewati"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Reset Data Step 1 ────────────────────────────────────────── */}
      {resetModalStep === 1 && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24
        }}>
          <div style={{
            backgroundColor: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 360,
            padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.15)", textAlign: "center"
          }}>
            <IconAlertTriangle size={32} color="#E24B4A" style={{ margin: "0 auto 12px" }} />
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 18, color: "#2B2420", margin: 0, marginBottom: 12 }}>
              Reset semua data?
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#5C5348", lineHeight: 1.5, margin: 0, marginBottom: 24 }}>
              Tindakan ini akan menghapus PERMANEN semua video rekaman, semua riwayat latihan, streak, dan progres kurikulum kamu. Progres akan kembali ke Hari 1. Tindakan ini TIDAK BISA DIBATALKAN.
            </p>
            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => setResetModalStep(0)}
                style={{
                  flex: 1, padding: "10px", borderRadius: 20, border: "1px solid #E4DACD",
                  backgroundColor: "transparent", color: "#5C5348", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, cursor: "pointer"
                }}
              >
                Batal
              </button>
              <button
                onClick={() => { setResetModalStep(2); setResetInput(""); }}
                style={{
                  flex: 1, padding: "10px", borderRadius: 20, border: "none",
                  backgroundColor: "#E24B4A", color: "#FFFFFF", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, cursor: "pointer"
                }}
              >
                Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: Reset Data Step 2 ────────────────────────────────────────── */}
      {resetModalStep === 2 && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24
        }}>
          <div style={{
            backgroundColor: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 360,
            padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
          }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 18, color: "#2B2420", margin: 0, marginBottom: 12 }}>
              Konfirmasi terakhir
            </h2>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#5C5348", lineHeight: 1.5, margin: 0, marginBottom: 20 }}>
              Ketik RESET pada kolom di bawah untuk mengonfirmasi.
            </p>

            <input 
              type="text"
              value={resetInput}
              onChange={(e) => setResetInput(e.target.value)}
              placeholder="RESET"
              style={{
                width: "100%", padding: "10px 12px", borderRadius: 8, border: "1px solid #E4DACD",
                fontFamily: "var(--font-body)", fontSize: 14, color: "#2B2420", outline: "none", marginBottom: 24,
                backgroundColor: "#F9F8F6"
              }}
            />

            <div style={{ display: "flex", gap: 12 }}>
              <button
                onClick={() => { setResetModalStep(0); setResetInput(""); }}
                disabled={resetting}
                style={{
                  flex: 1, padding: "10px", borderRadius: 20, border: "1px solid #E4DACD",
                  backgroundColor: "transparent", color: "#5C5348", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, cursor: "pointer"
                }}
              >
                Batal
              </button>
              <button
                onClick={handleResetData}
                disabled={resetting || resetInput !== "RESET"}
                style={{
                  flex: 1, padding: "10px", borderRadius: 20, border: "none",
                  backgroundColor: "#E24B4A", color: "#FFFFFF", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, cursor: "pointer",
                  opacity: (resetting || resetInput !== "RESET") ? 0.5 : 1
                }}
              >
                {resetting ? "Memproses..." : "Reset Data Sekarang"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
