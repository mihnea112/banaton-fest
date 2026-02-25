import Link from "next/link";

export default function Footer() {
  return (
    <footer
      id="contact"
      className="border-t border-white/10 bg-brand-deep"
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-4 py-10 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand */}
          <div>
            <div className="mb-3 flex items-center gap-3">
              <span className="material-symbols-outlined text-accent-cyan">
                festival
              </span>
              <h3 className="text-lg font-bold text-white">Banaton Fest</h3>
            </div>
            <p className="text-sm text-brand-text">
              Festival 4 zile · 29.05 – 01.06.2026
            </p>
            <p className="mt-2 text-sm text-brand-text/80">
              Bilete Acces General și VIP disponibile online.
            </p>
          </div>

          {/* Navigare */}
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
              Navigare
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/"
                  className="text-brand-text transition-colors hover:text-accent-cyan"
                >
                  Acasă
                </Link>
              </li>
              <li>
                <Link
                  href="/tickets"
                  className="text-brand-text transition-colors hover:text-accent-cyan"
                >
                  Bilete
                </Link>
              </li>
              <li>
                <a
                  href="#info"
                  className="text-brand-text transition-colors hover:text-accent-cyan"
                >
                  Informații
                </a>
              </li>
              <li>
                <a
                  href="#contact"
                  className="text-brand-text transition-colors hover:text-accent-cyan"
                >
                  Contact
                </a>
              </li>
            </ul>
          </div>

          {/* Suport */}
          <div>
            <h4 className="mb-3 text-sm font-semibold uppercase tracking-wider text-white">
              Suport
            </h4>
            <ul className="space-y-2 text-sm text-brand-text">
              <li>Email: suport@banatonfest.ro</li>
              <li>Program: Luni–Vineri, 10:00–18:00</li>
              <li>
                <a
                  href="#"
                  className="transition-colors hover:text-accent-cyan"
                >
                  Termeni și Condiții
                </a>
              </li>
              <li>
                <a
                  href="#"
                  className="transition-colors hover:text-accent-cyan"
                >
                  Politica de confidențialitate
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col items-start justify-between gap-3 border-t border-white/10 pt-4 text-xs text-brand-text/70 md:flex-row md:items-center">
          <p>© 2026 Banaton Fest. Toate drepturile rezervate.</p>
          <p>Platformă bilete • Acces General & VIP</p>
        </div>
      </div>
    </footer>
  );
}
