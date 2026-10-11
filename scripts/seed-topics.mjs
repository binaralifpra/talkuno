// @ts-check
/**
 * scripts/seed-topics.mjs
 *
 * CARA PAKAI:
 * 1. Download Service Account key dari Firebase Console:
 *    - Buka https://console.firebase.google.com → Project talkuno-2be65
 *    - Project Settings → Service accounts → Generate new private key
 *    - Simpan file JSON-nya, rename jadi: serviceAccountKey.json
 *    - Taruh di root proyek (talkuno/serviceAccountKey.json)
 *    - PENTING: tambahkan serviceAccountKey.json ke .gitignore!
 *
 * 2. Jalankan script:
 *    node scripts/seed-topics.mjs
 *
 * Script ini idempotent: aman dijalankan ulang, dokumen lama akan ditimpa.
 */

import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const keyPath = resolve(__dirname, "../serviceAccountKey.json");

if (!existsSync(keyPath)) {
  console.error(`
❌  serviceAccountKey.json tidak ditemukan di: ${keyPath}

Cara mendapatkannya:
  1. Buka https://console.firebase.google.com → project talkuno-2be65
  2. Project Settings (ikon ⚙️) → tab "Service accounts"
  3. Klik "Generate new private key" → konfirmasi → download file JSON
  4. Rename file tersebut menjadi: serviceAccountKey.json
  5. Taruh di folder: ${resolve(__dirname, "..")}

ALTERNATIF: Pakai browser seed page di http://localhost:3000/dev/seed-topics
  `);
  process.exit(1);
}

let serviceAccount;
try {
  serviceAccount = JSON.parse(readFileSync(keyPath, "utf8"));
} catch (e) {
  console.error("❌  Gagal membaca serviceAccountKey.json:", e.message);
  process.exit(1);
}

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();


// ─── Data Kurikulum 31 Hari ─────────────────────────────────────────────────

