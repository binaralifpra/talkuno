"use client";

import { useState } from "react";
import { collection, doc, writeBatch, getDocs } from "firebase/firestore";
import { IconCheck, IconAlertTriangle, IconFlame } from "@tabler/icons-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

// ── Data kurikulum lengkap 31 hari ─────────────────────────────────────────

const TOPICS = [
  // Minggu 1 — Berani Bicara
  { day_number: 1,  week_number: 1, week_title: "Berani Bicara",          title: "Rekam video perkenalan diri",                          instruction: "Perkenalkan dirimu dalam 60 detik: nama, asal, hobi, dan satu hal menarik tentang dirimu. Bicara langsung ke kamera, jangan baca teks.",                                                                                                              duration_target_seconds: 60  },
  { day_number: 2,  week_number: 1, week_title: "Berani Bicara",          title: "Ceritakan kegiatan hari ini",                          instruction: "Ceritakan apa yang kamu lakukan hari ini dari pagi sampai sekarang. Gunakan urutan waktu yang jelas dan bicara dengan santai.",                                                                                                              duration_target_seconds: 60  },
  { day_number: 3,  week_number: 1, week_title: "Berani Bicara",          title: "Perkenalkan benda favoritmu",                          instruction: "Pilih satu benda yang paling kamu sukai. Jelaskan apa itu, kenapa kamu suka, dan satu cerita menarik tentang benda itu.",                                                                                                                     duration_target_seconds: 60  },
  { day_number: 4,  week_number: 1, week_title: "Berani Bicara",          title: "Ceritakan pengalaman lucu",                            instruction: "Ingat kembali satu kejadian lucu atau memalukan yang pernah kamu alami. Ceritakan dengan ekspresi yang hidup dan senyum.",                                                                                                                     duration_target_seconds: 60  },
  { day_number: 5,  week_number: 1, week_title: "Berani Bicara",          title: "Checkpoint: tonton ulang & evaluasi diri",             instruction: "Tonton ulang rekaman hari 1–4. Pilih take terbaik dari masing-masing hari. Rekam video singkat: apa yang sudah baik dan apa yang ingin kamu tingkatkan minggu depan.",                                                                        duration_target_seconds: 60  },

  // Minggu 2 — Suara yang Meyakinkan
  { day_number: 6,  week_number: 2, week_title: "Suara yang Meyakinkan", title: "Latihan membaca keras",                                 instruction: "Ambil satu paragraf dari artikel atau buku. Bacakan keras-keras dengan vokal yang jelas, kecepatan stabil, dan artikulasi yang tepat. Ulang jika ada kata yang tergumam.",                                                                                   duration_target_seconds: 60  },
  { day_number: 7,  week_number: 2, week_title: "Suara yang Meyakinkan", title: "Latihan senyum saat berbicara",                        instruction: "Ceritakan hal sederhana yang kamu syukuri hari ini sambil terus tersenyum. Perhatikan bagaimana senyum mengubah nada suaramu menjadi lebih hangat.",                                                                                                  duration_target_seconds: 60  },
  { day_number: 8,  week_number: 2, week_title: "Suara yang Meyakinkan", title: "Latihan jeda (pause)",                                 instruction: "Ceritakan topik apa saja, tapi setiap kali ingin bilang 'eh' atau 'umm', gunakan jeda diam 1-2 detik. Jeda itu kuat — latih dirimu nyaman dengannya.",                                                                                              duration_target_seconds: 60  },
  { day_number: 9,  week_number: 2, week_title: "Suara yang Meyakinkan", title: "Latihan intonasi pada sebuah cerita",                  instruction: "Pilih cerita pendek dan bacakan dua kali: pertama dengan nada datar, kedua dengan variasi intonasi yang dramatis. Rasakan perbedaannya.",                                                                                                              duration_target_seconds: 60  },
  { day_number: 10, week_number: 2, week_title: "Suara yang Meyakinkan", title: "Rekam sebelum & sesudah teknik",                      instruction: "Pilih topik bebas. Rekam dua versi: versi pertama bicara biasa, versi kedua terapkan semua teknik minggu ini (senyum, jeda, intonasi). Bandingkan hasilnya.",                                                                                       duration_target_seconds: 60  },

  // Minggu 3 — Storytelling
  { day_number: 11, week_number: 3, week_title: "Storytelling",           title: "Ceritakan pengalaman gagal",                           instruction: "Ceritakan satu kegagalan yang pernah kamu alami. Apa yang terjadi? Apa yang kamu rasakan? Apa yang kamu pelajari? Jadikan cerita yang inspiratif, bukan keluhan.",                                                                                    duration_target_seconds: 75  },
  { day_number: 12, week_number: 3, week_title: "Storytelling",           title: "Ceritakan momen paling membanggakan",                  instruction: "Ingat satu pencapaian yang benar-benar membuatmu bangga. Ceritakan perjalanannya, bukan hanya hasilnya. Buat pendengar merasakan apa yang kamu rasakan.",                                                                                           duration_target_seconds: 75  },
  { day_number: 13, week_number: 3, week_title: "Storytelling",           title: "Ceritakan pelajaran hidup",                            instruction: "Bagikan satu pelajaran hidup terpenting yang kamu dapatkan sampai sekarang. Dukung dengan cerita nyata dari pengalamanmu sendiri.",                                                                                                              duration_target_seconds: 75  },
  { day_number: 14, week_number: 3, week_title: "Storytelling",           title: "Gunakan teknik pembuka (hook)",                        instruction: "Mulai ceritamu dengan kalimat pembuka yang langsung menarik perhatian — pertanyaan mengejutkan, fakta unik, atau pernyataan berani. Baru kemudian lanjutkan ceritanya.",                                                                            duration_target_seconds: 75  },
  { day_number: 15, week_number: 3, week_title: "Storytelling",           title: "Ceritakan kisahmu dalam 90 detik",                     instruction: "Gabungkan semua teknik storytelling minggu ini. Ceritakan kisah hidupmu — siapa kamu, dari mana asalmu, dan ke mana kamu ingin pergi — dalam tepat 90 detik.",                                                                                  duration_target_seconds: 90  },

  // Minggu 4 — Berani Berpendapat
  { day_number: 16, week_number: 4, week_title: "Berani Berpendapat",    title: "Berikan opini tentang isu ringan",                     instruction: "Pilih satu isu ringan (misal: media sosial, gaya hidup, kuliner). Sampaikan opinimu dengan jelas: posisimu apa, dan 2-3 alasan mengapa. Bicara tegas tapi sopan.",                                                                              duration_target_seconds: 75  },
  { day_number: 17, week_number: 4, week_title: "Berani Berpendapat",    title: "Setuju / tidak setuju",                                instruction: "Pilih satu pernyataan kontroversial ringan. Jelaskan apakah kamu setuju atau tidak, beserta alasan yang logis dan contoh konkret.",                                                                                                               duration_target_seconds: 75  },
  { day_number: 18, week_number: 4, week_title: "Berani Berpendapat",    title: "Latihan mengatakan 'tidak' dengan sopan",              instruction: "Simulasikan tiga situasi: menolak ajakan yang tidak ingin kamu ikuti, menolak permintaan yang tidak bisa kamu penuhi, dan menolak pendapat tanpa menyinggung. Latih kata-katanya.",                                                               duration_target_seconds: 75  },
  { day_number: 19, week_number: 4, week_title: "Berani Berpendapat",    title: "Simulasi menjawab pertanyaan sulit",                   instruction: "Bayangkan kamu sedang diwawancara. Jawab pertanyaan ini secara spontan: 'Apa kelemahan terbesarmu?' dan 'Bagaimana kamu menangani konflik di tempat kerja?'",                                                                                    duration_target_seconds: 75  },
  { day_number: 20, week_number: 4, week_title: "Berani Berpendapat",    title: "Rekam presentasi singkat",                             instruction: "Buat presentasi singkat tentang topik yang kamu kuasai. Gunakan struktur: pembuka, isi (3 poin utama), penutup. Gunakan bahasa yang percaya diri.",                                                                                               duration_target_seconds: 90  },

  // Minggu 5 — Komunikasi Sehari-hari
  { day_number: 21, week_number: 5, week_title: "Komunikasi Sehari-hari", title: "Buka obrolan dengan orang baru",                      instruction: "Simulasikan cara membuka percakapan dengan orang yang baru kamu kenal di tiga konteks berbeda: di tempat kerja, di acara sosial, dan di antrian.",                                                                                                    duration_target_seconds: 75  },
  { day_number: 22, week_number: 5, week_title: "Komunikasi Sehari-hari", title: "Berikan pujian yang tulus",                           instruction: "Rekam dirimu memberikan pujian yang spesifik dan tulus kepada tiga orang berbeda (bisa tokoh fiksi). Hindari pujian generik seperti 'bagus sekali' — jadikan lebih personal.",                                                                        duration_target_seconds: 75  },
  { day_number: 23, week_number: 5, week_title: "Komunikasi Sehari-hari", title: "Berikan masukan yang membangun",                      instruction: "Latih cara menyampaikan kritik yang konstruktif menggunakan metode sandwich: mulai dengan hal positif, sampaikan saran perbaikan, tutup dengan semangat.",                                                                                            duration_target_seconds: 75  },
  { day_number: 24, week_number: 5, week_title: "Komunikasi Sehari-hari", title: "Simulasi menghadapi pelanggan komplain",              instruction: "Mainkan peran sebagai customer service yang menghadapi pelanggan marah. Latih empati, dengarkan keluhannya, dan tawarkan solusi tanpa defensif.",                                                                                                 duration_target_seconds: 75  },
  { day_number: 25, week_number: 5, week_title: "Komunikasi Sehari-hari", title: "Simulasi memimpin briefing 1 menit",                  instruction: "Pimpin briefing 1 menit seperti seorang team leader. Sampaikan: update situasi, prioritas hari ini, dan satu hal yang perlu diperhatikan tim. Gunakan nada yang otoritatif namun ramah.",                                                            duration_target_seconds: 75  },

  // Minggu 6 — Public Speaking Challenge
  { day_number: 26, week_number: 6, week_title: "Public Speaking Challenge", title: "Opening presentasi 1 menit",                      instruction: "Latih berbagai cara membuka presentasi: dengan pertanyaan retoris, kutipan inspiratif, atau cerita pendek. Rekam tiga versi opening yang berbeda untuk topik yang sama.",                                                                             duration_target_seconds: 60  },
  { day_number: 27, week_number: 6, week_title: "Public Speaking Challenge", title: "Bicara tanpa kata pengisi",                        instruction: "Rekam selama 90 detik tentang topik bebas tanpa sekalipun mengucapkan 'eh', 'umm', 'jadi', 'kan', atau kata pengisi lainnya. Gunakan jeda diam jika butuh waktu berpikir.",                                                                           duration_target_seconds: 90  },
  { day_number: 28, week_number: 6, week_title: "Public Speaking Challenge", title: "Menjawab pertanyaan spontan",                     instruction: "Minta seseorang (atau gunakan daftar pertanyaan acak) untuk melempar pertanyaan yang tidak terduga. Jawab setiap pertanyaan dalam 20-30 detik tanpa persiapan.",                                                                                   duration_target_seconds: 90  },
  { day_number: 29, week_number: 6, week_title: "Public Speaking Challenge", title: "Memberikan motivasi 2 menit",                     instruction: "Sampaikan pidato motivasi 2 menit kepada seseorang yang sedang menghadapi tantangan (bisa fiksi). Gunakan cerita, metafora, dan kalimat penutup yang kuat dan berkesan.",                                                                            duration_target_seconds: 120 },
  { day_number: 30, week_number: 6, week_title: "Public Speaking Challenge", title: "Presentasi 3 menit topik bebas",                  instruction: "Rancang dan sampaikan presentasi 3 menit tentang topik yang kamu sukai atau kuasai. Terapkan semua yang sudah kamu pelajari: struktur, intonasi, jeda, kontak mata, dan ekspresi.",                                                                   duration_target_seconds: 180 },

  // Bonus
  { day_number: 31, week_number: 7, week_title: "Bonus",                  title: "Video refleksi 31 hari",                              instruction: "Rekam video refleksi: ceritakan perubahan terbesar yang kamu rasakan setelah menyelesaikan 30 hari program Talkuno. Bandingkan dirimu sekarang dengan hari pertama. Jadikan ini momentum.",                                                              duration_target_seconds: 240 },
] as const;

