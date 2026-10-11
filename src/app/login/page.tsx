"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  getAdditionalUserInfo,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { auth } from "@/lib/firebase";
import { provisionNewUser } from "@/lib/provisionUser";

function getErrorMessage(code: string): string {
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email atau password salah. Coba lagi.";
    case "auth/too-many-requests":
      return "Terlalu banyak percobaan. Tunggu sebentar lalu coba lagi.";
    case "auth/user-disabled":
      return "Akun ini dinonaktifkan.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return ""; // user menutup popup sendiri, tidak perlu tampilkan error
    case "auth/popup-blocked":
      return "Popup diblokir browser. Izinkan popup untuk melanjutkan.";
    default:
      return "Terjadi kesalahan. Coba lagi.";
  }
}

const googleProvider = new GoogleAuthProvider();

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(getErrorMessage(err.code));
      } else {
        setError("Terjadi kesalahan. Coba lagi.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError("");
    setGoogleLoading(true);

    try {
      const result = await signInWithPopup(auth, googleProvider);
      const additionalInfo = getAdditionalUserInfo(result);

      // Jika user baru (pertama kali login dengan Google), provision Firestore
      if (additionalInfo?.isNewUser) {
        const { uid, email, displayName } = result.user;
        await provisionNewUser(uid, displayName ?? "Pengguna Baru", email ?? "");
      }

      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof FirebaseError) {
        const msg = getErrorMessage(err.code);
        if (msg) setError(msg);
      } else {
        setError("Terjadi kesalahan. Coba lagi.");
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  const isBusy = loading || googleLoading;

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
            Latih percakapanmu setiap hari
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
            Masuk
          </h1>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="login-email"
                className="text-xs font-medium"
                style={{ fontFamily: "var(--font-body)", color: "rgba(43,36,32,0.6)" }}
              >
                Email
              </label>
              <input
                id="login-email"
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
                htmlFor="login-password"
                className="text-xs font-medium"
                style={{ fontFamily: "var(--font-body)", color: "rgba(43,36,32,0.6)" }}
              >
                Password
              </label>
              <input
                id="login-password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
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

            {/* Submit — aksi utama */}
            <button
              id="btn-login"
              type="submit"
              disabled={isBusy}
              className="w-full py-2.5 rounded-full text-sm font-medium text-white transition-opacity mt-1"
              style={{
                fontFamily: "var(--font-body)",
                backgroundColor: "var(--color-talkuno-coral)",
                opacity: isBusy ? 0.65 : 1,
                cursor: isBusy ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Sedang masuk…" : "Masuk"}
            </button>
          </form>

          {/* Divider */}
          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px" style={{ backgroundColor: "rgba(43,36,32,0.1)" }} />
            <span
              className="text-xs"
              style={{ fontFamily: "var(--font-body)", color: "rgba(43,36,32,0.35)" }}
            >
              atau
            </span>
            <div className="flex-1 h-px" style={{ backgroundColor: "rgba(43,36,32,0.1)" }} />
          </div>

          {/* Google — aksi sekunder (outline) */}
          <button
            id="btn-login-google"
            type="button"
            disabled={isBusy}
            onClick={handleGoogleLogin}
            className="w-full py-2.5 rounded-full text-sm font-medium flex items-center justify-center gap-2.5 border transition-colors"
            style={{
              fontFamily: "var(--font-body)",
              color: "var(--color-talkuno-dark)",
              borderColor: "rgba(43,36,32,0.18)",
              backgroundColor: "transparent",
              opacity: isBusy ? 0.65 : 1,
              cursor: isBusy ? "not-allowed" : "pointer",
            }}
            onMouseEnter={(e) => {
              if (!isBusy) e.currentTarget.style.backgroundColor = "rgba(43,36,32,0.04)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "transparent";
            }}
          >
            {/* Google "G" logo — SVG resmi Google */}
            <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
              <path fill="#4285F4" d="M47.5 24.6c0-1.6-.1-3.1-.4-4.6H24v8.7h13.2c-.6 3-2.3 5.5-4.9 7.2v6h7.9c4.6-4.2 7.3-10.5 7.3-17.3z"/>
              <path fill="#34A853" d="M24 48c6.6 0 12.2-2.2 16.2-6l-7.9-6c-2.2 1.5-5 2.3-8.3 2.3-6.4 0-11.8-4.3-13.7-10.1H2.1v6.2C6.1 42.6 14.4 48 24 48z"/>
              <path fill="#FBBC05" d="M10.3 28.2c-.5-1.5-.8-3-.8-4.6s.3-3.1.8-4.6v-6.2H2.1C.7 15.8 0 19.8 0 24s.7 8.2 2.1 11.2l8.2-7z"/>
              <path fill="#EA4335" d="M24 9.5c3.6 0 6.8 1.2 9.3 3.6l7-7C36.2 2.2 30.6 0 24 0 14.4 0 6.1 5.4 2.1 13.2l8.2 6.2C12.2 13.8 17.6 9.5 24 9.5z"/>
            </svg>
            {googleLoading ? "Menghubungkan…" : "Masuk dengan Google"}
          </button>
        </div>

        {/* Link ke signup */}
        <p
          className="mt-5 text-center text-sm"
          style={{ fontFamily: "var(--font-body)", color: "rgba(43,36,32,0.5)" }}
        >
          Belum punya akun?{" "}
          <Link
            href="/signup"
            className="font-medium transition-opacity hover:opacity-75"
            style={{ color: "var(--color-talkuno-coral)" }}
          >
            Daftar
          </Link>
        </p>
      </div>
    </div>
  );
}
