"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";
import { provisionNewUser } from "@/lib/provisionUser";

function getErrorMessage(code: string): string {
  switch (code) {
    case "auth/email-already-in-use":
      return "Email ini sudah terdaftar. Coba masuk.";
    case "auth/invalid-email":
      return "Format email tidak valid.";
    case "auth/weak-password":
      return "Password terlalu lemah. Gunakan minimal 6 karakter.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
    default:
      return "Terjadi kesalahan. Coba lagi.";
  }
}

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Step 1: Buat akun Firebase Auth
      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const uid = credential.user.uid;

      // Step 2: Provision Firestore (atomic batch: user doc + 31 days)
      // Kalau ini gagal, error akan ter-catch di bawah dan ditampilkan ke user.
      // Akun Auth sudah terbuat, tapi user bisa coba lagi lewat halaman provision.
      try {
        await provisionNewUser(uid, name.trim(), email);
      } catch (provisionErr) {
        const errObj = provisionErr as { code?: string; message?: string };

        if (errObj?.code === "topics/not-seeded") {
          setError("Kurikulum belum tersedia. Hubungi administrator untuk setup awal.");
        } else if (
          errObj instanceof FirebaseError &&
          errObj.code === "permission-denied"
        ) {
          setError(
            "Izin akses Firestore ditolak. Pastikan Security Rules sudah di-deploy di Firebase Console."
          );
        } else {
          console.error("[provisionNewUser] error:", provisionErr);
          setError(
            "Akun berhasil dibuat, tapi data kurikulum gagal dimuat. " +
            "Buka /dev/reprovision untuk mencoba ulang."
          );
        }
        setLoading(false);
        return; // Jangan redirect jika provision gagal
      }

      // Provision sukses → ke dashboard
      router.replace("/dashboard");
    } catch (err) {
      // Error dari createUserWithEmailAndPassword
      if (err instanceof FirebaseError) {
        setError(getErrorMessage(err.code));
      } else {
        console.error("[signup] unexpected error:", err);
        setError("Terjadi kesalahan. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }


  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ backgroundColor: "var(--color-talkuno-cream)" }}
    >
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 text-center">
          <span
            className="text-3xl"
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              color: "var(--color-talkuno-coral)",
            }}
          >
            Talkuno
          </span>
          <p
            className="mt-1 text-sm"
            style={{
              fontFamily: "var(--font-body)",
              color: "rgba(43,36,32,0.5)",
            }}
          >
            Mulai perjalanan 31 harimu
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl px-6 py-8"
          style={{ backgroundColor: "#fff", boxShadow: "0 2px 16px rgba(43,36,32,0.08)" }}
        >
          <h1
            className="text-xl mb-6"
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              color: "var(--color-talkuno-dark)",
            }}
          >
            Buat Akun
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Nama */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="signup-name"
                className="text-xs font-medium"
                style={{ fontFamily: "var(--font-body)", color: "rgba(43,36,32,0.6)" }}
              >
                Nama
              </label>
              <input
                id="signup-name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama kamu"
                className="w-full px-4 py-2.5 rounded-full border text-sm outline-none transition-colors"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-talkuno-dark)",
                  borderColor: "rgba(43,36,32,0.15)",
                  backgroundColor: "var(--color-talkuno-cream)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-talkuno-coral)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(43,36,32,0.15)")
                }
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="signup-email"
                className="text-xs font-medium"
                style={{ fontFamily: "var(--font-body)", color: "rgba(43,36,32,0.6)" }}
              >
                Email
              </label>
              <input
                id="signup-email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="kamu@email.com"
                className="w-full px-4 py-2.5 rounded-full border text-sm outline-none transition-colors"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-talkuno-dark)",
                  borderColor: "rgba(43,36,32,0.15)",
                  backgroundColor: "var(--color-talkuno-cream)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-talkuno-coral)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(43,36,32,0.15)")
                }
              />
            </div>

            {/* Password */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="signup-password"
                className="text-xs font-medium"
                style={{ fontFamily: "var(--font-body)", color: "rgba(43,36,32,0.6)" }}
              >
                Password
              </label>
              <input
                id="signup-password"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-4 py-2.5 rounded-full border text-sm outline-none transition-colors"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-talkuno-dark)",
                  borderColor: "rgba(43,36,32,0.15)",
                  backgroundColor: "var(--color-talkuno-cream)",
                }}
                onFocus={(e) =>
                  (e.currentTarget.style.borderColor = "var(--color-talkuno-coral)")
                }
                onBlur={(e) =>
                  (e.currentTarget.style.borderColor = "rgba(43,36,32,0.15)")
                }
              />
            </div>

            {/* Error */}
            {error && (
              <p
                className="text-xs text-center"
                style={{ fontFamily: "var(--font-body)", color: "#c0392b" }}
              >
                {error}
              </p>
            )}

            {/* Submit */}
            <button
              id="btn-signup"
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-full text-sm font-medium text-white transition-opacity mt-1"
              style={{
                fontFamily: "var(--font-body)",
                backgroundColor: "var(--color-talkuno-coral)",
                opacity: loading ? 0.65 : 1,
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Membuat akun…" : "Daftar"}
            </button>
          </form>
        </div>

        {/* Link ke login */}
        <p
          className="mt-5 text-center text-sm"
          style={{ fontFamily: "var(--font-body)", color: "rgba(43,36,32,0.5)" }}
        >
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium transition-opacity hover:opacity-75"
            style={{ color: "var(--color-talkuno-coral)" }}
          >
            Masuk
          </Link>
        </p>
      </div>
    </div>
  );
}
