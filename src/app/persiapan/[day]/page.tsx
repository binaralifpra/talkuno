"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { IconX, IconExternalLink } from "@tabler/icons-react";
import AuthGuard from "@/components/AuthGuard";
import { getTopicById } from "@/lib/curriculum";

export default function PersiapanPage() {
  const params = useParams();
  const router = useRouter();
  
  const dayNumberStr = params.day as string;
  const dayNumber = parseInt(dayNumberStr, 10);
  
  const topic = getTopicById(`day-${dayNumber}`);

  if (!topic) {
    return (
      <AuthGuard>
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#FAF6F1" }}>
          <p style={{ fontFamily: "var(--font-body)", color: "#2B2420" }}>Topik tidak ditemukan.</p>
          <Link href="/dashboard" style={{ color: "#FF6B45", marginLeft: 8, fontFamily: "var(--font-body)" }}>
            Kembali ke Dashboard
          </Link>
        </div>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <div 
        className="min-h-screen relative flex flex-col items-center px-6"
        style={{ backgroundColor: "#FAF6F1", paddingTop: 60, paddingBottom: 60 }}
      >
        {/* 1. Ikon "X" kembali ke Dashboard */}
        <button
          onClick={() => router.push("/dashboard")}
          className="absolute top-6 left-6 p-2 rounded-full transition-colors"
          style={{ cursor: "pointer", background: "none", border: "none" }}
          aria-label="Kembali ke Dashboard"
        >
          <IconX size={24} color="#5C5348" />
        </button>

        {/* Container Konten */}
        <div style={{ width: "100%", maxWidth: 560, display: "flex", flexDirection: "column" }}>
          {/* 2. Label Hari */}
          <p 
            style={{ 
              fontSize: 12, color: "#FF6B45", fontWeight: 500, fontFamily: "var(--font-body)", 
              margin: 0, marginBottom: 8 
            }}
          >
            Hari ke-{topic.day_number}
          </p>

          {/* 3. Judul Topik */}
          <h1 
            style={{ 
              fontSize: 24, fontWeight: 600, color: "#2B2420", fontFamily: "var(--font-heading)",
              margin: 0, marginBottom: 16 
            }}
          >
            {topic.title}
          </h1>

          {/* 4. Teks Instruction */}
          <p 
            style={{ 
              fontSize: 15, color: "#2B2420", lineHeight: 1.6, fontFamily: "var(--font-body)",
              margin: 0, marginBottom: topic.instruction_detail ? 12 : 24
            }}
          >
            {topic.instruction}
          </p>

          {/* 5. Instruction Detail */}
          {topic.instruction_detail && (
            <p 
              style={{ 
                fontSize: 14, color: "#5C5348", lineHeight: 1.6, fontFamily: "var(--font-body)",
                margin: 0, marginBottom: 24 
              }}
            >
              {topic.instruction_detail}
            </p>
          )}

          {/* 6. Reference Note */}
          {topic.reference_note && (
            <div 
              style={{ 
                backgroundColor: "#FFFFFF", borderRadius: 10, padding: 16, marginTop: 16,
                border: "1px solid rgba(0,0,0,0.05)"
              }}
            >
              <p 
                style={{ 
                  fontSize: 11, color: "#8A7F72", textTransform: "uppercase", letterSpacing: "0.05em", 
                  fontFamily: "var(--font-body)", margin: 0, marginBottom: 8, fontWeight: 600 
                }}
              >
                Yang perlu kamu tahu
              </p>
              <p 
                style={{ 
                  fontSize: 14, color: "#2B2420", lineHeight: 1.6, fontFamily: "var(--font-body)", margin: 0 
                }}
              >
                {topic.reference_note}
              </p>
            </div>
          )}

          {/* 7. Reference URL & Label */}
          {topic.reference_url && topic.reference_label && (
            <div style={{ marginTop: 24 }}>
              <a 
                href={topic.reference_url}
                target="_blank"
                rel="noopener noreferrer"
                style={{ 
                  display: "inline-flex", alignItems: "center", gap: 8,
                  border: "1px solid #4F9B8E", color: "#4F9B8E", backgroundColor: "transparent",
                  borderRadius: 20, padding: "10px 18px", textDecoration: "none",
                  fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500,
                  transition: "opacity 0.2s"
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"}
                onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
              >
                <IconExternalLink size={18} stroke={2} />
                {topic.reference_label}
              </a>
            </div>
          )}

          {/* 9. Tombol Siap Mulai Rekam */}
          <button
            onClick={() => router.push(`/rekam?day=${topic.day_number}`)}
            style={{ 
              marginTop: 32, width: "100%", minWidth: 240, alignSelf: "flex-start",
              backgroundColor: "#FF6B45", color: "#FFFFFF", borderRadius: 24, padding: "14px 24px",
              border: "none", fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 500,
              cursor: "pointer", transition: "transform 0.2s, opacity 0.2s"
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = "0.9"}
            onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}
            onMouseDown={(e) => e.currentTarget.style.transform = "scale(0.97)"}
            onMouseUp={(e) => e.currentTarget.style.transform = "scale(1)"}
          >
            Siap, mulai rekam
          </button>
        </div>
      </div>
    </AuthGuard>
  );
}
