"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  doc,
  collection,
  query,
  orderBy,
  onSnapshot,
} from "firebase/firestore";
import { IconFlame, IconPlayerRecord, IconChevronRight } from "@tabler/icons-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";
import { type Topic, getTopicById } from "@/lib/curriculum";
import { checkStreakRisk } from "@/lib/streak";

// ── Types ──────────────────────────────────────────────────────────────────

interface UserDay {
  day_number: number;
  topic_id: string;
  status: "locked" | "unlocked" | "completed";
  completed_at: unknown;
}

interface DashboardData {
  streakCurrent: number;
  currentDay: UserDay;
  currentTopic: Topic;
  allDays: UserDay[];
}

// ── Date helper ───────────────────────────────────────────────────────────
function isSameLocalDate(dateA: Date, dateB: Date) {
  return (
    dateA.getFullYear() === dateB.getFullYear() &&
    dateA.getMonth() === dateB.getMonth() &&
    dateA.getDate() === dateB.getDate()
  );
}

function toYMD(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const ds = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${ds}`;
}

// ── Decorative equalizer SVG ─────────────────────────────────────────────
function EqualizerDecor() {
  const bars = [
    { height: 48, delay: "0ms"   },
    { height: 72, delay: "120ms" },
    { height: 32, delay: "240ms" },
    { height: 88, delay: "60ms"  },
    { height: 56, delay: "180ms" },
    { height: 40, delay: "300ms" },
  ];

  return (
    <div
      aria-hidden="true"
      className="absolute top-6 right-6 flex items-end gap-[5px]"
      style={{ opacity: 0.18 }}
    >
      {bars.map((bar, i) => (
        <div
          key={i}
          style={{
            width: 5,
            height: bar.height,
            backgroundColor: "#fff",
            borderRadius: 3,
          }}
        />
      ))}
    </div>
  );
}

// ── Week strip cell ───────────────────────────────────────────────────────
const DAY_LABELS = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];

function DayCell({
  date,
  isCompleted,
  isToday,
}: {
  date: Date;
  isCompleted: boolean;
  isToday: boolean;
}) {
  const dayName = DAY_LABELS[date.getDay()];
  const dateNum = date.getDate();

  let bgColor = "#FFFFFF";
  let border = "0.5px solid #E4DACD";
  let textColor = "#B9AFA0";

  if (isCompleted) {
    bgColor = "#5DCAA5";
    border = "none";
    textColor = "#04342C";
  } else if (isToday) {
    bgColor = "#FFFFFF";
    border = "2px solid #FF6B45";
    textColor = "#2B2420";
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <span style={{ fontSize: 11, color: "#8A7F72", fontFamily: "var(--font-body)", textAlign: "center" }}>
        {dayName}
      </span>
      <div
        className="shrink-0"
        style={{
          width: 40,
          height: 40,
          borderRadius: 8,
          backgroundColor: bgColor,
          border: border,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 13,
          fontWeight: 500,
          color: textColor,
          fontFamily: "var(--font-body)"
        }}
      >
        {dateNum}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  
  const [streakCurrent, setStreakCurrent] = useState(0);
  const [dashboardData, setDashboardData] = useState<{ currentDay: UserDay, currentTopic: Topic, allDays: UserDay[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");

  useEffect(() => {
    if (!user) return;
    
    checkStreakRisk(user.uid).catch(console.error);

    const unsubUser = onSnapshot(doc(db, "users", user.uid), (userSnap) => {
      if (userSnap.exists()) {
        setStreakCurrent(userSnap.data().streak_current ?? 0);
      }
    }, (err) => {
      console.error(err);
      setError("Gagal memuat data pengguna.");
    });

    const unsubDays = onSnapshot(query(collection(db, "users", user.uid, "days"), orderBy("day_number", "asc")), (daysSnap) => {
      const allDays: UserDay[] = daysSnap.docs.map(d => d.data() as UserDay);
      const currentDay = allDays.find(d => d.status === "unlocked") ?? allDays[0];
      if (!currentDay) {
        setError("Tidak ada hari aktif.");
        setLoading(false);
        return;
      }
      const currentTopic = getTopicById(currentDay.topic_id);
      if (!currentTopic) {
        setError(`Topic tidak ditemukan: ${currentDay.topic_id}`);
        setLoading(false);
        return;
      }
      
      setDashboardData({ currentDay, currentTopic, allDays });
      setLoading(false);
    }, (err) => {
      console.error(err);
      setError("Gagal memuat data kurikulum.");
      setLoading(false);
    });

    return () => {
      unsubUser();
      unsubDays();
    };
  }, [user]);

  // ── Loading state ───────────────────────────────────────────────────────
  if (loading) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: "var(--color-talkuno-cream)" }}
      >
        {/* Hero skeleton */}
        <div
          className="w-full animate-pulse"
          style={{ height: 288, backgroundColor: "rgba(43,36,32,0.08)" }}
        />
        {/* Content skeleton */}
        <div className="px-8 py-6 flex flex-col gap-3">
          <div
            className="rounded-full animate-pulse"
            style={{ height: 16, width: 120, backgroundColor: "rgba(43,36,32,0.08)" }}
          />
          <div className="flex gap-2 mt-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="rounded-full animate-pulse"
                style={{ width: 28, height: 28, backgroundColor: "rgba(43,36,32,0.08)" }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error state ─────────────────────────────────────────────────────────
  if (error || !dashboardData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-3 px-8 text-center">
        <p
          className="text-base font-semibold"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-talkuno-dark)" }}
        >
          Data belum tersedia
        </p>
        <p
          className="text-sm max-w-xs"
          style={{ fontFamily: "var(--font-body)", color: "rgba(43,36,32,0.5)", lineHeight: 1.6 }}
        >
          {error
            ? error
            : "Kurikulum belum di-seed atau data hari belum tersedia. Jalankan seed script lalu buka /dev/reprovision."}
        </p>
        <a
          href="/dev/reprovision"
          className="mt-2 px-5 py-2 rounded-full text-sm font-medium border transition-colors"
          style={{
            fontFamily: "var(--font-body)",
            color: "var(--color-talkuno-dark)",
            borderColor: "rgba(43,36,32,0.18)",
          }}
        >
          Provision ulang akun
        </a>
      </div>
    );
  }

  const { currentDay, currentTopic, allDays } = dashboardData;

  // Build week strip: Current Calendar Week (Sun-Sat)
  const now = new Date();
  
  // DIAGNOSIS: log current date
  console.log("DIAGNOSIS - Tanggal hari ini (now):", now.toString(), now.toISOString());

  const currentWeekDays: Date[] = [];
  const currentDayIndex = now.getDay(); // 0 (Sun) to 6 (Sat)
  const sunday = new Date(now);
  sunday.setDate(now.getDate() - currentDayIndex);

  for (let i = 0; i < 7; i++) {
    const d = new Date(sunday);
    d.setDate(sunday.getDate() + i);
    currentWeekDays.push(d);
  }

  // Get completed dates
  const completedDates: { day_number: number, date: Date }[] = [];
  
  console.log("DIAGNOSIS - Semua data days completed:");
  allDays.forEach((day) => {
    if (day.status === "completed" && day.completed_at) {
      const anyTs = day.completed_at as any;
      if (typeof anyTs.toDate === "function") {
        const localDate = anyTs.toDate();
        completedDates.push({ day_number: day.day_number, date: localDate });
        // DIAGNOSIS: log completed days
        console.log(`- Day ${day.day_number}:`, {
          rawTimestamp: anyTs,
          localDateString: localDate.toString()
        });
      }
    }
  });

  const weekSlots = currentWeekDays.map((date) => {
    // Cek apakah date ini ada di completedDates dengan isSameLocalDate
    const isCompleted = completedDates.some(cd => isSameLocalDate(cd.date, date));
    const isToday = isSameLocalDate(now, date);
    
    return {
      ymd: toYMD(date), // tetap pakai ymd untuk key
      date,
      isCompleted,
      isToday,
    };
  });

  // Truncate instruction to ~90 chars for the hero overlay
  const shortInstruction =
    currentTopic.instruction.length > 90
      ? currentTopic.instruction.slice(0, 87) + "…"
      : currentTopic.instruction;

  return (
    <div style={{ backgroundColor: "var(--color-talkuno-cream)", minHeight: "100vh" }}>

      {/* ── HERO — full-bleed, no padding ──────────────────────────────── */}
      <section
        className="relative w-full overflow-hidden"
        style={{ height: 288 }}
      >
        {/* Background image
            ┌─────────────────────────────────────────────────────────────┐
            │ SLOT: ganti src di bawah dengan URL foto asli nanti         │
            │ Rekomendasi: foto landscape 1280×480px min, objek di kiri   │
            └─────────────────────────────────────────────────────────────┘ */}
        <Image
          src="/hero-placeholder.png"
          alt="Seseorang berbicara di depan kamera"
          fill
          style={{ objectFit: "cover", objectPosition: "center 30%" }}
          priority
        />

        {/* Functional scrim: dark gradient from bottom (ensures text readability) */}
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(to top, rgba(20,14,10,0.88) 0%, rgba(20,14,10,0.35) 55%, rgba(20,14,10,0.05) 100%)",
          }}
          aria-hidden="true"
        />

        {/* Decorative equalizer motif (top-right, purely visual) */}
        <EqualizerDecor />

        {/* Content: bottom-left */}
        <div className="absolute bottom-0 left-0 px-8 pb-7 max-w-lg">
          {/* Day label */}
          <p
            className="text-xs font-medium mb-1.5"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-talkuno-amber)",
              letterSpacing: "0.03em",
            }}
          >
            Hari ke-{currentDay.day_number}
          </p>

          {/* Topic title */}
          <h1
            className="text-xl leading-tight mb-2"
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              color: "#fff",
            }}
          >
            {currentTopic.title}
          </h1>

          {/* Instruction excerpt */}
          <p
            className="text-sm leading-relaxed mb-4"
            style={{
              fontFamily: "var(--font-body)",
              color: "rgba(255,255,255,0.72)",
            }}
          >
            {shortInstruction}
          </p>

          {/* CTA — satu aksi utama per layar */}
          <Link
            id="btn-mulai-rekam"
            href={`/persiapan/${currentDay.day_number}`}
            className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-80"
            style={{
              fontFamily: "var(--font-body)",
              backgroundColor: "var(--color-talkuno-coral)",
            }}
          >
            <IconPlayerRecord size={16} stroke={2} />
            Mulai rekam
          </Link>
        </div>
      </section>

      {/* ── CONTENT BELOW HERO ─────────────────────────────────────────── */}
      <div className="px-8 py-6">

        {/* Row: "Minggu ini" + streak badge */}
        <div className="flex items-center justify-between mb-4">
          <Link
            href="/kalender"
            className="flex items-center gap-[6px] hover:opacity-80 transition-opacity cursor-pointer"
            style={{ textDecoration: "none" }}
          >
            <p
              className="text-sm font-medium"
              style={{
                fontFamily: "var(--font-body)",
                color: "rgba(43,36,32,0.55)",
                margin: 0
              }}
            >
              Minggu ini
            </p>
            <IconChevronRight size={18} color="#8A7F72" />
          </Link>

          {/* Streak badge */}
          <div
            className="flex items-center gap-1.5 px-3 py-1 rounded-full"
            style={{ backgroundColor: "rgba(244,166,35,0.12)" }}
          >
            <IconFlame
              size={15}
              stroke={2}
              style={{ color: "var(--color-talkuno-amber)" }}
            />
            <span
              className="text-sm font-semibold"
              style={{
                fontFamily: "var(--font-body)",
                color: "var(--color-talkuno-amber)",
              }}
            >
              {streakCurrent} hari
            </span>
          </div>
        </div>

        {/* Week strip: 7 cells */}
        <div className="flex items-center gap-2.5">
          {weekSlots.map((slot) => (
            <DayCell
              key={slot.ymd}
              date={slot.date}
              isCompleted={slot.isCompleted}
              isToday={slot.isToday}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
