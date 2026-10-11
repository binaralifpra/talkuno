/**
 * lib/curriculum.ts
 *
 * Sumber kebenaran tunggal untuk data kurikulum 31 hari.
 * Disimpan lokal di kode agar:
 * - Tidak butuh seeding ke Firestore
 * - Provisioning user baru selalu berhasil tanpa dependensi eksternal
 * - Dashboard bisa baca data tanpa roundtrip ke koleksi "topics"
 */

export interface Topic {
  day_number: number;
  week_number: number;
  week_title: string;
  title: string;
  instruction: string;
  duration_target_seconds: number;
  instruction_detail?: string | null;
  reference_note?: string | null;
  reference_url?: string | null;
  reference_label?: string | null;
}

export const CURRICULUM: Topic[] = [
  // ── Minggu 1 — Berani Bicara ───────────────────────────────────────────
  {
    day_number: 1, week_number: 1, week_title: "Berani Bicara",
    title: "Rekam video perkenalan diri",
    instruction: "Perkenalkan dirimu dalam 60 detik: nama, asal, hobi, dan satu hal menarik tentang dirimu. Bicara langsung ke kamera, jangan baca teks.",
    duration_target_seconds: 60,
  },
  {
    day_number: 2, week_number: 1, week_title: "Berani Bicara",
    title: "Ceritakan kegiatan hari ini",
    instruction: "Ceritakan apa yang kamu lakukan hari ini dari pagi sampai sekarang. Gunakan urutan waktu yang jelas dan bicara dengan santai.",
    duration_target_seconds: 60,
    instruction_detail: "Ceritakan urutan kegiatanmu dari pagi sampai sekarang, pilih satu momen yang paling berkesan untuk diceritakan lebih detail.",
  },
  {
    day_number: 3, week_number: 1, week_title: "Berani Bicara",
    title: "Perkenalkan benda favoritmu",
    instruction: "Pilih satu benda yang paling kamu sukai. Jelaskan apa itu, kenapa kamu suka, dan satu cerita menarik tentang benda itu.",
    duration_target_seconds: 60,
  },
  {
    day_number: 4, week_number: 1, week_title: "Berani Bicara",
    title: "Ceritakan pengalaman lucu",
    instruction: "Ingat kembali satu kejadian lucu atau memalukan yang pernah kamu alami. Ceritakan dengan ekspresi yang hidup dan senyum.",
    duration_target_seconds: 60,
    instruction_detail: "Pilih satu momen lucu yang masih kamu ingat jelas, ceritakan kejadiannya secara berurutan supaya pendengar bisa membayangkan situasinya.",
  },
  {
    day_number: 5, week_number: 1, week_title: "Berani Bicara",
    title: "Checkpoint: tonton ulang & evaluasi diri",
    instruction: "Tonton ulang rekaman hari 1–4. Pilih take terbaik dari masing-masing hari. Rekam video singkat: apa yang sudah baik dan apa yang ingin kamu tingkatkan minggu depan.",
    duration_target_seconds: 60,
  },

  // ── Minggu 2 — Suara yang Meyakinkan ──────────────────────────────────
  {
    day_number: 6, week_number: 2, week_title: "Suara yang Meyakinkan",
    title: "Latihan membaca keras",
    instruction: "Ambil satu paragraf dari artikel atau buku. Bacakan keras-keras dengan vokal yang jelas, kecepatan stabil, dan artikulasi yang tepat. Ulang jika ada kata yang tergumam.",
    duration_target_seconds: 60,
    reference_note: "Membaca keras melatih artikulasi, memastikan tiap kata terucap jelas. Baca perlahan, fokus pada pengucapan tiap suku kata, jangan terburu-buru.",
  },
  {
    day_number: 7, week_number: 2, week_title: "Suara yang Meyakinkan",
    title: "Latihan senyum saat berbicara",
    instruction: "Ceritakan hal sederhana yang kamu syukuri hari ini sambil terus tersenyum. Perhatikan bagaimana senyum mengubah nada suaramu menjadi lebih hangat.",
    duration_target_seconds: 60,
    reference_note: "Senyum saat berbicara secara alami membuat nada suara terdengar lebih hangat dan ramah, meski pendengar tidak melihatmu secara langsung.",
  },
  {
    day_number: 8, week_number: 2, week_title: "Suara yang Meyakinkan",
    title: "Latihan jeda (pause)",
    instruction: "Ceritakan topik apa saja, tapi setiap kali ingin bilang 'eh' atau 'umm', gunakan jeda diam 1-2 detik. Jeda itu kuat — latih dirimu nyaman dengannya.",
    duration_target_seconds: 60,
    reference_note: "Jeda adalah momen berhenti sejenak saat berbicara, digunakan untuk memberi penekanan, memberi waktu berpikir, atau membiarkan pendengar mencerna informasi. Ada beberapa jenis jeda: jeda dramatis (sebelum menyampaikan poin penting), jeda transisi (saat berpindah topik), dan jeda napas (alami saat mengambil napas).",
    reference_url: "https://www.youtube.com/results?search_query=teknik+jeda+public+speaking",
    reference_label: "Cari contoh di YouTube",
  },
  {
    day_number: 9, week_number: 2, week_title: "Suara yang Meyakinkan",
    title: "Latihan intonasi pada sebuah cerita",
    instruction: "Pilih cerita pendek dan bacakan dua kali: pertama dengan nada datar, kedua dengan variasi intonasi yang dramatis. Rasakan perbedaannya.",
    duration_target_seconds: 60,
    reference_note: "Intonasi adalah naik turunnya nada suara saat berbicara, dipakai untuk menyampaikan emosi dan penekanan makna. Intonasi yang datar membuat pendengar mudah bosan.",
    reference_url: "https://www.youtube.com/results?search_query=latihan+intonasi+suara+public+speaking",
    reference_label: "Cari contoh di YouTube",
  },
  {
    day_number: 10, week_number: 2, week_title: "Suara yang Meyakinkan",
    title: "Rekam sebelum & sesudah teknik",
    instruction: "Pilih topik bebas. Rekam dua versi: versi pertama bicara biasa, versi kedua terapkan semua teknik minggu ini (senyum, jeda, intonasi). Bandingkan hasilnya.",
    duration_target_seconds: 60,
  },

  // ── Minggu 3 — Storytelling ────────────────────────────────────────────
  {
    day_number: 11, week_number: 3, week_title: "Storytelling",
    title: "Ceritakan pengalaman gagal",
    instruction: "Ceritakan satu kegagalan yang pernah kamu alami. Apa yang terjadi? Apa yang kamu rasakan? Apa yang kamu pelajari? Jadikan cerita yang inspiratif, bukan keluhan.",
    duration_target_seconds: 75,
    instruction_detail: "Mungkin di tempat kerja, sekolah, atau keluarga. Ceritakan apa yang terjadi, apa yang kamu pelajari, dan bagaimana kamu bangkit dari kegagalan itu, coba rangkai dalam satu alur cerita.",
  },
  {
    day_number: 12, week_number: 3, week_title: "Storytelling",
    title: "Ceritakan momen paling membanggakan",
    instruction: "Ingat satu pencapaian yang benar-benar membuatmu bangga. Ceritakan perjalanannya, bukan hanya hasilnya. Buat pendengar merasakan apa yang kamu rasakan.",
    duration_target_seconds: 75,
  },
  {
    day_number: 13, week_number: 3, week_title: "Storytelling",
    title: "Ceritakan pelajaran hidup",
    instruction: "Bagikan satu pelajaran hidup terpenting yang kamu dapatkan sampai sekarang. Dukung dengan cerita nyata dari pengalamanmu sendiri.",
    duration_target_seconds: 75,
  },
  {
    day_number: 14, week_number: 3, week_title: "Storytelling",
    title: "Gunakan teknik pembuka (hook)",
    instruction: "Mulai ceritamu dengan kalimat pembuka yang langsung menarik perhatian — pertanyaan mengejutkan, fakta unik, atau pernyataan berani. Baru kemudian lanjutkan ceritanya.",
    duration_target_seconds: 75,
    reference_note: "Hook adalah kalimat pembuka yang menarik perhatian pendengar sejak detik pertama, bisa berupa pertanyaan retoris, fakta mengejutkan, atau potongan cerita singkat.",
    reference_url: "https://www.youtube.com/results?search_query=teknik+opening+hook+public+speaking",
    reference_label: "Cari contoh di YouTube",
  },
  {
    day_number: 15, week_number: 3, week_title: "Storytelling",
    title: "Ceritakan kisahmu dalam 90 detik",
    instruction: "Gabungkan semua teknik storytelling minggu ini. Ceritakan kisah hidupmu — siapa kamu, dari mana asalmu, dan ke mana kamu ingin pergi — dalam tepat 90 detik.",
    duration_target_seconds: 90,
  },

  // ── Minggu 4 — Berani Berpendapat ─────────────────────────────────────
  {
    day_number: 16, week_number: 4, week_title: "Berani Berpendapat",
    title: "Berikan opini tentang isu ringan",
    instruction: "Pilih satu isu ringan (misal: media sosial, gaya hidup, kuliner). Sampaikan opinimu dengan jelas: posisimu apa, dan 2-3 alasan mengapa. Bicara tegas tapi sopan.",
    duration_target_seconds: 75,
  },
  {
    day_number: 17, week_number: 4, week_title: "Berani Berpendapat",
    title: "Setuju / tidak setuju",
    instruction: "Pilih satu pernyataan kontroversial ringan. Jelaskan apakah kamu setuju atau tidak, beserta alasan yang logis dan contoh konkret.",
    duration_target_seconds: 75,
  },
  {
    day_number: 18, week_number: 4, week_title: "Berani Berpendapat",
    title: "Latihan mengatakan 'tidak' dengan sopan",
    instruction: "Simulasikan tiga situasi: menolak ajakan yang tidak ingin kamu ikuti, menolak permintaan yang tidak bisa kamu penuhi, dan menolak pendapat tanpa menyinggung. Latih kata-katanya.",
    duration_target_seconds: 75,
  },
  {
    day_number: 19, week_number: 4, week_title: "Berani Berpendapat",
    title: "Simulasi menjawab pertanyaan sulit",
    instruction: "Bayangkan kamu sedang diwawancara. Jawab pertanyaan ini secara spontan: 'Apa kelemahan terbesarmu?' dan 'Bagaimana kamu menangani konflik di tempat kerja?'",
    duration_target_seconds: 75,
  },
  {
    day_number: 20, week_number: 4, week_title: "Berani Berpendapat",
    title: "Rekam presentasi singkat",
    instruction: "Buat presentasi singkat tentang topik yang kamu kuasai. Gunakan struktur: pembuka, isi (3 poin utama), penutup. Gunakan bahasa yang percaya diri.",
    duration_target_seconds: 90,
  },

  // ── Minggu 5 — Komunikasi Sehari-hari ─────────────────────────────────
  {
    day_number: 21, week_number: 5, week_title: "Komunikasi Sehari-hari",
    title: "Buka obrolan dengan orang baru",
    instruction: "Simulasikan cara membuka percakapan dengan orang yang baru kamu kenal di tiga konteks berbeda: di tempat kerja, di acara sosial, dan di antrian.",
    duration_target_seconds: 75,
    instruction_detail: "Bayangkan kamu bertemu orang baru di sebuah acara. Latih kalimat pembuka obrolan, pertanyaan lanjutan, dan cara menjaga obrolan tetap mengalir.",
  },
  {
    day_number: 22, week_number: 5, week_title: "Komunikasi Sehari-hari",
    title: "Berikan pujian yang tulus",
    instruction: "Rekam dirimu memberikan pujian yang spesifik dan tulus kepada tiga orang berbeda (bisa tokoh fiksi). Hindari pujian generik seperti 'bagus sekali' — jadikan lebih personal.",
    duration_target_seconds: 75,
  },
  {
    day_number: 23, week_number: 5, week_title: "Komunikasi Sehari-hari",
    title: "Berikan masukan yang membangun",
    instruction: "Latih cara menyampaikan kritik yang konstruktif menggunakan metode sandwich: mulai dengan hal positif, sampaikan saran perbaikan, tutup dengan semangat.",
    duration_target_seconds: 75,
    instruction_detail: "Pilih satu situasi (nyata atau rekaan), sampaikan masukan dengan struktur: mulai dari hal positif, sampaikan area yang perlu diperbaiki, tutup dengan dukungan.",
  },
  {
    day_number: 24, week_number: 5, week_title: "Komunikasi Sehari-hari",
    title: "Simulasi menghadapi pelanggan komplain",
    instruction: "Mainkan peran sebagai customer service yang menghadapi pelanggan marah. Latih empati, dengarkan keluhannya, dan tawarkan solusi tanpa defensif.",
    duration_target_seconds: 75,
  },
  {
    day_number: 25, week_number: 5, week_title: "Komunikasi Sehari-hari",
    title: "Simulasi memimpin briefing 1 menit",
    instruction: "Pimpin briefing 1 menit seperti seorang team leader. Sampaikan: update situasi, prioritas hari ini, dan satu hal yang perlu diperhatikan tim. Gunakan nada yang otoritatif namun ramah.",
    duration_target_seconds: 75,
  },

  // ── Minggu 6 — Public Speaking Challenge ──────────────────────────────
  {
    day_number: 26, week_number: 6, week_title: "Public Speaking Challenge",
    title: "Opening presentasi 1 menit",
    instruction: "Latih berbagai cara membuka presentasi: dengan pertanyaan retoris, kutipan inspiratif, atau cerita pendek. Rekam tiga versi opening yang berbeda untuk topik yang sama.",
    duration_target_seconds: 60,
  },
  {
    day_number: 27, week_number: 6, week_title: "Public Speaking Challenge",
    title: "Bicara tanpa kata pengisi",
    instruction: "Rekam selama 90 detik tentang topik bebas tanpa sekalipun mengucapkan 'eh', 'umm', 'jadi', 'kan', atau kata pengisi lainnya. Gunakan jeda diam jika butuh waktu berpikir.",
    duration_target_seconds: 90,
  },
  {
    day_number: 28, week_number: 6, week_title: "Public Speaking Challenge",
    title: "Menjawab pertanyaan spontan",
    instruction: "Minta seseorang (atau gunakan daftar pertanyaan acak) untuk melempar pertanyaan yang tidak terduga. Jawab setiap pertanyaan dalam 20-30 detik tanpa persiapan.",
    duration_target_seconds: 90,
  },
  {
    day_number: 29, week_number: 6, week_title: "Public Speaking Challenge",
    title: "Memberikan motivasi 2 menit",
    instruction: "Sampaikan pidato motivasi 2 menit kepada seseorang yang sedang menghadapi tantangan (bisa fiksi). Gunakan cerita, metafora, dan kalimat penutup yang kuat dan berkesan.",
    duration_target_seconds: 120,
  },
  {
    day_number: 30, week_number: 6, week_title: "Public Speaking Challenge",
    title: "Presentasi 3 menit topik bebas",
    instruction: "Rancang dan sampaikan presentasi 3 menit tentang topik yang kamu sukai atau kuasai. Terapkan semua yang sudah kamu pelajari: struktur, intonasi, jeda, kontak mata, dan ekspresi.",
    duration_target_seconds: 180,
  },

  // ── Bonus ─────────────────────────────────────────────────────────────
  {
    day_number: 31, week_number: 7, week_title: "Bonus",
    title: "Video refleksi 31 hari",
    instruction: "Rekam video refleksi: ceritakan perubahan terbesar yang kamu rasakan setelah menyelesaikan 30 hari program Talkuno. Bandingkan dirimu sekarang dengan hari pertama. Jadikan ini momentum.",
    duration_target_seconds: 240,
  },
];

/** Lookup O(1) berdasarkan topic_id (format: "day-N") */
export const CURRICULUM_MAP: Record<string, Topic> = Object.fromEntries(
  CURRICULUM.map((t) => [`day-${t.day_number}`, t])
);

/** Ambil topic berdasarkan topic_id, return undefined jika tidak ada */
export function getTopicById(topicId: string): Topic | undefined {
  return CURRICULUM_MAP[topicId];
}
