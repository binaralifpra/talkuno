"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user === null) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Tampilkan layar kosong saat mengecek status auth
  if (loading) {
    return (
      <div
        className="min-h-screen"
        style={{ backgroundColor: "var(--color-talkuno-cream)" }}
      />
    );
  }

  // Jika belum login, jangan render children (redirect sedang berjalan)
  if (!user) return null;

  return <>{children}</>;
}
