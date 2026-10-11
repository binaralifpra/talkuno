import { 
  doc, 
  getDoc,
  getDocs, 
  collection, 
  query, 
  where, 
  orderBy, 
  limit, 
  runTransaction, 
  serverTimestamp,
  updateDoc,
  Timestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase";

export async function completeDayAndUpdateStreak(
  userId: string,
  dayNumber: number,
  selectedTakeId: string,
  selectedTakeUrl: string,
  allTakes: { id: string }[]
) {
  // 1. Ambil last completed day (di luar transaksi untuk meminimalkan waktu kunci/batasan query)
  const q = query(
    collection(db, "users", userId, "days"),
    where("status", "==", "completed"),
    orderBy("completed_at", "desc"),
    limit(1)
  );
  
  const snap = await getDocs(q);
  const lastCompletedDayRef = snap.empty ? null : doc(db, "users", userId, "days", snap.docs[0].id);

  const userRef = doc(db, "users", userId);
  const todayRef = doc(db, "users", userId, "days", String(dayNumber));
  const nextDayRef = dayNumber < 31 ? doc(db, "users", userId, "days", String(dayNumber + 1)) : null;

  await runTransaction(db, async (transaction) => {
    // === SEMUA BACA (READ) HARUS DILAKUKAN DI AWAL DALAM TRANSAKSI FIREBASE ===
    const userDoc = await transaction.get(userRef);
    if (!userDoc.exists()) throw new Error("User document does not exist");
    
    let lastCompletedData = null;
    if (lastCompletedDayRef) {
      const lastDoc = await transaction.get(lastCompletedDayRef);
      if (lastDoc.exists()) {
        lastCompletedData = lastDoc.data();
      }
    }

    let nextDayData = null;
    if (nextDayRef) {
      const nextDoc = await transaction.get(nextDayRef);
      if (nextDoc.exists()) {
        nextDayData = nextDoc.data();
      }
    }

    // 2. Hitung streak_current yang baru
    const userData = userDoc.data();
    const oldStreakCurrent = userData.streak_current ?? 0;
    const oldStreakLongest = userData.streak_longest ?? 0;

    let newStreakCurrent = 1;
    if (lastCompletedData && lastCompletedData.completed_at) {
      const lastCompletedAt = lastCompletedData.completed_at.toDate();
      const now = new Date();
      const diffHours = (now.getTime() - lastCompletedAt.getTime()) / (1000 * 60 * 60);

      if (diffHours < 48) {
        newStreakCurrent = oldStreakCurrent + 1;
      } else {
        newStreakCurrent = 1;
      }
    }

    // 3. Update streak_longest
    const newStreakLongest = newStreakCurrent > oldStreakLongest ? newStreakCurrent : oldStreakLongest;


    // === SEMUA TULIS (WRITE) HARUS DILAKUKAN DI AKHIR ===

    // 4. Update dokumen hari ini
    transaction.update(todayRef, {
      status: "completed",
      completed_at: serverTimestamp(),
      best_take_url: selectedTakeUrl
    });

    // (Update subkoleksi takes secara atomik dalam transaksi ini)
    for (const take of allTakes) {
      const takeRef = doc(db, "users", userId, "days", String(dayNumber), "takes", take.id);
      transaction.update(takeRef, {
        is_best: take.id === selectedTakeId
      });
    }

    // 5. Update dokumen user
    transaction.update(userRef, {
      streak_current: newStreakCurrent,
      streak_longest: newStreakLongest,
      streak_at_risk_until: null
    });

    // 6. Unlock hari berikutnya jika ada dan statusnya "locked"
    if (nextDayRef && nextDayData && nextDayData.status === "locked") {
      transaction.update(nextDayRef, {
        status: "unlocked"
      });
    }
  });
}

export async function checkStreakRisk(userId: string) {
  // 1. Ambil dokumen user
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return;

  const userData = userSnap.data();
  const currentStreak = userData.streak_current ?? 0;
  const currentRisk = userData.streak_at_risk_until;

  // 2. Kalau streak 0, hentikan function
  if (currentStreak === 0) return;

  // 3. Ambil hari terakhir completed
  const q = query(
    collection(db, "users", userId, "days"),
    where("status", "==", "completed"),
    orderBy("completed_at", "desc"),
    limit(1)
  );
  
  const snap = await getDocs(q);
  if (snap.empty) return; 
  
  const lastDay = snap.docs[0].data();
  if (!lastDay.completed_at) return;

  // 4. Hitung selisih waktu
  const lastCompletedAt = lastDay.completed_at.toDate();
  const now = new Date();
  const diffHours = (now.getTime() - lastCompletedAt.getTime()) / (1000 * 60 * 60);

  // 6. Kalau >= 48 jam (kadaluarsa)
  if (diffHours >= 48) {
    await updateDoc(userRef, {
      streak_current: 0,
      streak_at_risk_until: null
    });
  } 
  // 5. Kalau ANTARA 24 sampai 48 jam
  else if (diffHours > 24) { 
    if (!currentRisk) { // Kalau masih kosong
      const riskTime = new Date(lastCompletedAt.getTime() + 48 * 60 * 60 * 1000);
      await updateDoc(userRef, {
        streak_at_risk_until: Timestamp.fromDate(riskTime)
      });
    }
  } 
  // 7. Kalau KURANG dari 24 jam
  else { 
    if (currentRisk) { // Pastikan null
      await updateDoc(userRef, {
        streak_at_risk_until: null
      });
    }
  }
}
