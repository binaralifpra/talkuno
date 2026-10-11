"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { doc, collection, onSnapshot, getDocs, query, where, Timestamp } from "firebase/firestore";
import { IconAlarm, IconPlayerPlay } from "@tabler/icons-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { checkStreakRisk } from "@/lib/streak";

// ── Helpers ────────────────────────────────────────────────────────────────
function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dStr = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dStr}`;
}

function fmtDateFull(d: Date) {
  return d.toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function pad(n: number) { return n.toString().padStart(2, "0"); }
function fmtDur(s: number) { 
  if (!s || isNaN(s)) return "0:00";
  return `${Math.floor(s / 60)}:${pad(Math.floor(s % 60))}`; 
}

const DAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

export default function KalenderPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [userDoc, setUserDoc] = useState<any>(null);
  const [completedDays, setCompletedDays] = useState<any[]>([]);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);
  const [bestTake, setBestTake] = useState<any>(null);

  // ── Data Fetching ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) return;
    
    checkStreakRisk(user.uid).catch(console.error);

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (docSnap) => {
      if (docSnap.exists()) setUserDoc(docSnap.data());
    });

    const unsubDays = onSnapshot(collection(db, "users", user.uid, "days"), (snap) => {
      const days: any[] = [];
      snap.forEach((d) => {
        const data = d.data();
        if (data.status === "completed") {
          days.push(data);
        }
      });
      setCompletedDays(days);
    });

    return () => {
      unsubUser();
      unsubDays();
    };
  }, [user]);

  // ── Date Computations ────────────────────────────────────────────────────
  const now = new Date();
  const currentYMD = toYMD(now);
  const year = now.getFullYear();
  const month = now.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  let startDayOfWeek = firstDay.getDay(); 
  startDayOfWeek = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;

  const cells = [];
  for (let i = 0; i < startDayOfWeek; i++) {
    cells.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    cells.push(new Date(year, month, i));
  }

  const completedDaysMap = useMemo(() => {
    const map: Record<string, any> = {};
    completedDays.forEach(day => {
      if (day.completed_at && typeof day.completed_at.toDate === 'function') {
        map[toYMD(day.completed_at.toDate())] = day;
      }
    });
    return map;
  }, [completedDays]);

  let lastCompletedYMD: string | null = null;
  let nextExpectedYMD: string | null = null;
  if (completedDays.length > 0) {
    const sorted = [...completedDays].sort((a, b) => b.completed_at.toMillis() - a.completed_at.toMillis());
    const lastDate = sorted[0].completed_at.toDate();
    lastCompletedYMD = toYMD(lastDate);
    
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + 1);
    nextExpectedYMD = toYMD(nextDate);
  }

  let isAtRisk = false;
  let riskHoursLeft = 0;
  if (userDoc?.streak_at_risk_until) {
    const riskTime = userDoc.streak_at_risk_until.toMillis();
    if (riskTime > Date.now()) {
      isAtRisk = true;
      riskHoursLeft = Math.round((riskTime - Date.now()) / (1000 * 60 * 60));
    }
  }

  // ── Detail Panel Fetching ────────────────────────────────────────────────
  useEffect(() => {
    if (!selectedDateStr || !user) {
      setBestTake(null);
      return;
    }
    const dayData = completedDaysMap[selectedDateStr];
    if (!dayData) {
      setBestTake(null);
      return;
    }

    async function fetchTake() {
      try {
        const snap = await getDocs(
          query(
            collection(db, "users", user!.uid, "days", String(dayData.day_number), "takes"),
            where("is_best", "==", true)
          )
        );
        if (!snap.empty) {
          setBestTake(snap.docs[0].data());
        } else {
          setBestTake(null);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchTake();
  }, [selectedDateStr, user, completedDaysMap]);

  return (
    <div className="flex w-full h-full p-8" style={{ gap: 24, minHeight: "100vh" }}>
      {/* ── Left Content (Calendar) ───────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0">
        <h1 style={{ fontFamily: "var(--font-heading)", fontWeight: 600, fontSize: 20, color: "#2B2420", marginBottom: 16 }}>
          Kalender
        </h1>

        {isAtRisk && (
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            backgroundColor: "#FDE4D1", borderRadius: 24, padding: "6px 14px",
            marginBottom: 20, alignSelf: "flex-start"
          }}>
            <IconAlarm size={16} color="#D85A30" stroke={2.5} />
            <span style={{ fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500, color: "#993C1D" }}>
              Streak berisiko, {riskHoursLeft} jam lagi
            </span>
          </div>
        )}

        <div style={{ maxWidth: 460 }}>
          {/* Header Hari */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10, marginBottom: 12 }}>
            {DAYS.map((d) => (
              <div key={d} style={{ textAlign: "center", fontFamily: "var(--font-body)", fontSize: 11, fontWeight: 500, color: "#8A7F72" }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid Tanggal */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 10 }}>
            {cells.map((d, i) => {
              if (!d) return <div key={i} />;
              
              const ymd = toYMD(d);
              const isCompleted = !!completedDaysMap[ymd];
              const isRiskDay = isAtRisk && nextExpectedYMD === ymd;
              const isToday = currentYMD === ymd;

              let bg = "#FFFFFF", border = "0.5px solid #E4DACD", color = "#B9AFA0", cursor = "default";
              
              if (isCompleted) {
                bg = "#5DCAA5";
                border = "1px solid transparent";
                color = "#04342C";
                cursor = "pointer";
              } else if (isRiskDay) {
                bg = "#FAEEDA";
                border = "1.5px dashed #EF9F27";
                color = "#854F0B";
              } else if (isToday) {
                bg = "#FFFFFF";
                border = "2px solid #FF6B45";
                color = "#2B2420";
              }

              const isSelected = selectedDateStr === ymd;
              if (isSelected && isCompleted) {
                border = "2px solid #04342C"; // Feedback visual saat diklik
              }

              return (
                <button
                  key={i}
                  disabled={!isCompleted}
                  onClick={() => isCompleted && setSelectedDateStr(ymd)}
                  style={{
                    aspectRatio: "1",
                    borderRadius: 8,
                    backgroundColor: bg,
                    border: border,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: cursor,
                    transition: "all 0.15s",
                  }}
                >
                  <span style={{ fontFamily: "var(--font-heading)", fontSize: 14, fontWeight: 600, color: color }}>
                    {d.getDate()}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Right Panel (Details) ─────────────────────────────────────────── */}
      {selectedDateStr && completedDaysMap[selectedDateStr] && (
        <div style={{ width: 260, flexShrink: 0, paddingLeft: 24, borderLeft: "1px solid rgba(43,36,32,0.08)" }}>
          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, fontWeight: 500, color: "#8A7F72" }}>
            {fmtDateFull(new Date(selectedDateStr))} - Hari ke-{completedDaysMap[selectedDateStr].day_number}
          </p>
          
          <div style={{ 
            backgroundColor: "#2B2420", 
            borderRadius: 10, 
            height: 110, 
            position: "relative", 
            marginTop: 14,
            overflow: "hidden"
          }}>
            {bestTake?.video_url && (
              <video 
                src={bestTake.video_url} 
                preload="metadata" 
                style={{ width: "100%", height: "100%", objectFit: "cover", transform: "scaleX(-1)" }}
              />
            )}
            <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.2)" }}>
              <IconPlayerPlay size={28} style={{ color: "#8A7F72" }} />
            </div>
          </div>

          <p style={{ fontFamily: "var(--font-body)", fontSize: 12, color: "#5C5348", marginTop: 12, lineHeight: 1.5 }}>
            Take terbaik dipilih manual, {bestTake ? fmtDur(bestTake.duration_seconds) : "..."}
          </p>

          <button
            onClick={() => router.push(`/rekaman/${completedDaysMap[selectedDateStr].day_number}?from=kalender`)}
            style={{
              width: "100%",
              marginTop: 18,
              border: "1px solid #4F9B8E",
              color: "#4F9B8E",
              backgroundColor: "transparent",
              borderRadius: 20,
              padding: "8px 0",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            Lihat semua take
          </button>
        </div>
      )}
    </div>
  );
}
