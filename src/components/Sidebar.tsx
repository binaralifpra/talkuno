"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "firebase/auth";
import {
  IconHome,
  IconCalendar,
  IconHistory,
  IconSettings,
  IconChevronLeft,
  IconChevronRight,
  IconLogout,
  IconUser,
} from "@tabler/icons-react";
import { auth } from "@/lib/firebase";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Beranda",     Icon: IconHome },
  { href: "/kalender",  label: "Kalender",    Icon: IconCalendar },
  { href: "/riwayat",   label: "Riwayat",     Icon: IconHistory },
  { href: "/pengaturan",label: "Pengaturan",  Icon: IconSettings },
];

function getInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "U";
}

export default function Sidebar() {
  const [collapsed, setCollapsed] = useState(true);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const pathname  = usePathname();
  const router    = useRouter();
  const { user }  = useAuth();

  const popoverRef = useRef<HTMLDivElement>(null);
  const avatarRef  = useRef<HTMLButtonElement>(null);

  // Close popover on outside click
  const handleOutsideClick = useCallback((e: MouseEvent) => {
    if (
      popoverRef.current?.contains(e.target as Node) ||
      avatarRef.current?.contains(e.target as Node)
    ) return;
    setPopoverOpen(false);
  }, []);

  useEffect(() => {
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [handleOutsideClick]);

  async function handleLogout() {
    setPopoverOpen(false);
    await signOut(auth);
    router.replace("/login");
  }

  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "Pengguna";
  const email       = user?.email ?? "";
  const initials    = getInitials(displayName);

  const W = collapsed ? 72 : 220;

  return (
    <aside
      style={{
        width: W,
        minWidth: W,
        backgroundColor: "var(--color-talkuno-dark)",
        transition: "width 240ms cubic-bezier(0.4,0,0.2,1), min-width 240ms cubic-bezier(0.4,0,0.2,1)",
      }}
      className="relative flex flex-col min-h-screen shrink-0 overflow-visible"
    >
      {/* ── Top: Logo + Toggle ─────────────────────────────────── */}
      <div
        className="flex items-center px-3"
        style={{
          height: 68,
          gap: 8,
          justifyContent: collapsed ? "center" : "space-between",
        }}
      >
        {/* Logo mark + wordmark */}
        <div className="flex items-center gap-2.5 min-w-0">
          {/* Coral square "T" */}
          <div
            className="flex items-center justify-center rounded-lg shrink-0"
            style={{
              width: 36,
              height: 36,
              backgroundColor: "var(--color-talkuno-coral)",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              color: "#fff",
              fontSize: 17,
              letterSpacing: "-0.01em",
            }}
            aria-hidden="true"
          >
            T
          </div>

          {/* Wordmark — fade in/out */}
          <span
            style={{
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              color: "#fff",
              fontSize: 15,
              whiteSpace: "nowrap",
              overflow: "hidden",
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : "auto",
              transition: "opacity 180ms ease, width 180ms ease",
              pointerEvents: collapsed ? "none" : "auto",
            }}
          >
            Talkuno
          </span>
        </div>

        {/* Toggle chevron button */}
        <button
          onClick={() => setCollapsed((c) => !c)}
          className="flex items-center justify-center rounded-full shrink-0 transition-colors"
          style={{
            width: 28,
            height: 28,
            color: "rgba(255,255,255,0.4)",
            backgroundColor: "transparent",
            // When collapsed, chevron floats — keep it always visible
            flexShrink: 0,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.08)";
            e.currentTarget.style.color = "#fff";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "rgba(255,255,255,0.4)";
          }}
          aria-label={collapsed ? "Lebarkan sidebar" : "Ciutkan sidebar"}
        >
          {collapsed
            ? <IconChevronRight size={15} stroke={2.2} />
            : <IconChevronLeft  size={15} stroke={2.2} />
          }
        </button>
      </div>

      {/* ── Nav items ──────────────────────────────────────────── */}
      <nav className="flex flex-col gap-0.5 px-2.5 flex-1 pt-1">
        {NAV_ITEMS.map(({ href, label, Icon }) => {
          const isActive = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className="flex items-center rounded-full transition-colors"
              style={{
                height: 44,
                paddingLeft:  collapsed ? 0 : 12,
                paddingRight: collapsed ? 0 : 12,
                justifyContent: collapsed ? "center" : "flex-start",
                gap: 10,
                backgroundColor: isActive
                  ? "var(--color-talkuno-coral)"
                  : "transparent",
                color: isActive ? "#fff" : "rgba(255,255,255,0.48)",
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)";
                  e.currentTarget.style.color = "#fff";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "rgba(255,255,255,0.48)";
                }
              }}
            >
              <Icon size={20} stroke={isActive ? 2 : 1.75} />

              <span
                style={{
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                  fontWeight: 500,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  opacity: collapsed ? 0 : 1,
                  width: collapsed ? 0 : "auto",
                  transition: "opacity 160ms ease, width 160ms ease",
                  pointerEvents: "none",
                }}
              >
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* ── Bottom: Avatar ─────────────────────────────────────── */}
      <div className="px-2.5 pb-5 relative">
        {/* Avatar button */}
        <button
          ref={avatarRef}
          id="sidebar-avatar-btn"
          onClick={() => setPopoverOpen((p) => !p)}
          className="flex items-center rounded-full w-full transition-colors"
          style={{
            height: 48,
            paddingLeft:  collapsed ? 0 : 8,
            paddingRight: collapsed ? 0 : 8,
            gap: 10,
            justifyContent: collapsed ? "center" : "flex-start",
            backgroundColor: popoverOpen
              ? "rgba(255,255,255,0.1)"
              : "transparent",
          }}
          onMouseEnter={(e) => {
            if (!popoverOpen)
              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.07)";
          }}
          onMouseLeave={(e) => {
            if (!popoverOpen)
              e.currentTarget.style.backgroundColor = "transparent";
          }}
          aria-label="Menu akun"
          aria-haspopup="true"
          aria-expanded={popoverOpen}
        >
          {/* Initials avatar */}
          <div
            className="flex items-center justify-center rounded-full shrink-0"
            style={{
              width: 34,
              height: 34,
              backgroundColor: "rgba(255,255,255,0.14)",
              fontFamily: "var(--font-heading)",
              fontWeight: 600,
              fontSize: 13,
              color: "#fff",
              letterSpacing: "0.02em",
            }}
            aria-hidden="true"
          >
            {initials}
          </div>

          {/* Name — only expanded */}
          <span
            style={{
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 500,
              color: "rgba(255,255,255,0.75)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              opacity: collapsed ? 0 : 1,
              width: collapsed ? 0 : "auto",
              maxWidth: 110,
              transition: "opacity 160ms ease, width 160ms ease",
              pointerEvents: "none",
            }}
          >
            {displayName}
          </span>
        </button>

        {/* ── Popover menu ─────────────────────────────────────── */}
        {popoverOpen && (
          <div
            ref={popoverRef}
            role="menu"
            className="absolute z-50 rounded-xl overflow-hidden"
            style={{
              bottom: 56,
              left: collapsed ? 80 : 16,
              width: 210,
              backgroundColor: "#fff",
              boxShadow: "0 8px 28px rgba(43,36,32,0.14), 0 2px 8px rgba(43,36,32,0.06)",
            }}
          >
            {/* User info header */}
            <div
              className="px-4 py-3"
              style={{ borderBottom: "1px solid rgba(43,36,32,0.07)" }}
            >
              <p
                className="text-sm truncate"
                style={{
                  fontFamily: "var(--font-heading)",
                  fontWeight: 600,
                  color: "var(--color-talkuno-dark)",
                }}
              >
                {displayName}
              </p>
              <p
                className="text-xs truncate mt-0.5"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "rgba(43,36,32,0.42)",
                }}
              >
                {email}
              </p>
            </div>

            {/* Profil & Pengaturan */}
            <div className="py-1">
              <Link
                href="/profil"
                role="menuitem"
                onClick={() => setPopoverOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-talkuno-dark)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "rgba(43,36,32,0.04)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <IconUser size={15} stroke={1.75} />
                Profil
              </Link>

              <Link
                href="/pengaturan"
                role="menuitem"
                onClick={() => setPopoverOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "var(--color-talkuno-dark)",
                  textDecoration: "none",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "rgba(43,36,32,0.04)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <IconSettings size={15} stroke={1.75} />
                Pengaturan
              </Link>
            </div>

            {/* Separator + Keluar */}
            <div
              className="py-1"
              style={{ borderTop: "1px solid rgba(43,36,32,0.07)" }}
            >
              <button
                id="sidebar-logout-btn"
                role="menuitem"
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm transition-colors"
                style={{
                  fontFamily: "var(--font-body)",
                  color: "#D94F3D",
                  backgroundColor: "transparent",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.backgroundColor = "rgba(217,79,61,0.06)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.backgroundColor = "transparent")
                }
              >
                <IconLogout size={15} stroke={1.75} />
                Keluar
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