const topics = [
  // Minggu 1 — Berani Bicara
  {
    day_number: 1,
    week_number: 1,
    week_title: "Berani Bicara",
    title: "Rekam video perkenalan diri",
    instruction:
      "Perkenalkan dirimu dalam 60 detik: nama, asal, hobi, dan satu hal menarik tentang dirimu. Bicara langsung ke kamera, jangan baca teks.",
    duration_target_seconds: 60,
  },
  {
    day_number: 2,
    week_number: 1,
    week_title: "Berani Bicara",
    title: "Ceritakan kegiatan hari ini",
    instruction:
      "Ceritakan apa yang kamu lakukan hari ini dari pagi sampai sekarang. Gunakan urutan waktu yang jelas dan bicara dengan santai.",
    duration_target_seconds: 60,
  },
  {
    day_number: 3,
    week_number: 1,
    week_title: "Berani Bicara",
    title: "Perkenalkan benda favoritmu",
    instruction:
      "Pilih satu benda yang paling kamu sukai. Jelaskan apa itu, kenapa kamu suka, dan satu cerita menarik tentang benda itu.",
    duration_target_seconds: 60,
  },
  {
    day_number: 4,
    week_number: 1,
    week_title: "Berani Bicara",
    title: "Ceritakan pengalaman lucu",
    instruction:
      "Ingat kembali satu kejadian lucu atau memalukan yang pernah kamu alami. Ceritakan dengan ekspresi yang hidup dan senyum.",
    duration_target_seconds: 60,
  },
  {
    day_number: 5,
    week_number: 1,
    week_title: "Berani Bicara",
    title: "Checkpoint: tonton ulang & evaluasi diri",
    instruction:
      "Tonton ulang rekaman hari 1–4. Pilih take terbaik dari masing-masing hari. Rekam video singkat: apa yang sudah baik dan apa yang ingin kamu tingkatkan minggu depan.",
    duration_target_seconds: 60,
  },

  // Minggu 2 — Suara yang Meyakinkan
  {
    day_number: 6,
    week_number: 2,
    week_title: "Suara yang Meyakinkan",
    title: "Latihan membaca keras",
    instruction:
      "Ambil satu paragraf dari artikel atau buku. Bacakan keras-keras dengan vokal yang jelas, kecepatan stabil, dan artikulasi yang tepat. Ulang jika ada kata yang tergumam.",
    duration_target_seconds: 60,
  },
  {
    day_number: 7,
    week_number: 2,
    week_title: "Suara yang Meyakinkan",
    title: "Latihan senyum saat berbicara",
    instruction:
      "Ceritakan hal sederhana yang kamu syukuri hari ini sambil terus tersenyum. Perhatikan bagaimana senyum mengubah nada suaramu menjadi lebih hangat.",
    duration_target_seconds: 60,
  },
  {
    day_number: 8,
    week_number: 2,
    week_title: "Suara yang Meyakinkan",
    title: "Latihan jeda (pause)",
    instruction:
      "Ceritakan topik apa saja, tapi setiap kali ingin bilang 'eh' atau 'umm', gunakan jeda diam 1-2 detik. Jeda itu kuat — latih dirimu nyaman dengannya.",
    duration_target_seconds: 60,
  },
  {
    day_number: 9,
    week_number: 2,
    week_title: "Suara yang Meyakinkan",
    title: "Latihan intonasi pada sebuah cerita",
    instruction:
      "Pilih cerita pendek dan bacakan dua kali: pertama dengan nada datar, kedua dengan variasi intonasi yang dramatis. Rasakan perbedaannya.",
    duration_target_seconds: 60,
  },
  {
    day_number: 10,
    week_number: 2,
    week_title: "Suara yang Meyakinkan",
    title: "Rekam sebelum & sesudah teknik",
    instruction:
      "Pilih topik bebas. Rekam dua versi: versi pertama bicara biasa, versi kedua terapkan semua teknik minggu ini (senyum, jeda, intonasi). Bandingkan hasilnya.",
    duration_target_seconds: 60,
  },

  // Minggu 3 — Storytelling
  {
    day_number: 11,
    week_number: 3,
    week_title: "Storytelling",
    title: "Ceritakan pengalaman gagal",
    instruction:
      "Ceritakan satu kegagalan yang pernah kamu alami. Apa yang terjadi? Apa yang kamu rasakan? Apa yang kamu pelajari? Jadikan cerita yang inspiratif, bukan keluhan.",
    duration_target_seconds: 75,
  },
  {
    day_number: 12,
    week_number: 3,
    week_title: "Storytelling",
    title: "Ceritakan momen paling membanggakan",
    instruction:
      "Ingat satu pencapaian yang benar-benar membuatmu bangga. Ceritakan perjalanannya, bukan hanya hasilnya. Buat pendengar merasakan apa yang kamu rasakan.",
    duration_target_seconds: 75,
  },
  {
    day_number: 13,
    week_number: 3,
    week_title: "Storytelling",
    title: "Ceritakan pelajaran hidup",
    instruction:
      "Bagikan satu pelajaran hidup terpenting yang kamu dapatkan sampai sekarang. Dukung dengan cerita nyata dari pengalamanmu sendiri.",
    duration_target_seconds: 75,
  },
  {
    day_number: 14,
    week_number: 3,
    week_title: "Storytelling",
    title: "Gunakan teknik pembuka (hook)",
    instruction:
      "Mulai ceritamu dengan kalimat pembuka yang langsung menarik perhatian — pertanyaan mengejutkan, fakta unik, atau pernyataan berani. Baru kemudian lanjutkan ceritanya.",
    duration_target_seconds: 75,
  },
  {
    day_number: 15,
    week_number: 3,
    week_title: "Storytelling",
    title: "Ceritakan kisahmu dalam 90 detik",
    instruction:
      "Gabungkan semua teknik storytelling minggu ini. Ceritakan kisah hidupmu — siapa kamu, dari mana asalmu, dan ke mana kamu ingin pergi — dalam tepat 90 detik.",
    duration_target_seconds: 90,
  },

  // Minggu 4 — Berani Berpendapat
  {
    day_number: 16,
    week_number: 4,
    week_title: "Berani Berpendapat",
    title: "Berikan opini tentang isu ringan",
    instruction:
      "Pilih satu isu ringan (misal: media sosial, gaya hidup, kuliner). Sampaikan opinimu dengan jelas: posisimu apa, dan 2-3 alasan mengapa. Bicara tegas tapi sopan.",
    duration_target_seconds: 75,
  },
  {
    day_number: 17,
    week_number: 4,
    week_title: "Berani Berpendapat",
    title: "Setuju / tidak setuju",
    instruction:
      "Pilih satu pernyataan kontroversial ringan. Jelaskan apakah kamu setuju atau tidak, beserta alasan yang logis dan contoh konkret.",
    duration_target_seconds: 75,
  },
  {
    day_number: 18,
    week_number: 4,
    week_title: "Berani Berpendapat",
    title: "Latihan mengatakan 'tidak' dengan sopan",
    instruction:
      "Simulasikan tiga situasi: menolak ajakan yang tidak ingin kamu ikuti, menolak permintaan yang tidak bisa kamu penuhi, dan menolak pendapat tanpa menyinggung. Latih kata-katanya.",
    duration_target_seconds: 75,
  },
  {
    day_number: 19,
    week_number: 4,
    week_title: "Berani Berpendapat",
    title: "Simulasi menjawab pertanyaan sulit",
    instruction:
      "Bayangkan kamu sedang diwawancara. Jawab pertanyaan ini secara spontan: 'Apa kelemahan terbesarmu?' dan 'Bagaimana kamu menangani konflik di tempat kerja?'",
    duration_target_seconds: 75,
  },
  {
    day_number: 20,
    week_number: 4,
    week_title: "Berani Berpendapat",
    title: "Rekam presentasi singkat",
    instruction:
      "Buat presentasi singkat tentang topik yang kamu kuasai. Gunakan struktur: pembuka, isi (3 poin utama), penutup. Gunakan bahasa yang percaya diri.",
    duration_target_seconds: 90,
  },

  // Minggu 5 — Komunikasi Sehari-hari
  {
    day_number: 21,
    week_number: 5,
    week_title: "Komunikasi Sehari-hari",
    title: "Buka obrolan dengan orang baru",
    instruction:
      "Simulasikan cara membuka percakapan dengan orang yang baru kamu kenal di tiga konteks berbeda: di tempat kerja, di acara sosial, dan di antrian.",
    duration_target_seconds: 75,
  },
  {
    day_number: 22,
    week_number: 5,
    week_title: "Komunikasi Sehari-hari",
    title: "Berikan pujian yang tulus",
    instruction:
      "Rekam dirimu memberikan pujian yang spesifik dan tulus kepada tiga orang berbeda (bisa tokoh fiksi). Hindari pujian generik seperti 'bagus sekali' — jadikan lebih personal.",
    duration_target_seconds: 75,
  },
  {
    day_number: 23,
    week_number: 5,
    week_title: "Komunikasi Sehari-hari",
    title: "Berikan masukan yang membangun",
    instruction:
      "Latih cara menyampaikan kritik yang konstruktif menggunakan metode sandwich: mulai dengan hal positif, sampaikan saran perbaikan, tutup dengan semangat.",
    duration_target_seconds: 75,
  },
  {
    day_number: 24,
    week_number: 5,
    week_title: "Komunikasi Sehari-hari",
    title: "Simulasi menghadapi pelanggan komplain",
    instruction:
      "Mainkan peran sebagai customer service yang menghadapi pelanggan marah. Latih empati, dengarkan keluhannya, dan tawarkan solusi tanpa defensif.",
    duration_target_seconds: 75,
  },
  {
    day_number: 25,
    week_number: 5,
    week_title: "Komunikasi Sehari-hari",
    title: "Simulasi memimpin briefing 1 menit",
    instruction:
      "Pimpin briefing 1 menit seperti seorang team leader. Sampaikan: update situasi, prioritas hari ini, dan satu hal yang perlu diperhatikan tim. Gunakan nada yang otoritatif namun ramah.",
    duration_target_seconds: 75,
  },

  // Minggu 6 — Public Speaking Challenge
  {
    day_number: 26,
    week_number: 6,
    week_title: "Public Speaking Challenge",
    title: "Opening presentasi 1 menit",
    instruction:
      "Latih berbagai cara membuka presentasi: dengan pertanyaan retoris, kutipan inspiratif, atau cerita pendek. Rekam tiga versi opening yang berbeda untuk topik yang sama.",
    duration_target_seconds: 60,
  },
  {
    day_number: 27,
    week_number: 6,
    week_title: "Public Speaking Challenge",
    title: "Bicara tanpa kata pengisi",
    instruction:
      "Rekam selama 90 detik tentang topik bebas tanpa sekalipun mengucapkan 'eh', 'umm', 'jadi', 'kan', atau kata pengisi lainnya. Gunakan jeda diam jika butuh waktu berpikir.",
    duration_target_seconds: 90,
  },
  {
    day_number: 28,
    week_number: 6,
    week_title: "Public Speaking Challenge",
    title: "Menjawab pertanyaan spontan",
    instruction:
      "Minta seseorang (atau gunakan daftar pertanyaan acak) untuk melempar pertanyaan yang tidak terduga. Jawab setiap pertanyaan dalam 20-30 detik tanpa persiapan.",
    duration_target_seconds: 90,
  },
  {
    day_number: 29,
    week_number: 6,
    week_title: "Public Speaking Challenge",
    title: "Memberikan motivasi 2 menit",
    instruction:
      "Sampaikan pidato motivasi 2 menit kepada seseorang yang sedang menghadapi tantangan (bisa fiksi). Gunakan cerita, metafora, dan kalimat penutup yang kuat dan berkesan.",
    duration_target_seconds: 120,
  },
  {
    day_number: 30,
    week_number: 6,
    week_title: "Public Speaking Challenge",
    title: "Presentasi 3 menit topik bebas",
    instruction:
      "Rancang dan sampaikan presentasi 3 menit tentang topik yang kamu sukai atau kuasai. Terapkan semua yang sudah kamu pelajari: struktur, intonasi, jeda, kontak mata, dan ekspresi.",
    duration_target_seconds: 180,
  },

  // Bonus
  {
    day_number: 31,
    week_number: 7,
    week_title: "Bonus",
    title: "Video refleksi 31 hari",
    instruction:
      "Rekam video refleksi: ceritakan perubahan terbesar yang kamu rasakan setelah menyelesaikan 30 hari program Talkuno. Bandingkan dirimu sekarang dengan hari pertama. Jadikan ini momentum.",
    duration_target_seconds: 240,
  },
];

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
  console.log(`Seeding ${topics.length} topics ke Firestore...`);

  const batch = db.batch();
  const colRef = db.collection("topics");

  for (const topic of topics) {
    const docRef = colRef.doc(`day-${topic.day_number}`);
    batch.set(docRef, topic);
  }

  await batch.commit();
  console.log(`✓ Selesai! ${topics.length} dokumen berhasil ditulis ke koleksi 'topics'.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Seed gagal:", err);
  process.exit(1);
});
