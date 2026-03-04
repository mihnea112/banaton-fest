"use client";

import Link from "next/link";
import Image from "next/image";
// import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type NavbarProps = {
  active?: "acasa" | "bilete" | "none";
};

const LOCALE_COOKIE = "banaton_locale";

function setLocaleCookie(locale: "ro" | "en") {
  // 1 year, lax
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${name}=`));
  if (!match) return null;
  return decodeURIComponent(match.substring(name.length + 1));
}

function normalizeLocale(v: unknown): "ro" | "en" {
  return String(v).toLowerCase() === "en" ? "en" : "ro";
}

export default function Navbar({ active = "none" }: NavbarProps) {
  // const router = useRouter();
  // const pathname = usePathname();

  const [locale, setLocale] = useState<"ro" | "en">("ro");

  useEffect(() => {
    // Cookie is the source of truth
    const fromCookie = readCookie(LOCALE_COOKIE);
    if (fromCookie) {
      setLocale(normalizeLocale(fromCookie));
      return;
    }

    // Optional fallback for older sessions
    try {
      const fromStorage = window.localStorage.getItem(LOCALE_COOKIE);
      if (fromStorage) {
        const next = normalizeLocale(fromStorage);
        setLocale(next);
        setLocaleCookie(next);
        return;
      }
    } catch {
      // ignore
    }

    // Default to RO and persist
    setLocaleCookie("ro");
    setLocale("ro");
  }, []);

  const homeHref = `/`;
  const ticketsHref = `/tickets`;
  const contactHref = `/#contact`;

  const nextLocale: "ro" | "en" = locale === "ro" ? "en" : "ro";

  const handleToggleLocale = () => {
    const next = nextLocale;

    // Persist locale
    setLocaleCookie(next);
    try {
      window.localStorage.setItem(LOCALE_COOKIE, next);
    } catch {
      // ignore
    }

    // Update current component immediately
    setLocale(next);

    // IMPORTANT:
    // Many pages read the cookie only once on mount (useEffect([])) or are Server Components.
    // A hard reload guarantees the new cookie is used everywhere.
    try {
      const href = window.location.href;
      window.location.assign(href);
      return;
    } catch {
      // fallback
      window.location.reload();
      return;
    }
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-deep px-6 py-4 lg:px-10">
      <div className="flex items-center justify-between">
        <Link href={homeHref} className="flex items-center">
          <Image
            src="/images/logo.png"
            alt="Banaton Fest"
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        <div className="hidden flex-1 items-center justify-end gap-3 lg:flex">
          <nav className="flex items-center gap-9">
            <Link
              href={homeHref}
              className={
                active === "acasa"
                  ? "text-sm font-semibold text-accent-cyan"
                  : "text-sm font-medium text-brand-text transition-colors hover:text-accent-cyan"
              }
            >
              {locale === "ro" ? "Acasă" : "Home"}
            </Link>

            <Link
              href={ticketsHref}
              className={
                active === "bilete"
                  ? "text-sm font-semibold text-accent-cyan"
                  : "text-sm font-medium text-brand-text transition-colors hover:text-accent-cyan"
              }
            >
              {locale === "ro" ? "Bilete" : "Tickets"}
            </Link>

            <a
              href={contactHref}
              className="text-sm font-medium text-brand-text transition-colors hover:text-accent-cyan"
            >
              {locale === "ro" ? "Contact" : "Contact"}
            </a>
          </nav>

          <div className="flex items-center gap-3">
            <div
              className="inline-flex h-10 items-center rounded-full border border-accent-cyan/25 bg-[#0F0518]/40 p-1 shadow-[0_0_12px_rgba(0,229,255,0.12)]"
              role="group"
              aria-label={
                locale === "ro" ? "Selector limbă" : "Language selector"
              }
            >
              <button
                type="button"
                onClick={() => {
                  if (locale !== "ro") handleToggleLocale();
                }}
                className={
                  locale === "ro"
                    ? "h-8 rounded-full bg-accent-cyan px-3 text-xs font-extrabold text-brand-deep shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                    : "h-8 rounded-full px-3 text-xs font-bold text-brand-text/80 hover:text-brand-text"
                }
                aria-pressed={locale === "ro"}
              >
                RO
              </button>

              <button
                type="button"
                onClick={() => {
                  if (locale !== "en") handleToggleLocale();
                }}
                className={
                  locale === "en"
                    ? "h-8 rounded-full bg-accent-cyan px-3 text-xs font-extrabold text-brand-deep shadow-[0_0_12px_rgba(0,229,255,0.25)]"
                    : "h-8 rounded-full px-3 text-xs font-bold text-brand-text/80 hover:text-brand-text"
                }
                aria-pressed={locale === "en"}
              >
                EN
              </button>
            </div>

            <Link
              href={ticketsHref}
              className="flex h-10 min-w-[84px] items-center justify-center overflow-hidden rounded-xl bg-accent-cyan px-4 text-sm font-bold text-brand-deep shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-colors hover:bg-cyan-400"
            >
              <span>{locale === "ro" ? "Cumpără bilete" : "Buy tickets"}</span>
            </Link>
          </div>
        </div>

        <div className="lg:hidden flex items-center gap-2">
          <div
            className="inline-flex h-10 items-center rounded-full border border-accent-cyan/25 bg-[#0F0518]/40 p-1 shadow-[0_0_12px_rgba(0,229,255,0.12)]"
            role="group"
            aria-label={locale === "ro" ? "Selector limbă" : "Language selector"}
          >
            <button
              type="button"
              onClick={() => {
                if (locale !== "ro") handleToggleLocale();
              }}
              className={
                locale === "ro"
                  ? "h-8 rounded-full bg-accent-cyan px-3 text-[11px] font-extrabold text-brand-deep shadow-[0_0_10px_rgba(0,229,255,0.22)]"
                  : "h-8 rounded-full px-3 text-[11px] font-bold text-brand-text/80 hover:text-brand-text"
              }
              aria-pressed={locale === "ro"}
            >
              RO
            </button>

            <button
              type="button"
              onClick={() => {
                if (locale !== "en") handleToggleLocale();
              }}
              className={
                locale === "en"
                  ? "h-8 rounded-full bg-accent-cyan px-3 text-[11px] font-extrabold text-brand-deep shadow-[0_0_10px_rgba(0,229,255,0.22)]"
                  : "h-8 rounded-full px-3 text-[11px] font-bold text-brand-text/80 hover:text-brand-text"
              }
              aria-pressed={locale === "en"}
            >
              EN
            </button>
          </div>

          <Link
            href={ticketsHref}
            className="flex items-center justify-center rounded-xl bg-accent-cyan px-3 py-2 text-sm font-bold text-brand-deep shadow-[0_0_12px_rgba(0,240,255,0.25)]"
            aria-label={locale === "ro" ? "Cumpără bilete" : "Buy tickets"}
          >
            {locale === "ro" ? "Cumpără bilete" : "Buy tickets"}
          </Link>
        </div>
      </div>
    </header>
  );
}