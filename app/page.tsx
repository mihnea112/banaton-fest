"use client";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useEffect } from "react";

export default function Home() {
  const [selectedProgramDay, setSelectedProgramDay] = useState<"vineri" | "sambata" | "duminica" | "luni">("vineri");

  type Lang = "ro" | "en";
  const [lang, setLang] = useState<Lang>("ro");

  // Helper to read a cookie by name
  function readCookie(name: string): string | null {
    if (typeof document === "undefined") return null;
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? decodeURIComponent(match[2]) : null;
  }
  // Helper to normalize language string
  function normalizeLang(v: string | null): Lang | null {
    if (!v) return null;
    v = v.toLowerCase();
    if (v === "ro" || v.startsWith("ro")) return "ro";
    if (v === "en" || v.startsWith("en")) return "en";
    return null;
  }

  useEffect(() => {
    let found: string | null = null;
    found = readCookie("banaton_lang");
    if (!found) found = readCookie("banaton_locale");
    if (!found && typeof localStorage !== "undefined") {
      found = localStorage.getItem("banaton_lang");
      if (!found) found = localStorage.getItem("banaton_locale");
      if (!found) found = localStorage.getItem("locale");
    }
    const norm = normalizeLang(found);
    setLang(norm || "ro");
  }, []);

  const M = {
    ro: {
      hero_badge: "29.05–01.06.2026 • Timișoara • Locația ELBA, str. Gării nr. 1",
      hero_title_prefix: "Banaton",
      hero_title_highlight: "Fest",
      hero_subtitle: "Festival de 4 zile în centrul Timișoarei: awards, concert exclusiv CECA, folclor simfonic și chitară/rock balcanic într-o singură experiență.",
      cta_buy_tickets: "Cumpără bilete",
      cta_view_program: "Vezi programul",
      cta_aftermovie: "Vezi aftermovie",
      concept_title: "Conceptul Festivalului 2026",
      concept_body: "Banaton Fest 2026 aduce un format extins pe 4 zile, cu seri tematice dedicate muzicii balcanice, pop-folk, folclorului simfonic și rockului. Evenimentul are loc în centrul Timișoarei și reunește artiști invitați, orchestră și show-uri exclusive.",
      concept_stats_days_label: "Zile de Festival",
      concept_stats_edition_label: "Ediție Nouă",
      program_kicker: "29.05 - 01.06.2026",
      program_title: "Programul Festivalului",
      program_subtitle: "Patru seri speciale în Centrul Timișoara, fiecare cu identitate proprie.",
      program_stage_label: "Main Stage",
      program_day_label: "Ziua",
      prices_kicker: "Prețuri bilete",
      prices_title: "Early Bird Tickets - Limitat",
      prices_buy_now: "Cumpără acum",
      prices_fanpit: "Fan Pit",
      prices_vip: "VIP",
      prices_pack_4days: "Pachet 4 zile",
      prices_single_day: "Bilet simplu / zi (Vineri, Duminică, Luni)",
      prices_sat_ceca: "Bilet Sâmbătă - Concert CECA",
      prices_2day: "Bilete pentru 2 zile (Vineri/Duminică/Luni)",
      prices_3day: "Bilete pentru 3 zile (Vineri + Duminică + Luni)",
      prices_vip_single: "VIP / persoană / zi (Vineri, Duminică, Luni)",
      prices_vip_sat: "VIP Concert CECA (sâmbătă)",
      prices_vip_4days: "VIP 4 zile",
      prices_vip_note: "Pentru VIP se selectează masa în pasul VIP (înainte de checkout).",
      attention_title: "Atenție!!!",
      attention_location: "Locația: ELBA, str. Gării nr. 1, Timișoara",
    },
    en: {
      hero_badge: "May 29–June 1, 2026 • Timișoara • ELBA Venue, 1 Gării Street",
      hero_title_prefix: "Banaton",
      hero_title_highlight: "Fest",
      hero_subtitle: "4-day festival in central Timișoara: awards, exclusive CECA show, symphonic folk and Balkan rock — all in one experience.",
      cta_buy_tickets: "Buy Tickets",
      cta_view_program: "View Program",
      cta_aftermovie: "Watch Aftermovie",
      concept_title: "2026 Festival Concept",
      concept_body: "Banaton Fest 2026 expands to 4 days, with themed nights dedicated to Balkan music, pop-folk, symphonic folklore, and rock. The event takes place in central Timișoara, bringing together invited artists, orchestra, and exclusive shows.",
      concept_stats_days_label: "Festival Days",
      concept_stats_edition_label: "New Edition",
      program_kicker: "May 29 - June 1, 2026",
      program_title: "Festival Program",
      program_subtitle: "Four special evenings in central Timișoara, each with its own identity.",
      program_stage_label: "Main Stage",
      program_day_label: "Day",
      prices_kicker: "Ticket Prices",
      prices_title: "Early Bird Tickets - Limited",
      prices_buy_now: "Buy Now",
      prices_fanpit: "Fan Pit",
      prices_vip: "VIP",
      prices_pack_4days: "4-Day Pack",
      prices_single_day: "Single Day Ticket (Fri, Sun, Mon)",
      prices_sat_ceca: "Saturday Ticket – CECA Concert",
      prices_2day: "2-Day Tickets (Fri/Sun/Mon)",
      prices_3day: "3-Day Tickets (Fri + Sun + Mon)",
      prices_vip_single: "VIP / person / day (Fri, Sun, Mon)",
      prices_vip_sat: "VIP CECA Concert (Saturday)",
      prices_vip_4days: "VIP 4 Days",
      prices_vip_note: "VIP tickets require table selection in the VIP step before checkout.",
      attention_title: "Attention!!!",
      attention_location: "Location: ELBA Venue, 1 Gării Street, Timișoara",
    },
  } as const;

  const t = M[lang];

  type ProgramDay = {
    id: "vineri" | "sambata" | "duminica" | "luni";
    tabLabel: string;
    tabLabelEn?: string;
    tabDate: string;
    badge: string;
    badgeEn?: string;
    time: string;
    stage: string;
    icon: string;
    artistImage: string;
    title: string;
    titleEn?: string;
    subtitle: string;
    subtitleEn?: string;
    accent: "gold" | "cyan";
    ctaLabel: string;
    ctaLabelEn?: string;
    tag?: string;
    tagEn?: string;
    imageFit?: "cover" | "contain";
  };

  const programDays: ProgramDay[] = [
    {
      id: "vineri",
      tabLabel: lang === "en" ? "Friday" : "Vineri",
      tabDate: "29.05",
      badge: lang === "en" ? "Day 1 • Friday" : "Ziua 1 • Vineri",
      time: "18:00",
      stage: t.program_stage_label,
      icon: "emoji_events",
      artistImage: "/images/orchestra-rts.jpeg",
      imageFit: "cover",
      title: lang === "en" ? "Balkan Folk Pop Music Awards" : "Balkan Folk Pop Music Awards",
      subtitle:
        lang === "en"
          ? "RTS Orchestra and winners. Official festival opening gala night."
          : "Orchestra RTS și câștigători. Deschiderea oficială a festivalului cu o seară de gală.",
      accent: "gold",
      ctaLabel: lang === "en" ? "Reserve Seat" : "Rezervă loc",
    },
    {
      id: "sambata",
      tabLabel: lang === "en" ? "Saturday" : "Sâmbătă",
      tabDate: "30.05",
      badge: lang === "en" ? "Day 2 • Saturday" : "Ziua 2 • Sâmbătă",
      time: "18:00",
      stage: t.program_stage_label,
      icon: "mic",
      artistImage: "/images/ceca.jpg",
      imageFit: "contain",
      title: lang === "en" ? "Concert The Icon – CECA" : "Concert The Icon – CECA",
      subtitle:
        lang === "en"
          ? "Special concert with CECA, festival headliner."
          : "Concert special cu CECA, cap de afiș al ediției.",
      accent: "cyan",
      ctaLabel: lang === "en" ? "CECA Tickets" : "Bilete CECA",
      tag: lang === "en" ? "Exclusive Show" : "Exclusive Show",
    },
    {
      id: "duminica",
      tabLabel: lang === "en" ? "Sunday" : "Duminică",
      tabDate: "31.05",
      badge: lang === "en" ? "Day 3 • Sunday" : "Ziua 3 • Duminică",
      time: "18:00",
      stage: t.program_stage_label,
      icon: "music_note",
      artistImage: "/images/zvonko-bogdan.jpeg",
      imageFit: "cover",
      title:
        lang === "en"
          ? "Banaton Tradition – Roots & Identity"
          : "Banaton Tradițional - Rădăcini și Identitate",
      subtitle:
        lang === "en"
          ? "Zvonko Bogdan and guests in a show of tradition and emotion."
          : "Zvonko Bogdan și invitați într-un spectacol de tradiție și emoție.",
      accent: "cyan",
      ctaLabel: lang === "en" ? "Reserve Seat" : "Rezervă loc",
      tag: lang === "en" ? "Symphonic Folk" : "Folclor Simfonic",
    },
    {
      id: "luni",
      tabLabel: lang === "en" ? "Monday" : "Luni",
      tabDate: "01.06",
      badge: lang === "en" ? "Day 4 • Monday" : "Ziua 4 • Luni",
      time: "17:00",
      stage: t.program_stage_label,
      icon: "bolt",
      artistImage: "/images/elektricni-orgazam.jpg",
      imageFit: "cover",
      title: lang === "en" ? "Banaton Rock Guitar Night" : "Banaton Chitariada Rock",
      subtitle:
        lang === "en"
          ? "ELEKTRIČNI ORGAZAM from Belgrade and other guests."
          : "ELEKTRIČNI ORGAZAM din Belgrad și alți invitați.",
      accent: "cyan",
      ctaLabel: lang === "en" ? "Reserve Seat" : "Rezervă loc",
      tag: lang === "en" ? "Balkan Rock" : "Rock Balkanic",
    },
  ];

  const [programImageErrors, setProgramImageErrors] = useState<Record<string, boolean>>({});

  const activeProgram =
    programDays.find((day) => day.id === selectedProgramDay) ?? programDays[0];

  const activeProgramImageFailed = useMemo(() => {
    if (!activeProgram?.artistImage) return true;
    return !!programImageErrors[activeProgram.id];
  }, [activeProgram, programImageErrors]);

  // SEO constants and JSON-LD objects
  const SITE_URL = "https://banaton-fest.vercel.app";
  const TITLE =
    lang === "en"
      ? "Banaton Fest 2026 – Festival in Timișoara (May 29–June 1, 2026)"
      : "Banaton Fest 2026 – Festival în Timișoara (29.05–01.06.2026)";
  const DESCRIPTION =
    lang === "en"
      ? "Banaton Fest 2026: 4 days in central Timișoara — Awards, exclusive CECA show, symphonic folk and Balkan rock. Fan Pit & VIP tickets."
      : "Banaton Fest 2026: 4 zile în centrul Timișoarei – Awards, concert exclusiv CECA, folclor simfonic și rock balcanic. Bilete Acces General & VIP.";
  const CANONICAL = `${SITE_URL}/`;
  const OG_IMAGE = `${SITE_URL}/images/logo.png`;

  const eventJsonLd = {
    "@context": "https://schema.org",
    "@type": "Event",
    name: "Banaton Fest 2026",
    description: DESCRIPTION,
    startDate: "2026-05-29T18:00:00+03:00",
    endDate: "2026-06-01T23:00:00+03:00",
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    url: SITE_URL,
    location: {
      "@type": "Place",
      name: "ELBA",
      address: {
        "@type": "PostalAddress",
        streetAddress: "Str. Gării nr. 1",
        addressLocality: "Timișoara",
        addressCountry: "RO",
      },
    },
    organizer: {
      "@type": "Organization",
      name: "Banaton Fest",
      url: SITE_URL,
    },
    image: [OG_IMAGE],
  };

  const faqJsonLd =
    lang === "en"
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Where does Banaton Fest 2026 take place?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "In Timișoara, at ELBA (Str. Gării nr. 1).",
              },
            },
            {
              "@type": "Question",
              name: "What are the festival dates?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "May 29–June 1, 2026 (Fri–Mon).",
              },
            },
            {
              "@type": "Question",
              name: "How does VIP work?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "VIP tickets require table selection in the VIP step before checkout.",
              },
            },
          ],
        }
      : {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: [
            {
              "@type": "Question",
              name: "Unde are loc Banaton Fest 2026?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Evenimentul are loc în Timișoara, la ELBA (str. Gării nr. 1).",
              },
            },
            {
              "@type": "Question",
              name: "Care sunt datele festivalului?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "29.05–01.06.2026 (Vineri–Luni).",
              },
            },
            {
              "@type": "Question",
              name: "Cum funcționează VIP?",
              acceptedAnswer: {
                "@type": "Answer",
                text: "Biletele VIP necesită selectarea mesei în pasul VIP, înainte de checkout.",
              },
            },
          ],
        };

  return (
    <>
      {/* Head tags moved to layout or handled elsewhere in App Router */}
      {/* The following meta tags may be handled by next/head at a higher level */}
      {/* 
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={CANONICAL} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Banaton Fest" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={SITE_URL} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
        <meta name="twitter:image" content={OG_IMAGE} />
      </Head>
      */}

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(eventJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <div className="relative flex min-h-screen w-full flex-col bg-[#120818] text-white font-display overflow-x-hidden selection:bg-accent-cyan selection:text-black">
      {/* Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/30 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] bg-secondary/40 rounded-full blur-[140px]"></div>
        <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-accent-cyan/10 rounded-full blur-[100px]"></div>
      </div>

      <main className="relative z-10 flex flex-col items-center w-full grow">
        {/* Hero Section */}
        <section className="w-full max-w-7xl px-4 md:px-10 py-8 md:py-12">
          <div
            className="rounded-3xl overflow-hidden relative min-h-[400px] md:min-h-[500px] flex items-center justify-center p-8 text-center bg-cover bg-center group border border-white/5"
            style={{
              backgroundImage:
                "linear-gradient(rgba(18, 8, 24, 0.4) 0%, rgba(18, 8, 24, 0.9) 100%), url('https://lh3.googleusercontent.com/aida-public/AB6AXuBqbB2W2YKQhA1KoPs-lu_kxDNAE7Y0VO5I-0ypUfKw5FIy0BPQ4mhOBlIeg2ffzSXSyh8WbfXHgcIkpTAk4f92XuIzo8TAhoSkFok6VX7nIxMbXQfjBPi2kEdO278auXZYj6xW4_mWfZZKhAj_VQk7dN9Zd2qZG1J8kZd_Y2e681WirtEsBSGsnCx4lHf5yrZbDpslFCBMtfpOMBTiPNGdvbFRNlz-wjcd4tneMb-51yjooloeGpbOohVW2IwP9mzLGumY5wT7WeAJ')",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent opacity-90"></div>
            <div className="relative z-10 flex flex-col gap-6 max-w-3xl items-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-accent-gold/20 text-accent-gold text-xs font-bold uppercase tracking-wider border border-accent-gold/30 backdrop-blur-sm shadow-[0_0_10px_rgba(255,215,0,0.2)]">
                {t.hero_badge}
              </span>
              <h1 className="text-white text-5xl md:text-7xl font-black leading-tight tracking-tight drop-shadow-xl">
                {t.hero_title_prefix}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan via-white to-accent-gold">
                  {t.hero_title_highlight}
                </span>
              </h1>
              <p className="text-white/90 text-lg md:text-xl font-medium leading-relaxed max-w-2xl drop-shadow-md">
                {t.hero_subtitle}
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <Link
                  href="/tickets"
                  className="flex items-center gap-2 h-12 px-8 rounded-full bg-accent-cyan text-background-dark text-base font-bold hover:bg-white hover:text-primary transition-colors shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                >
                  <span className="material-symbols-outlined">confirmation_number</span>
                  {t.cta_buy_tickets}
                </Link>
                <a
                  href="#program"
                  className="flex items-center gap-2 h-12 px-8 rounded-full bg-white/5 text-white backdrop-blur-md border border-white/20 text-base font-bold hover:bg-white/10 hover:border-accent-gold/50 transition-colors"
                >
                  <span className="material-symbols-outlined">event</span>
                  {t.cta_view_program}
                </a>
                <a
                  href="https://www.youtube.com/watch?v=0WtajsV-X9c&t=13s"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 h-12 px-8 rounded-full bg-accent-gold/15 text-accent-gold backdrop-blur-md border border-accent-gold/30 text-base font-bold hover:bg-accent-gold hover:text-black transition-colors"
                >
                  <span className="material-symbols-outlined">play_circle</span>
                  {t.cta_aftermovie}
                </a>
              </div>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="w-full max-w-4xl px-4 md:px-10 py-12 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">
                {t.concept_title}
              </h2>
              <div className="w-20 h-1.5 bg-gradient-to-r from-accent-gold to-primary rounded-full"></div>
              <p className="text-gray-300 text-lg leading-relaxed">
                {t.concept_body}
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="flex flex-col gap-2 p-4 rounded-2xl bg-gradient-to-br from-[#2D1B4E] to-transparent border border-white/10 hover:border-accent-cyan/50 transition-colors">
                  <span className="text-accent-gold text-3xl font-black">4</span>
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    {t.concept_stats_days_label}
                  </span>
                </div>
                <div className="flex flex-col gap-2 p-4 rounded-2xl bg-gradient-to-br from-[#2D1B4E] to-transparent border border-white/10 hover:border-accent-cyan/50 transition-colors">
                  <span className="text-accent-cyan text-3xl font-black">2026</span>
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">
                    {t.concept_stats_edition_label}
                  </span>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/3 aspect-[3/4] rounded-2xl overflow-hidden relative shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 border border-accent-gold/20">
              <div className="absolute inset-0 bg-primary/30 mix-blend-overlay z-10"></div>
              <img
                alt="Public la concert"
                className="w-full h-full object-cover"
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPMSg-UEMRJly8Egixqpn8heJjOO_m893GFJD6h7N9fXLZeXCaOlOeQlhZQ3e_qvXMROKhQeO5T09wILIlqlC7SkCW25zE0Im2YULPTlsz7UnoPbOQUKrtilZ4v2EpPQ7Q2Xr77lADqvA7JRRnvVro-QTwskLtt2WdOJ6rHTCtdYCvWCMYKq3OIaEqiMkn1jW8wx0Lcg_oxhlXNTyBLumIY5p19S0-Qj5uJMIAUtn5iNO5Cv1fzbn7SPWZRu2ZQrbjVsW7kgM51RfD"
              />
            </div>
          </div>
        </section>

        {/* Program Section */}
        <section
          id="program"
          className="w-full bg-[#0d0612] py-20 relative overflow-hidden border-t border-white/5"
        >
          <div className="absolute left-0 top-40 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"></div>
          <div className="absolute right-0 bottom-20 w-80 h-80 bg-accent-cyan/10 rounded-full blur-[80px]"></div>
          <div className="max-w-6xl mx-auto px-4 md:px-10 flex flex-col gap-10 relative z-10">
            <div className="text-center space-y-3">
              <span className="text-accent-gold font-bold tracking-widest uppercase text-sm">
                {t.program_kicker}
              </span>
              <h2 className="text-4xl md:text-5xl font-black text-white">
                {t.program_title}
              </h2>
              <p className="text-gray-400 max-w-2xl mx-auto">
                {t.program_subtitle}
              </p>
            </div>

            <div className="flex justify-center w-full">
              <div className="inline-flex p-1 bg-[#1a0f24] rounded-full border border-white/10 overflow-x-auto max-w-full no-scrollbar">
                {programDays.map((day) => {
                  const isActive = activeProgram.id === day.id;
                  return (
                    <button
                      key={day.id}
                      type="button"
                      onClick={() => {
                        setSelectedProgramDay(day.id);
                        setProgramImageErrors((prev) => {
                          if (!prev[day.id]) return prev;
                          const next = { ...prev };
                          delete next[day.id];
                          return next;
                        });
                      }}
                      className={
                        isActive
                          ? "px-6 py-2.5 rounded-full bg-accent-cyan text-background-dark text-sm font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all whitespace-nowrap"
                          : "px-6 py-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 text-sm font-bold transition-all whitespace-nowrap"
                      }
                    >
                      {day.tabLabel}{" "}
                      <span className="text-xs font-normal opacity-80 block md:inline md:ml-1">
                        {day.tabDate}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-4 mt-4">
              <div
                className={
                  activeProgram.accent === "gold"
                    ? "relative group flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-r from-[#2a0e45] to-[#180e21] border border-accent-gold/40 hover:border-accent-gold hover:shadow-[0_0_40px_rgba(255,215,0,0.15)] transition-all duration-300"
                    : "relative group flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-[#180e21] border border-white/5 hover:border-accent-cyan/30 hover:bg-[#20132b] hover:shadow-[0_0_30px_rgba(0,240,255,0.1)] transition-all duration-300"
                }
              >
                <div
                  className={
                    activeProgram.accent === "gold"
                      ? "absolute top-0 right-0 md:top-4 md:right-4 bg-accent-gold text-black text-xs font-black px-3 py-1 rounded-bl-xl rounded-tr-xl md:rounded-lg uppercase tracking-wide z-10 shadow-lg"
                      : "absolute top-0 right-0 md:top-4 md:right-4 bg-accent-cyan text-background-dark text-xs font-black px-3 py-1 rounded-bl-xl rounded-tr-xl md:rounded-lg uppercase tracking-wide z-10 shadow-lg"
                  }
                >
                  {activeProgram.badge}
                </div>

                <div className="flex flex-col items-center justify-center min-w-[100px] text-center">
                  <span
                    className={
                      activeProgram.accent === "gold"
                        ? "text-2xl font-black text-accent-gold"
                        : "text-2xl font-black text-accent-cyan"
                    }
                  >
                    {activeProgram.time}
                  </span>
                  <span className="text-xs text-gray-500 font-bold uppercase mt-1">{activeProgram.stage}</span>
                </div>

                <div
                  className={
                    (activeProgram.accent === "gold"
                      ? "relative shrink-0 overflow-hidden bg-primary/20 flex items-center justify-center border-2 border-accent-gold shadow-[0_0_15px_rgba(255,215,0,0.3)]"
                      : "relative shrink-0 overflow-hidden bg-primary/20 flex items-center justify-center border-2 border-white/10 group-hover:border-accent-cyan transition-colors") +
                    (activeProgram.imageFit === "contain"
                      ? " w-32 h-44 md:w-40 md:h-56"
                      : " w-44 h-28 md:w-60 md:h-36")
                  }
                >
                  {!activeProgramImageFailed ? (
                    <Image
                      src={activeProgram.artistImage}
                      alt={activeProgram.title}
                      fill
                      sizes="(max-width: 768px) 320px, 480px"
                      className={
                        "" +
                        (activeProgram.imageFit === "contain"
                          ? "object-contain bg-[#120818]"
                          : "object-cover object-center")
                      }
                      onError={() =>
                        setProgramImageErrors((prev) => ({ ...prev, [activeProgram.id]: true }))
                      }
                    />
                  ) : (
                    <span
                      className={
                        activeProgram.accent === "gold"
                          ? "material-symbols-outlined text-4xl text-accent-gold"
                          : "material-symbols-outlined text-4xl text-primary"
                      }
                    >
                      {activeProgram.icon}
                    </span>
                  )}
                </div>

                <div className="flex-1 text-center md:text-left space-y-2">
                  <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap">
                    <h3
                      className={
                        activeProgram.accent === "gold"
                          ? "text-2xl md:text-3xl font-black text-white group-hover:text-accent-gold transition-colors"
                          : "text-xl md:text-2xl font-bold text-white group-hover:text-accent-cyan transition-colors"
                      }
                    >
                      {activeProgram.title}
                    </h3>
                    {activeProgram.tag ? (
                      <span
                        className={
                          activeProgram.tag === "Exclusive Show" || activeProgram.tag === "Exclusive Show"
                            ? "px-2 py-0.5 rounded text-[10px] font-bold bg-accent-gold/20 text-accent-gold border border-accent-gold/20 uppercase tracking-wider"
                            : activeProgram.tag === "Folclor Simfonic" || activeProgram.tag === "Symphonic Folk"
                            ? "px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-300 uppercase tracking-wider"
                            : "px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/20 uppercase tracking-wider"
                        }
                      >
                        {activeProgram.tag}
                      </span>
                    ) : null}
                  </div>
                  <p className="text-gray-300 text-sm leading-snug max-w-xl">{activeProgram.subtitle}</p>
                </div>

                <Link
                  href="/tickets"
                  className={
                    activeProgram.accent === "gold"
                      ? "h-10 md:h-12 px-6 rounded-full bg-accent-gold text-black font-bold flex items-center gap-2 hover:bg-white transition-colors shadow-lg"
                      : "h-10 md:h-12 px-6 rounded-full bg-white/5 border border-white/10 text-white font-bold flex items-center gap-2 hover:bg-accent-cyan hover:text-background-dark hover:border-accent-cyan transition-all"
                  }
                >
                  <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                  {activeProgram.ctaLabel}
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Preturi Section */}
        <section className="w-full max-w-6xl px-4 md:px-10 py-16">
          <div className="rounded-3xl border border-white/10 bg-[#150b1f]/80 backdrop-blur-sm p-6 md:p-10">
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
              <div>
                <p className="text-accent-gold text-sm font-bold uppercase tracking-widest">{t.prices_kicker}</p>
                <h2 className="text-3xl md:text-4xl font-black text-white mt-2">{t.prices_title}</h2>
              </div>
              <Link href="/tickets" className="inline-flex items-center gap-2 h-11 px-5 rounded-full bg-accent-cyan text-background-dark font-bold hover:bg-white transition-colors self-start md:self-auto">
                <span className="material-symbols-outlined">shopping_cart</span>
                {t.prices_buy_now}
              </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-xl font-bold text-white mb-4">{t.prices_fanpit}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
                    <span className="text-gray-300">{t.prices_pack_4days}</span>
                    <span className="font-bold text-accent-cyan">120 lei</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
                    <span className="text-gray-300">{t.prices_single_day}</span>
                    <span className="font-bold text-accent-cyan">50 lei</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
                    <span className="text-gray-300">{t.prices_sat_ceca}</span>
                    <span className="font-bold text-accent-gold">80 lei</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
                    <span className="text-gray-300">{t.prices_2day}</span>
                    <span className="font-bold text-accent-cyan">60 lei</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-300">{t.prices_3day}</span>
                    <span className="font-bold text-accent-cyan">80 lei</span>
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-accent-gold/20 bg-accent-gold/5 p-5">
                <h3 className="text-xl font-bold text-white mb-4">{t.prices_vip}</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
                    <span className="text-gray-300">{t.prices_vip_single}</span>
                    <span className="font-bold text-accent-gold">200 lei</span>
                  </div>
                  <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-2">
                    <span className="text-gray-300">{t.prices_vip_sat}</span>
                    <span className="font-bold text-accent-gold">350 lei</span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-gray-300">{t.prices_vip_4days}</span>
                    <span className="font-bold text-accent-gold">750 lei</span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-4">
                  {t.prices_vip_note}
                </p>
              </div>
            </div>

            <div className="mt-8 rounded-2xl border border-red-400/30 bg-red-500/10 p-4 md:p-5">
              <p className="text-red-300 font-black uppercase tracking-wider text-sm mb-2">{t.attention_title}</p>
              <p className="text-white font-semibold">{t.attention_location}</p>
            </div>
          </div>
        </section>
      </main>
      </div>
    </>
  );
}
