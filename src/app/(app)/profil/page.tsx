"use client";

import { useEffect, useState } from "react";
import { doc, onSnapshot, collection, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { db, auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { CURRICULUM } from "@/lib/curriculum";

export default function ProfilPage() {
  const { user } = useAuth();
  
  const [userDoc, setUserDoc] = useState<any>(null);
  const [days, setDays] = useState<any[]>([]);
  
  const [totalTakes, setTotalTakes] = useState(0);
  
  // Edit Profile state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingName, setSavingName] = useState(false);

  // 1. Listen to user doc
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        setUserDoc(snap.data());
      }
    });
    return unsub;
  }, [user]);

  // 2. Listen to days
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(collection(db, "users", user.uid, "days"), (snap) => {
      setDays(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return unsub;
  }, [user]);

  // 3. Listen to takes for each non-locked day
  useEffect(() => {
    if (!user || days.length === 0) return;
    
    // Hanya subscribe ke hari yang sudah pernah disentuh/dibuka
    const activeDays = days.filter(d => d.status !== "locked");
    
    const sizes = new Map<string, number>();
    const unsubs: (() => void)[] = [];

    activeDays.forEach(day => {
      const unsub = onSnapshot(collection(db, "users", user.uid, "days", day.id, "takes"), (snap) => {
        sizes.set(day.id, snap.size);
        
        let total = 0;
        sizes.forEach(s => total += s);
        setTotalTakes(total);
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach(u => u());
    };
  }, [user, days.length]); // days.length dipantau supaya jika ada hari terbuka baru, listener bertambah

  // Computed properties
  const completedDaysCount = days.filter(d => d.status === "completed").length;
  const progressPercent = Math.min((completedDaysCount / 31) * 100, 100);
  
  const currentLevelNumber = userDoc?.current_level || 1;
  const weekData = CURRICULUM.find(c => c.week_number === currentLevelNumber);
  const weekTitle = weekData ? weekData.week_title : "Belum ditentukan";

  const displayName = userDoc?.name || user?.displayName || "User";
  const initial = displayName.charAt(0).toUpperCase();
  const displayEmail = user?.email || "";

  async function handleSaveProfile(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !editName.trim()) return;
    setSavingName(true);
    try {
      await updateProfile(user, { displayName: editName.trim() });
      await updateDoc(doc(db, "users", user.uid), { name: editName.trim() });
      setIsEditModalOpen(false);
    } catch (err) {
      console.error(err);
      alert("Gagal memperbarui profil");
    } finally {
      setSavingName(false);
    }
  }

  return (
    <div style={{ backgroundColor: "var(--color-talkuno-cream)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 24px 60px" }}>
        
        {/* ── 1. HEADER (Avatar, Nama, Email, Badge Level) ──────────────────── */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          {/* Avatar */}
          <div style={{
            width: 64, height: 64, borderRadius: "50%",
            backgroundColor: "#FF6B45", color: "#FFFFFF",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 22, fontWeight: 600, flexShrink: 0
          }}>
            {initial}
          </div>

          {/* Info & Badge */}
          <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-start" }}>
            <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 18, color: "#2B2420", margin: 0 }}>
              {displayName}
            </h1>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "#8A7F72", margin: 0 }}>
              {displayEmail}
            </p>
            
            <div style={{
              backgroundColor: "#E1F5EE", borderRadius: 14, padding: "4px 12px",
              marginTop: 6
            }}>
              <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#085041", fontWeight: 500 }}>
                Level {currentLevelNumber} - {weekTitle}
              </span>
            </div>
          </div>
        </div>

        {/* ── 2. PROGRESS BAR ──────────────────────────────────────────────── */}
        <div style={{ marginBottom: 32 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#8A7F72" }}>Perjalanan 30 hari</span>
            <span style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#8A7F72" }}>{completedDaysCount} / 31 hari</span>
          </div>
          <div style={{
            height: 8, backgroundColor: "#E4DACD", borderRadius: 4, overflow: "hidden"
          }}>
            <div style={{
              height: "100%", backgroundColor: "#FF6B45", borderRadius: 4,
              width: `${progressPercent}%`, transition: "width 0.3s ease"
            }} />
          </div>
        </div>

        {/* ── 3. GRID STATISTIK ────────────────────────────────────────────── */}
        <div style={{
          display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, marginBottom: 32
        }}>
          {/* Kartu 1: Hari Latihan */}
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 10, padding: 14, textAlign: "center", border: "0.5px solid #E4DACD" }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 22, fontWeight: 500, color: "#2B2420", margin: 0 }}>
              {completedDaysCount}
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#8A7F72", margin: 0, marginTop: 4 }}>
              Hari latihan
            </p>
          </div>

          {/* Kartu 2: Streak Terpanjang */}
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 10, padding: 14, textAlign: "center", border: "0.5px solid #E4DACD" }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 22, fontWeight: 500, color: "#D85A30", margin: 0 }}>
              {userDoc?.streak_longest || 0}
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#8A7F72", margin: 0, marginTop: 4 }}>
              Streak terpanjang
            </p>
          </div>

          {/* Kartu 3: Total Video */}
          <div style={{ backgroundColor: "#FFFFFF", borderRadius: 10, padding: 14, textAlign: "center", border: "0.5px solid #E4DACD" }}>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 22, fontWeight: 500, color: "#2B2420", margin: 0 }}>
              {totalTakes}
            </p>
            <p style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#8A7F72", margin: 0, marginTop: 4 }}>
              Total video
            </p>
          </div>
        </div>

        {/* ── 4. TOMBOL EDIT PROFIL ────────────────────────────────────────── */}
        <button
          onClick={() => {
            setEditName(displayName);
            setIsEditModalOpen(true);
          }}
          style={{
            border: "0.5px solid #E4DACD", backgroundColor: "transparent",
            color: "#5C5348", borderRadius: 20, padding: "9px 18px",
            fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, cursor: "pointer",
            transition: "all 0.15s"
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = "rgba(0,0,0,0.03)"}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = "transparent"}
        >
          Edit profil
        </button>

      </div>

      {/* ── MODAL EDIT PROFIL ────────────────────────────────────────────── */}
      {isEditModalOpen && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 50,
          backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center",
          padding: 24
        }}>
          <div style={{
            backgroundColor: "#FFFFFF", borderRadius: 16, width: "100%", maxWidth: 320,
            padding: 24, boxShadow: "0 10px 30px rgba(0,0,0,0.15)"
          }}>
            <h2 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 18, color: "#2B2420", margin: 0, marginBottom: 16 }}>
              Edit profil
            </h2>
            <form onSubmit={handleSaveProfile}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 24 }}>
                <label style={{ fontSize: 12, color: "#8A7F72", fontFamily: "var(--font-body)", fontWeight: 500 }}>
                  Nama Lengkap
                </label>
                <input
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  style={{
                    padding: "10px 12px", borderRadius: 8, border: "1px solid #E4DACD",
                    fontSize: 14, outline: "none", fontFamily: "var(--font-body)", color: "#2B2420",
                    backgroundColor: "#F9F8F6"
                  }}
                  autoFocus
                  required
                />
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={savingName}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 20, border: "1px solid #E4DACD",
                    backgroundColor: "transparent", color: "#5C5348", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, cursor: "pointer"
                  }}
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingName || !editName.trim()}
                  style={{
                    flex: 1, padding: "10px", borderRadius: 20, border: "none",
                    backgroundColor: "#FF6B45", color: "#FFFFFF", fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, cursor: "pointer",
                    opacity: savingName || !editName.trim() ? 0.7 : 1
                  }}
                >
                  {savingName ? "Menyimpan..." : "Simpan"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
