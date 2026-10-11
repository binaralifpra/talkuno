"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { collection, query, where, orderBy, onSnapshot } from "firebase/firestore";
import { IconCalendar, IconPlayerPlay, IconChevronRight } from "@tabler/icons-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { getTopicById } from "@/lib/curriculum";

// ── Helpers ────────────────────────────────────────────────────────────────
function pad(n: number) { return n.toString().padStart(2, "0"); }
function fmtDur(s: number) { 
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`; 
}

function fmtDate(d: Date) {
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric"
  });
}

type FilterOption = "Terbaru" | "1 minggu" | "1 bulan" | "Custom";

// ── Komponen Card Riwayat ────────────────────────────────────────────────
function HistoryCard({ dayData, user, router }: { dayData: any; user: any; router: any }) {
  const [takeCount, setTakeCount] = useState(0);
  const [bestDuration, setBestDuration] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users", user.uid, "days", String(dayData.day_number), "takes"),
      (snap) => {
        setTakeCount(snap.size);
        snap.forEach(d => {
          const data = d.data();
          if (data.is_best) {
            setBestDuration(data.duration_seconds || 0);
          }
        });
      }
    );
    return unsub;
  }, [user.uid, dayData.day_number]);

  const topic = getTopicById(dayData.topic_id);
  const dateStr = dayData.completed_at ? fmtDate(dayData.completed_at.toDate()) : "";

  return (
    <div
      onClick={() => router.push(`/rekaman/${dayData.day_number}?from=riwayat`)}
      style={{
        backgroundColor: "#FFFFFF",
        border: "0.5px solid #E4DACD",
        borderRadius: 10,
        padding: 12,
        display: "flex",
        alignItems: "center",
        gap: 14,
        cursor: "pointer",
        transition: "transform 0.15s, box-shadow 0.15s",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = "translateY(-1px)";
        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.03)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* a. Thumbnail kecil */}
      <div style={{
        width: 52, height: 52, flexShrink: 0,
        backgroundColor: "#2B2420", borderRadius: 8,
        display: "flex", alignItems: "center", justifyContent: "center",
        position: "relative", overflow: "hidden"
      }}>
        {dayData.best_take_url && (
          <video 
            src={dayData.best_take_url} 
            style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", inset: 0, transform: "scaleX(-1)" }} 
            preload="metadata" 
          />
        )}
        <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.2)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IconPlayerPlay size={20} style={{ color: "#8A7F72" }} />
        </div>
      </div>

      {/* b. Konten Tengah */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          fontFamily: "var(--font-heading)", fontSize: 13, fontWeight: 500,
          color: "#2B2420", margin: 0, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis"
        }}>
          Hari {dayData.day_number} - {topic?.title || "Topik tidak ditemukan"}
        </p>
        <p style={{
          fontFamily: "var(--font-body)", fontSize: 12, color: "#8A7F72", margin: 0, marginTop: 4
        }}>
          {dateStr}, {fmtDur(bestDuration)}
        </p>
      </div>

      {/* c. Badge take */}
      <div 
        onClick={(e) => e.stopPropagation()} 
        style={{
          backgroundColor: "#F1EFE8", borderRadius: 12, padding: "3px 8px", flexShrink: 0
        }}
      >
        <span style={{ fontFamily: "var(--font-body)", fontSize: 11, color: "#5C5348", fontWeight: 500 }}>
          {takeCount} take
        </span>
      </div>

      {/* d. Chevron Kanan */}
      <IconChevronRight size={18} style={{ color: "#B9AFA0", flexShrink: 0 }} />
    </div>
  );
}

// ── Halaman Utama ─────────────────────────────────────────────────────────
export default function RiwayatPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [allDays, setAllDays] = useState<any[]>([]);
  const [filter, setFilter] = useState<FilterOption>("Terbaru");
  
  // Custom Date range
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(
      query(collection(db, "users", user.uid, "days"), where("status", "==", "completed"), orderBy("completed_at", "desc")),
      (snap) => {
        const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllDays(docs);
      }
    );
    return unsub;
  }, [user]);

  const filteredDays = useMemo(() => {
    const now = Date.now();
    return allDays.filter(day => {
      if (!day.completed_at) return false;
      const time = day.completed_at.toMillis();
      
      if (filter === "1 minggu") {
        return (now - time) <= 7 * 24 * 60 * 60 * 1000;
      }
      if (filter === "1 bulan") {
        return (now - time) <= 30 * 24 * 60 * 60 * 1000;
      }
      if (filter === "Custom") {
        if (customStart) {
          const startD = new Date(customStart);
          if (time < startD.getTime()) return false;
        }
        if (customEnd) {
          const endD = new Date(customEnd);
          // Tambahkan 1 hari penuh (86400000 ms) dikurangi 1ms agar mencakup hari akhir (hingga 23:59:59)
          if (time > endD.getTime() + 86400000 - 1) return false;
        }
        return true;
      }
      return true; // Terbaru
    });
  }, [allDays, filter, customStart, customEnd]);

  const filters: FilterOption[] = ["Terbaru", "1 minggu", "1 bulan", "Custom"];

  return (
    <div style={{ padding: "28px 32px", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      {/* 1. Baris Atas */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, zIndex: 10 }}>
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 20, color: "#2B2420", margin: 0 }}>
          Riwayat
        </h1>
        
        <div style={{ position: "relative" }}>
          {/* Segmented Control */}
          <div style={{ display: "flex", backgroundColor: "#F1EFE8", borderRadius: 20, padding: 3, gap: 2 }}>
            {filters.map(f => {
              const isSelected = filter === f;
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    backgroundColor: isSelected ? "#FFFFFF" : "transparent",
                    borderRadius: 16,
                    padding: "6px 14px",
                    border: "none",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    transition: "all 0.15s"
                  }}
                >
                  <span style={{ 
                    fontFamily: "var(--font-body)", 
                    fontSize: 13, 
                    fontWeight: isSelected ? 500 : 400,
                    color: isSelected ? "#2B2420" : "#8A7F72" 
                  }}>
                    {f}
                  </span>
                  {f === "Custom" && <IconCalendar size={14} style={{ color: isSelected ? "#2B2420" : "#8A7F72" }} />}
                </button>
              );
            })}
          </div>
          
          {/* Custom Date Picker Popover */}
          {filter === "Custom" && (
            <div style={{ 
              position: "absolute", top: "100%", right: 0, marginTop: 10, 
              backgroundColor: "#FFFFFF", padding: 14, borderRadius: 12, 
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)", display: "flex", gap: 12,
              border: "1px solid #E4DACD"
            }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, color: "#8A7F72", fontFamily: "var(--font-body)", fontWeight: 500 }}>Dari Tanggal</label>
                <input 
                  type="date" 
                  value={customStart} 
                  onChange={(e) => setCustomStart(e.target.value)}
                  style={{ 
                    padding: "6px 10px", borderRadius: 8, border: "1px solid #E4DACD", 
                    fontSize: 13, outline: "none", fontFamily: "var(--font-body)", color: "#2B2420"
                  }}
                />
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 11, color: "#8A7F72", fontFamily: "var(--font-body)", fontWeight: 500 }}>Sampai Tanggal</label>
                <input 
                  type="date" 
                  value={customEnd} 
                  onChange={(e) => setCustomEnd(e.target.value)}
                  style={{ 
                    padding: "6px 10px", borderRadius: 8, border: "1px solid #E4DACD", 
                    fontSize: 13, outline: "none", fontFamily: "var(--font-body)", color: "#2B2420"
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 2. Daftar Hari */}
      <div style={{ display: "flex", flexDirection: "column", gap: 12, paddingBottom: 40, maxWidth: 800, margin: "0 auto", width: "100%" }}>
        {filteredDays.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#8A7F72", fontFamily: "var(--font-body)", fontSize: 14 }}>
            Tidak ada riwayat rekaman yang sesuai dengan filter.
          </div>
        ) : (
          filteredDays.map(day => (
            <HistoryCard key={day.id} dayData={day} user={user} router={router} />
          ))
        )}
      </div>
    </div>
  );
}
