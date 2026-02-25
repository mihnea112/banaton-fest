"use client";

import Link from "next/link";
import Image from "next/image";

type NavbarProps = {
  active?: "acasa" | "bilete" | "none";
};

export default function Navbar({ active = "none" }: NavbarProps) {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-brand-deep px-6 py-4 lg:px-10">
      <div className="flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <Image
            src="/images/logo.png"
            alt="Banaton Fest"
            width={140}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
        </Link>

        <div className="hidden flex-1 items-center justify-end gap-8 lg:flex">
          <nav className="flex items-center gap-9">
            <Link
              href="/"
              className={
                active === "acasa"
                  ? "text-sm font-semibold text-accent-cyan"
                  : "text-sm font-medium text-brand-text transition-colors hover:text-accent-cyan"
              }
            >
              Acasă
            </Link>

            <Link
              href="/tickets"
              className={
                active === "bilete"
                  ? "text-sm font-semibold text-accent-cyan"
                  : "text-sm font-medium text-brand-text transition-colors hover:text-accent-cyan"
              }
            >
              Bilete
            </Link>

            <a
              href="#contact"
              className="text-sm font-medium text-brand-text transition-colors hover:text-accent-cyan"
            >
              Contact
            </a>
          </nav>

          <div className="flex gap-2">
            <Link
              href="/tickets"
              className="flex h-10 min-w-[84px] items-center justify-center overflow-hidden rounded-xl bg-accent-cyan px-4 text-sm font-bold text-brand-deep shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-colors hover:bg-cyan-400"
            >
              <span>Cumpără bilete</span>
            </Link>
          </div>
        </div>

        <Link
          href="/tickets"
          className="lg:hidden flex items-center justify-center rounded-xl bg-accent-cyan px-3 py-2 text-sm font-bold text-brand-deep shadow-[0_0_12px_rgba(0,240,255,0.25)]"
          aria-label="Cumpără bilete"
        >
          Cumpără bilete
        </Link>
      </div>
    </header>
  );
}