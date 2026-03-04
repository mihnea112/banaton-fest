"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type Lang = "ro" | "en";

function readLang(): Lang {
  // Check documentElement attributes and dataset first
  try {
    const docLang =
      document.documentElement.getAttribute("lang") ||
      document.documentElement.getAttribute("data-lang") ||
      document.documentElement.dataset.lang;
    const docLangLower = (docLang || "").toLowerCase();
    if (docLangLower === "en" || docLangLower === "ro") return docLangLower as Lang;
  } catch {
    // ignore
  }

  // Try localStorage first (client-only), then cookies.
  try {
    const ls = window.localStorage;
    const v =
      ls.getItem("banaton_lang") ||
      ls.getItem("banatonLang") ||
      ls.getItem("lang") ||
      ls.getItem("locale");
    const vv = (v || "").toLowerCase();
    if (vv === "en" || vv === "ro") return vv as Lang;
  } catch {
    // ignore
  }

  try {
    const cookie = document.cookie || "";
    const pick = (name: string) => {
      const m = cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
      return m ? decodeURIComponent(m[1] || "") : "";
    };
    const v =
      pick("banaton_lang") ||
      pick("banatonLang") ||
      pick("lang") ||
      pick("locale");
    const vv = (v || "").toLowerCase();
    if (vv === "en" || vv === "ro") return vv as Lang;
  } catch {
    // ignore
  }

  return "ro";
}

export default function Footer() {
  const [lang, setLang] = useState<Lang>("ro");

  useEffect(() => {
    // Initial read
    setLang(readLang());

    // Keep in sync across tabs
    const onStorage = (e: StorageEvent) => {
      if (!e.key) return;
      if (
        e.key === "banaton_lang" ||
        e.key === "banatonLang" ||
        e.key === "lang" ||
        e.key === "locale"
      ) {
        setLang(readLang());
      }
    };
    window.addEventListener("storage", onStorage);

    // Also refresh on focus (helps when toggle only writes cookie)
    const onFocus = () => setLang(readLang());
    window.addEventListener("focus", onFocus);

    // Refresh on visibility change when tab becomes visible
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        setLang(readLang());
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    // Listen for custom event 'banaton:lang'
    const onCustomLangEvent = () => setLang(readLang());
    window.addEventListener("banaton:lang", onCustomLangEvent);

    // MutationObserver for lang and data-lang attribute changes on documentElement
    const observer = new MutationObserver(() => {
      setLang(readLang());
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["lang", "data-lang"],
    });

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("banaton:lang", onCustomLangEvent);
      observer.disconnect();
    };
  }, []);

  const t = useMemo(() => {
    const isEN = lang === "en";
    return {
      brand: "Banaton Fest",
      dates: isEN
        ? "4-day festival · 29.05 – 01.06.2026"
        : "Festival 4 zile · 29.05 – 01.06.2026",
      tagline: isEN
        ? "Fan Pit and VIP tickets available online."
        : "Bilete Fan Pit și VIP disponibile online.",

      navTitle: isEN ? "Navigation" : "Navigare",
      home: isEN ? "Home" : "Acasă",
      tickets: isEN ? "Tickets" : "Bilete",
      contact: isEN ? "Contact" : "Contact",

      supportTitle: isEN ? "Support" : "Suport",
      supportEmailLabel: isEN ? "Email" : "Email",
      supportHours: isEN
        ? "Hours: Mon–Fri, 10:00–18:00"
        : "Program: Luni–Vineri, 10:00–18:00",
      terms: isEN ? "Terms & Conditions" : "Termeni și Condiții",
      privacy: isEN ? "Privacy Policy" : "Politica de confidențialitate",

      copyright: isEN
        ? "© 2026 Banaton Fest. All rights reserved."
        : "© 2026 Banaton Fest. Toate drepturile rezervate.",
      platform: isEN
        ? "Ticketing platform • Fan Pit & VIP"
        : "Platformă bilete • Fan Pit & VIP",
    };
  }, [lang]);

  return (
    <footer id="contact" className="border-t border-white/10 bg-brand-deep">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-accent-cyan">
                festival
              </span>
              <h3 className="text-lg font-bold text-white">{t.brand}</h3>
            </div>
            <p className="text-sm text-brand-text">{t.dates}</p>
            <p className="mt-2 text-sm text-brand-text/80">{t.tagline}</p>
          </div>

          {/* Navigare */}
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
              {t.navTitle}
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-brand-text transition-colors hover:text-accent-cyan"
                >
                  {t.home}
                </Link>
              </li>
              <li>
                <Link
                  href="/tickets"
                  className="text-brand-text transition-colors hover:text-accent-cyan"
                >
                  {t.tickets}
                </Link>
              </li>
              <li>
                <a
                  href="#contact"
                  className="text-brand-text transition-colors hover:text-accent-cyan"
                >
                  {t.contact}
                </a>
              </li>
            </ul>
          </div>

          {/* Suport */}
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
              {t.supportTitle}
            </h4>
            <ul className="space-y-2 text-sm text-brand-text">
              <li>
                {t.supportEmailLabel}: <span className="text-brand-text">office.banaton@gmail.com</span>
              </li>
              <li>{t.supportHours}</li>
              <li>
                <a href="#" className="transition-colors hover:text-accent-cyan">
                  {t.terms}
                </a>
              </li>
              <li>
                <a href="#" className="transition-colors hover:text-accent-cyan">
                  {t.privacy}
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-4 text-xs text-brand-text/70 md:flex-row md:items-center">
          <p>{t.copyright}</p>
          <p>{t.platform}</p>
        </div>
      </div>
    </footer>
  );
}
