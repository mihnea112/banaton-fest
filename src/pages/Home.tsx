import { Link } from 'react-router-dom';

export default function Home() {
  return (
    <div className="relative flex min-h-screen w-full flex-col bg-[#120818] text-white font-display overflow-x-hidden selection:bg-accent-cyan selection:text-black">
      {/* Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-primary/30 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[-10%] w-[500px] h-[500px] bg-secondary/40 rounded-full blur-[140px]"></div>
        <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-accent-cyan/10 rounded-full blur-[100px]"></div>
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#120818]/80 border-b border-white/10">
        <div className="px-4 md:px-10 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
          <div className="flex items-center gap-3">
            <div className="size-8 text-accent-cyan">
              <span className="material-symbols-outlined !text-[32px]">equalizer</span>
            </div>
            <h2 className="text-white text-xl font-extrabold tracking-tight">Banaton Fest</h2>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link to="/" className="text-accent-gold font-bold text-sm">Acasă</Link>
            <Link to="/tickets" className="text-white/80 hover:text-accent-cyan transition-colors text-sm font-medium">Bilete</Link>
            <Link to="/vip" className="text-white/80 hover:text-accent-cyan transition-colors text-sm font-medium">VIP</Link>
            <a href="#program" className="text-white/80 hover:text-accent-cyan transition-colors text-sm font-medium">Program</a>
          </nav>
          <div className="flex gap-3">
            <button className="hidden md:flex bg-[#2D1B4E] hover:bg-[#40354a] text-white p-2.5 rounded-full transition-colors">
              <span className="material-symbols-outlined">search</span>
            </button>
            <Link to="/tickets" className="flex items-center justify-center rounded-full h-10 px-6 bg-gradient-to-r from-primary to-secondary hover:from-accent-cyan hover:to-primary text-white text-sm font-bold shadow-[0_0_15px_rgba(106,13,173,0.5)] transition-all transform hover:scale-105 border border-white/10">
              <span className="truncate">Bilete Online</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex flex-col items-center w-full grow">
        {/* Hero Section */}
        <section className="w-full max-w-7xl px-4 md:px-10 py-8 md:py-12">
          <div className="rounded-3xl overflow-hidden relative min-h-[400px] md:min-h-[500px] flex items-center justify-center p-8 text-center bg-cover bg-center group border border-white/5" style={{backgroundImage: "linear-gradient(rgba(18, 8, 24, 0.4) 0%, rgba(18, 8, 24, 0.9) 100%), url('https://lh3.googleusercontent.com/aida-public/AB6AXuBqbB2W2YKQhA1KoPs-lu_kxDNAE7Y0VO5I-0ypUfKw5FIy0BPQ4mhOBlIeg2ffzSXSyh8WbfXHgcIkpTAk4f92XuIzo8TAhoSkFok6VX7nIxMbXQfjBPi2kEdO278auXZYj6xW4_mWfZZKhAj_VQk7dN9Zd2qZG1J8kZd_Y2e681WirtEsBSGsnCx4lHf5yrZbDpslFCBMtfpOMBTiPNGdvbFRNlz-wjcd4tneMb-51yjooloeGpbOohVW2IwP9mzLGumY5wT7WeAJ')"}}>
            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent opacity-90"></div>
            <div className="relative z-10 flex flex-col gap-6 max-w-3xl items-center">
              <span className="inline-block px-4 py-1.5 rounded-full bg-accent-gold/20 text-accent-gold text-xs font-bold uppercase tracking-wider border border-accent-gold/30 backdrop-blur-sm shadow-[0_0_10px_rgba(255,215,0,0.2)]">
                29.05 - 01.06 • Timișoara
              </span>
              <h1 className="text-white text-5xl md:text-7xl font-black leading-tight tracking-tight drop-shadow-xl">
                Magia <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan via-white to-accent-gold">Banatului</span>
              </h1>
              <p className="text-white/90 text-lg md:text-xl font-medium leading-relaxed max-w-2xl drop-shadow-md">
                Patru zile de folk-pop balcanic, tradiții reinventate și o atmosferă electrizantă. Experimentează fuziunea culturală a anului.
              </p>
              <div className="flex flex-wrap justify-center gap-4 pt-4">
                <button className="flex items-center gap-2 h-12 px-8 rounded-full bg-accent-cyan text-background-dark text-base font-bold hover:bg-white hover:text-primary transition-colors shadow-[0_0_20px_rgba(0,240,255,0.4)]">
                  <span className="material-symbols-outlined">play_circle</span>
                  Vezi Aftermovie
                </button>
                <button className="flex items-center gap-2 h-12 px-8 rounded-full bg-white/5 text-white backdrop-blur-md border border-white/20 text-base font-bold hover:bg-white/10 hover:border-accent-gold/50 transition-colors">
                  <span className="material-symbols-outlined">map</span>
                  Harta Festivalului
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Vision Section */}
        <section className="w-full max-w-4xl px-4 md:px-10 py-12 flex flex-col gap-8">
          <div className="flex flex-col md:flex-row gap-10 items-start">
            <div className="flex-1 space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Viziunea Noastră</h2>
              <div className="w-20 h-1.5 bg-gradient-to-r from-accent-gold to-primary rounded-full"></div>
              <p className="text-gray-300 text-lg leading-relaxed">
                Banaton Fest extinde orizonturile muzicale ale Banatului. Anul acesta adăugăm o zi în plus de magie, transformând festivalul într-o experiență completă de 4 zile. De la rădăcinile folclorice la beat-urile moderne, construim o comunitate vibrantă unită de pasiunea pentru ritm.
              </p>
              <div className="grid grid-cols-2 gap-6 pt-4">
                <div className="flex flex-col gap-2 p-4 rounded-2xl bg-gradient-to-br from-[#2D1B4E] to-transparent border border-white/10 hover:border-accent-cyan/50 transition-colors">
                  <span className="text-accent-gold text-3xl font-black">40+</span>
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Artiști</span>
                </div>
                <div className="flex flex-col gap-2 p-4 rounded-2xl bg-gradient-to-br from-[#2D1B4E] to-transparent border border-white/10 hover:border-accent-cyan/50 transition-colors">
                  <span className="text-accent-cyan text-3xl font-black">4</span>
                  <span className="text-sm font-bold text-gray-400 uppercase tracking-wider">Zile de Festival</span>
                </div>
              </div>
            </div>
            <div className="w-full md:w-1/3 aspect-[3/4] rounded-2xl overflow-hidden relative shadow-2xl rotate-3 hover:rotate-0 transition-transform duration-500 border border-accent-gold/20">
              <div className="absolute inset-0 bg-primary/30 mix-blend-overlay z-10"></div>
              <img alt="Concert crowd" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAPMSg-UEMRJly8Egixqpn8heJjOO_m893GFJD6h7N9fXLZeXCaOlOeQlhZQ3e_qvXMROKhQeO5T09wILIlqlC7SkCW25zE0Im2YULPTlsz7UnoPbOQUKrtilZ4v2EpPQ7Q2Xr77lADqvA7JRRnvVro-QTwskLtt2WdOJ6rHTCtdYCvWCMYKq3OIaEqiMkn1jW8wx0Lcg_oxhlXNTyBLumIY5p19S0-Qj5uJMIAUtn5iNO5Cv1fzbn7SPWZRu2ZQrbjVsW7kgM51RfD"/>
            </div>
          </div>
        </section>

        {/* Lineup Section */}
        <section id="program" className="w-full bg-[#0d0612] py-20 relative overflow-hidden border-t border-white/5">
          <div className="absolute left-0 top-40 w-96 h-96 bg-primary/20 rounded-full blur-[100px]"></div>
          <div className="absolute right-0 bottom-20 w-80 h-80 bg-accent-cyan/10 rounded-full blur-[80px]"></div>
          <div className="max-w-6xl mx-auto px-4 md:px-10 flex flex-col gap-10 relative z-10">
            <div className="text-center space-y-3">
              <span className="text-accent-gold font-bold tracking-widest uppercase text-sm">29.05 - 01.06</span>
              <h2 className="text-4xl md:text-5xl font-black text-white">Programul Festivalului</h2>
              <p className="text-gray-400 max-w-xl mx-auto">Patru zile intense de muzică și energie. Alege-ți favoriții.</p>
            </div>
            <div className="flex justify-center w-full">
              <div className="inline-flex p-1 bg-[#1a0f24] rounded-full border border-white/10 overflow-x-auto max-w-full no-scrollbar">
                <button className="px-6 py-2.5 rounded-full bg-accent-cyan text-background-dark text-sm font-bold shadow-[0_0_15px_rgba(0,240,255,0.3)] transition-all whitespace-nowrap">
                  Joi <span className="text-xs font-normal opacity-80 block md:inline md:ml-1">29 Mai</span>
                </button>
                <button className="px-6 py-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 text-sm font-bold transition-all whitespace-nowrap">
                  Vineri <span className="text-xs font-normal opacity-60 block md:inline md:ml-1">30 Mai</span>
                </button>
                <button className="px-6 py-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 text-sm font-bold transition-all whitespace-nowrap">
                  Sâmbătă <span className="text-xs font-normal opacity-60 block md:inline md:ml-1">31 Mai</span>
                </button>
                <button className="px-6 py-2.5 rounded-full text-gray-400 hover:text-white hover:bg-white/5 text-sm font-bold transition-all whitespace-nowrap">
                  Duminică <span className="text-xs font-normal opacity-60 block md:inline md:ml-1">01 Iunie</span>
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-4 mt-4">
              {/* Event 1 */}
              <div className="group flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-[#180e21] border border-white/5 hover:border-accent-cyan/30 hover:bg-[#20132b] hover:shadow-[0_0_30px_rgba(0,240,255,0.1)] transition-all duration-300">
                <div className="flex flex-col items-center justify-center min-w-[100px] text-center">
                  <span className="text-2xl font-black text-accent-cyan">17:00</span>
                  <span className="text-xs text-gray-500 font-bold uppercase mt-1">Main Stage</span>
                </div>
                <div className="relative size-16 md:size-20 shrink-0 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-accent-cyan transition-colors">
                  <img alt="DJ mixing music" className="size-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA5-CyCCxK5n7Aj3eAjsLr29fPqX-Gd_ixmomUxw9832_mE6yDSdtOqbs7ktItagU2vXkqtobVl-9evea_U-PhwZPfmxvNRdIzjY34Yra7btnffTpPnf8mO3tZ73fZjfHmfuaSK7Hr6Fy_t5UTa0IT1gYcmVyNUTn9e5L6Uc1u3tB02cZk_zR_tKcYF1vF49YmCzcjUpYD1J_gX_OAL9V094HVCIuj3xBWr3ppKLJ2GVk5n5LCGnSePDmD-5-OZG7v5kHCDG9Ee8_g4"/>
                </div>
                <div className="flex-1 text-center md:text-left space-y-1">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-accent-cyan transition-colors">DJ Kolo</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-300 uppercase tracking-wider">Warm Up</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-snug">
                    Startul oficial al festivalului. Ritmuri chill-out balcanice pentru a intra în atmosferă.
                  </p>
                </div>
                <button className="size-10 md:size-12 shrink-0 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-accent-cyan hover:border-accent-cyan hover:text-background-dark transition-all group-hover:scale-110">
                  <span className="material-symbols-outlined">play_arrow</span>
                </button>
              </div>

              {/* Event 2 */}
              <div className="group flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-[#180e21] border border-white/5 hover:border-accent-cyan/30 hover:bg-[#20132b] hover:shadow-[0_0_30px_rgba(0,240,255,0.1)] transition-all duration-300">
                <div className="flex flex-col items-center justify-center min-w-[100px] text-center">
                  <span className="text-2xl font-black text-accent-cyan">19:30</span>
                  <span className="text-xs text-gray-500 font-bold uppercase mt-1">Second Stage</span>
                </div>
                <div className="relative size-16 md:size-20 shrink-0 rounded-full overflow-hidden border-2 border-white/10 group-hover:border-accent-cyan transition-colors">
                  <img alt="Band performing live" className="size-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBnUYTc6fwM6TaEt_bjF_4k3Tad1UCM3vj0a_2HuM-4TymP2jQECyXlfjslvVUFBma759zoiP0YppxwezDr9ctZ-KfFcyV6TzKVFeEewYtqrKxx25lQNkEiJ0AisL0b23rzD3702e4aV8mTAHpEKxRBFxCv6o8eVIXako4KJ-8cZp97yGFgCbS6q5Lx9WEJwizek2gI6h4TnMO9eZwGK4kxW9hg3dDlDhecXGVQCCfgga_kugfQjA68zfWVxDtsoqsnoz4VpuZQWRbe"/>
                </div>
                <div className="flex-1 text-center md:text-left space-y-1">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-accent-cyan transition-colors">Taraful Urban</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/20 text-primary border border-primary/20 uppercase tracking-wider">Live Band</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-snug">
                    Muzică lăutărească reinterpretată în stil jazz-fusion. O experiență acustică rafinată.
                  </p>
                </div>
                <button className="size-10 md:size-12 shrink-0 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-accent-cyan hover:border-accent-cyan hover:text-background-dark transition-all group-hover:scale-110">
                  <span className="material-symbols-outlined">play_arrow</span>
                </button>
              </div>

              {/* Event 3 (Headliner) */}
              <div className="relative group flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-gradient-to-r from-[#2a0e45] to-[#180e21] border border-accent-gold/40 hover:border-accent-gold hover:shadow-[0_0_40px_rgba(255,215,0,0.15)] transition-all duration-300 transform md:scale-[1.02]">
                <div className="absolute top-0 right-0 md:top-4 md:right-4 bg-accent-gold text-black text-xs font-black px-3 py-1 rounded-bl-xl rounded-tr-xl md:rounded-lg uppercase tracking-wide z-10 shadow-lg">
                  Headliner • Ziua 1
                </div>
                <div className="flex flex-col items-center justify-center min-w-[100px] text-center">
                  <span className="text-2xl font-black text-accent-gold">21:30</span>
                  <span className="text-xs text-gray-500 font-bold uppercase mt-1">Main Stage</span>
                </div>
                <div className="relative size-20 md:size-24 shrink-0 rounded-full overflow-hidden border-2 border-accent-gold group-hover:scale-105 transition-transform shadow-[0_0_15px_rgba(255,215,0,0.3)]">
                  <img alt="Male singer performing" className="size-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuABch2bVJHp0aQ7Jnhlwu2FkPA0iLtOqZgDrCu-Hc_muyZQk-KyNsGdmMFapl7xgdbddHObuYWQw_BbyFK0_S82TipMSd8b84FxMxTAjKqaucfuW5GP__2b8_4yNUGwkQ6N1yEykSq-_DVo2Q639HPcjpY_3wqfy8-DXM_DXsSB4BU2z3tH3xa6bW6qkK9ZkJwuEnDfiYteVk7K2RnV7S22SEKdlej6Pb2naocrUyDI3Wnphu_Amh1pKMi92RvW-a01DPV7zE2b9_t0"/>
                </div>
                <div className="flex-1 text-center md:text-left space-y-2">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h3 className="text-2xl md:text-3xl font-black text-white group-hover:text-accent-gold transition-colors">Balkan Brass King</h3>
                  </div>
                  <p className="text-gray-300 text-sm leading-snug max-w-xl">
                    Legendara orchestră deschide festivalul cu un show exploziv. Trompete, energie și dans până la epuizare!
                  </p>
                </div>
                <Link to="/tickets" className="h-10 md:h-12 px-6 rounded-full bg-accent-gold text-black font-bold flex items-center gap-2 hover:bg-white transition-colors shadow-lg">
                  <span className="material-symbols-outlined text-[20px]">confirmation_number</span>
                  Rezervă Loc
                </Link>
              </div>

              {/* Event 4 */}
              <div className="group flex flex-col md:flex-row items-center gap-6 p-6 rounded-2xl bg-[#180e21] border border-white/5 hover:border-accent-cyan/30 hover:bg-[#20132b] hover:shadow-[0_0_30px_rgba(0,240,255,0.1)] transition-all duration-300">
                <div className="flex flex-col items-center justify-center min-w-[100px] text-center">
                  <span className="text-2xl font-black text-accent-cyan">23:30</span>
                  <span className="text-xs text-gray-500 font-bold uppercase mt-1">After Party</span>
                </div>
                <div className="relative size-16 md:size-20 shrink-0 rounded-full overflow-hidden bg-primary/20 flex items-center justify-center border-2 border-white/10 group-hover:border-accent-cyan transition-colors">
                  <span className="material-symbols-outlined text-3xl text-primary">nightlife</span>
                </div>
                <div className="flex-1 text-center md:text-left space-y-1">
                  <div className="flex items-center justify-center md:justify-start gap-3">
                    <h3 className="text-xl md:text-2xl font-bold text-white group-hover:text-accent-cyan transition-colors">Midnight Folk</h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-gray-300 uppercase tracking-wider">Late Night</span>
                  </div>
                  <p className="text-gray-400 text-sm leading-snug">
                    Muzică pentru cei care nu vor să se termine noaptea. Vibes electronice cu influențe etno.
                  </p>
                </div>
                <button className="size-10 md:size-12 shrink-0 rounded-full border border-white/10 flex items-center justify-center text-white hover:bg-accent-cyan hover:border-accent-cyan hover:text-background-dark transition-all group-hover:scale-110">
                  <span className="material-symbols-outlined">play_arrow</span>
                </button>
              </div>
            </div>
            <div className="flex justify-center mt-8">
              <button className="text-gray-400 hover:text-accent-cyan text-sm font-medium flex items-center gap-2 transition-colors group">
                <span className="p-2 rounded-full bg-white/5 group-hover:bg-white/10 transition-colors">
                  <span className="material-symbols-outlined text-lg">download</span>
                </span>
                Descarcă programul complet PDF
              </button>
            </div>
          </div>
        </section>
      </main>

      <footer className="w-full border-t border-white/5 bg-[#0a050d] py-10">
        <div className="max-w-7xl mx-auto px-4 md:px-10 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex flex-col items-center md:items-start gap-2">
            <h2 className="text-white font-extrabold text-xl tracking-tight">Banaton Fest</h2>
            <p className="text-gray-500 text-sm">© 2024 Toate drepturile rezervate.</p>
          </div>
          <div className="flex gap-6">
            <a className="text-gray-400 hover:text-accent-cyan transition-colors" href="#"><span className="material-symbols-outlined">public</span></a>
            <a className="text-gray-400 hover:text-accent-cyan transition-colors" href="#"><span className="material-symbols-outlined">alternate_email</span></a>
            <a className="text-gray-400 hover:text-accent-cyan transition-colors" href="#"><span className="material-symbols-outlined">photo_camera</span></a>
          </div>
        </div>
      </footer>
    </div>
  );
}
