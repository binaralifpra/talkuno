"use client";

import { useState } from "react";
import { provisionNewUser } from "@/lib/provisionUser";
import { useAuth } from "@/context/AuthContext";

/**
 * Halaman debugging sementara.
 * Hapus file ini setelah user berhasil di-provision ulang.
 * Akses via: /dev/reprovision
 */
export default function ReprovisionPage() {
  const { user } = useAuth();
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReprovision() {
    if (!user) return;
    setLoading(true);
    setStatus("");
    try {
      await provisionNewUser(
        user.uid,
        user.displayName ?? user.email?.split("@")[0] ?? "User",
        user.email ?? ""
      );
      setStatus("✓ Berhasil! Sekarang buka /dashboard");
    } catch (e) {
      setStatus("Error: " + String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center flex-col gap-4 p-8"
      style={{ backgroundColor: "var(--color-talkuno-cream)" }}>
      <p style={{ fontFamily: "var(--font-heading)", fontSize: 18, color: "var(--color-talkuno-dark)" }}>
        Re-provision User Days
      </p>
      <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "rgba(43,36,32,0.5)" }}>
        UID: {user?.uid ?? "Belum login"}
      </p>
      <button
        onClick={handleReprovision}
        disabled={loading || !user}
        className="px-6 py-2.5 rounded-full text-white text-sm font-medium transition-opacity"
        style={{
          backgroundColor: "var(--color-talkuno-coral)",
          fontFamily: "var(--font-body)",
          opacity: loading ? 0.6 : 1,
        }}
      >
        {loading ? "Memproses…" : "Jalankan Provision Ulang"}
      </button>
      {status && (
        <p style={{ fontFamily: "var(--font-body)", fontSize: 13, color: "var(--color-talkuno-dark)" }}>
          {status}
        </p>
      )}
    </div>
  );
}