// ── Types ──────────────────────────────────────────────────────────────────

type SeedStatus = "idle" | "checking" | "seeding" | "done" | "error";

// ── Page ───────────────────────────────────────────────────────────────────

export default function SeedTopicsPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState<SeedStatus>("idle");
  const [existingCount, setExistingCount] = useState<number | null>(null);
  const [writtenCount, setWrittenCount] = useState<number | null>(null);
  const [errorMsg, setErrorMsg] = useState("");

  async function checkTopics() {
    setStatus("checking");
    setErrorMsg("");
    try {
      const snap = await getDocs(collection(db, "topics"));
      setExistingCount(snap.size);
      setStatus("idle");
    } catch (e) {
      const err = e as { code?: string };
      if (err?.code === "permission-denied") {
        setErrorMsg(
          "PERMISSION DENIED: Firestore menolak read ke koleksi 'topics'. " +
          "Pastikan Security Rules sudah di-deploy dan kamu sudah login."
        );
      } else {
        setErrorMsg("Gagal cek topics: " + String(e));
      }
      setStatus("error");
    }
  }

  async function seedTopics() {
    setStatus("seeding");
    setErrorMsg("");
    setWrittenCount(null);

    try {
      // Batch write: setDoc (overwrite) — idempotent
      // Firestore max 500 ops per batch, 31 dokumen aman
      const batch = writeBatch(db);
      const colRef = collection(db, "topics");

      for (const topic of TOPICS) {
        const docRef = doc(colRef, `day-${topic.day_number}`);
        batch.set(docRef, topic);      // set() selalu overwrite → idempotent
      }

      await batch.commit();

      // Verify: hitung ulang setelah commit
      const verifySnap = await getDocs(collection(db, "topics"));
      setWrittenCount(verifySnap.size);
      setExistingCount(verifySnap.size);
      setStatus("done");
    } catch (e) {
      const err = e as { code?: string };
      if (err?.code === "permission-denied") {
        setErrorMsg(
          "PERMISSION DENIED: Firestore menolak write ke 'topics'.\n\n" +
          "Solusi: Buka Firebase Console → Firestore → Rules, " +
          "ubah sementara rule topics menjadi:\n" +
          "  allow write: if request.auth != null;\n\n" +
          "Setelah seed berhasil, kembalikan ke:\n" +
          "  allow write: if false;"
        );
      } else {
        setErrorMsg("Seed gagal: " + String(e));
      }
      setStatus("error");
    }
  }

  const isBusy = status === "checking" || status === "seeding";

  return (
    <div
      className="min-h-screen flex items-center justify-center px-6"
      style={{ backgroundColor: "var(--color-talkuno-cream)" }}
    >
      <div
        className="w-full max-w-md rounded-2xl px-8 py-8"
        style={{ backgroundColor: "#fff", boxShadow: "0 2px 20px rgba(43,36,32,0.08)" }}
      >
        {/* Header */}
        <div className="mb-6">
          <p
            className="text-xs font-semibold uppercase tracking-widest mb-1"
            style={{ fontFamily: "var(--font-body)", color: "rgba(43,36,32,0.35)" }}
          >
            Dev Tool — Hapus setelah selesai
          </p>
          <h1
            className="text-xl"
            style={{ fontFamily: "var(--font-heading)", fontWeight: 600, color: "var(--color-talkuno-dark)" }}
          >
            Seed Koleksi Topics
          </h1>
          <p
            className="mt-1 text-sm"
            style={{ fontFamily: "var(--font-body)", color: "rgba(43,36,32,0.5)", lineHeight: 1.6 }}
          >
            Menulis {TOPICS.length} dokumen kurikulum ke Firestore. Aman dijalankan ulang — dokumen lama akan ditimpa (idempotent).
          </p>
        </div>

        {/* Status info */}
        <div
          className="rounded-xl px-4 py-3 mb-5 text-sm"
          style={{ backgroundColor: "rgba(43,36,32,0.04)", fontFamily: "var(--font-body)" }}
        >
          <div className="flex justify-between items-center">
            <span style={{ color: "rgba(43,36,32,0.55)" }}>Login sebagai</span>
            <span style={{ color: "var(--color-talkuno-dark)", fontWeight: 500 }}>
              {user?.email ?? "Belum login"}
            </span>
          </div>
          {existingCount !== null && (
            <div className="flex justify-between items-center mt-1.5">
              <span style={{ color: "rgba(43,36,32,0.55)" }}>Topics di Firestore</span>
              <span
                style={{
                  color: existingCount === 31 ? "var(--color-talkuno-teal)" : "var(--color-talkuno-amber)",
                  fontWeight: 600,
                }}
              >
                {existingCount} / 31 dokumen
              </span>
            </div>
          )}
        </div>

        {/* Error */}
        {status === "error" && errorMsg && (
          <div
            className="rounded-xl px-4 py-3 mb-5 flex gap-2.5"
            style={{ backgroundColor: "rgba(217,79,61,0.07)" }}
          >
            <IconAlertTriangle size={16} stroke={2} style={{ color: "#D94F3D", marginTop: 2, flexShrink: 0 }} />
            <p
              className="text-xs whitespace-pre-line"
              style={{ fontFamily: "var(--font-body)", color: "#D94F3D", lineHeight: 1.7 }}
            >
              {errorMsg}
            </p>
          </div>
        )}

        {/* Success */}
        {status === "done" && (
          <div
            className="rounded-xl px-4 py-3 mb-5 flex gap-2.5"
            style={{ backgroundColor: "rgba(79,155,142,0.1)" }}
          >
            <IconCheck size={16} stroke={2.5} style={{ color: "var(--color-talkuno-teal)", marginTop: 2, flexShrink: 0 }} />
            <div>
              <p
                className="text-sm font-semibold"
                style={{ fontFamily: "var(--font-body)", color: "var(--color-talkuno-teal)" }}
              >
                Berhasil! {writtenCount} dokumen tertulis.
              </p>
              <p
                className="text-xs mt-0.5"
                style={{ fontFamily: "var(--font-body)", color: "rgba(43,36,32,0.5)" }}
              >
                Sekarang buka{" "}
                <a href="/dev/reprovision" style={{ color: "var(--color-talkuno-coral)" }}>/dev/reprovision</a>
                {" "}untuk provision ulang akun, lalu buka{" "}
                <a href="/dashboard" style={{ color: "var(--color-talkuno-coral)" }}>/dashboard</a>.
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-2.5">
          {/* Step 1: Cek current state */}
          <button
            id="btn-check-topics"
            onClick={checkTopics}
            disabled={isBusy || !user}
            className="w-full py-2.5 rounded-full text-sm font-medium border transition-colors"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-talkuno-dark)",
              borderColor: "rgba(43,36,32,0.18)",
              backgroundColor: "transparent",
              opacity: isBusy || !user ? 0.5 : 1,
              cursor: isBusy || !user ? "not-allowed" : "pointer",
            }}
          >
            {status === "checking" ? "Mengecek…" : "1. Cek jumlah topics di Firestore"}
          </button>

          {/* Step 2: Seed */}
          <button
            id="btn-seed-topics"
            onClick={seedTopics}
            disabled={isBusy || !user}
            className="w-full py-2.5 rounded-full text-sm font-medium text-white transition-opacity"
            style={{
              fontFamily: "var(--font-body)",
              backgroundColor: "var(--color-talkuno-coral)",
              opacity: isBusy || !user ? 0.5 : 1,
              cursor: isBusy || !user ? "not-allowed" : "pointer",
            }}
          >
            {status === "seeding"
              ? `Menulis ${TOPICS.length} dokumen…`
              : `2. Seed ${TOPICS.length} Topics ke Firestore`}
          </button>
        </div>

        <p
          className="mt-4 text-xs text-center"
          style={{ fontFamily: "var(--font-body)", color: "rgba(43,36,32,0.3)" }}
        >
          Halaman ini hanya untuk development. Hapus setelah selesai.
        </p>
      </div>
    </div>
  );
}
