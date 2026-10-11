import {
  doc,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { CURRICULUM } from "@/lib/curriculum";

/**
 * Provision Firestore data untuk user baru.
 *
 * Menggunakan data kurikulum LOKAL (src/lib/curriculum.ts) —
 * tidak ada read ke koleksi "topics" di Firestore.
 * Semua writes dalam satu batch atomik (user doc + 31 days).
 */
export async function provisionNewUser(
  uid: string,
  name: string,
  email: string
): Promise<void> {
  // Satu batch atomik: user doc + 31 days
  // Max Firestore batch: 500 ops — 32 writes = aman
  const batch = writeBatch(db);

  // User document
  batch.set(doc(db, "users", uid), {
    name,
    email,
    current_level: 1,
    streak_current: 0,
    streak_longest: 0,
    streak_at_risk_until: null,
    default_prep_seconds: 5,
    created_at: serverTimestamp(),
  });

  // 31 day documents menggunakan data kurikulum lokal
  CURRICULUM.forEach((topic, index) => {
    const dayRef = doc(db, "users", uid, "days", String(topic.day_number));
    batch.set(dayRef, {
      day_number: topic.day_number,
      topic_id: `day-${topic.day_number}`,   // konsisten dengan CURRICULUM_MAP key
      status: index === 0 ? "unlocked" : "locked",
      best_take_url: null,
      completed_at: null,
    });
  });

  await batch.commit();
}
