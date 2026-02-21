import { Link } from 'react-router-dom';

export default function Success() {
  return (
    <div className="bg-[#191022] text-slate-100 min-h-screen flex flex-col relative overflow-x-hidden font-display">
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-[#7f13ec]/30 rounded-full blur-[120px] opacity-40 mix-blend-screen"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[40vw] h-[40vw] bg-cyan-500/20 rounded-full blur-[100px] opacity-30 mix-blend-screen"></div>
        <div className="absolute top-[40%] left-[50%] -translate-x-1/2 w-[30vw] h-[30vw] bg-[#FFD700]/10 rounded-full blur-[100px] opacity-20"></div>
      </div>

      <div className="relative z-10 flex flex-col h-full grow">
        <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-6 py-4 lg:px-10 bg-[#191022]/80 backdrop-blur-md sticky top-0 z-50">
          <Link to="/" className="flex items-center gap-4 text-white">
            <div className="size-10 rounded-full bg-[#7f13ec]/20 flex items-center justify-center text-[#7f13ec] border border-[#7f13ec]/30">
              <span className="material-symbols-outlined text-[24px]">music_note</span>
            </div>
            <h2 className="text-white text-xl font-bold leading-tight tracking-[-0.015em]">Banaton Fest</h2>
          </Link>
          <div className="flex flex-1 justify-end gap-4 lg:gap-8 items-center">
            <div className="hidden md:flex items-center gap-6 lg:gap-9">
              <Link to="/" className="text-slate-300 hover:text-white transition-colors text-sm font-medium leading-normal">Line-up</Link>
              <Link to="/tickets" className="text-slate-300 hover:text-white transition-colors text-sm font-medium leading-normal">Bilete</Link>
              <a href="#" className="text-slate-300 hover:text-white transition-colors text-sm font-medium leading-normal">Info</a>
              <a href="#" className="text-slate-300 hover:text-white transition-colors text-sm font-medium leading-normal">Contact</a>
            </div>
            <button className="flex min-w-[44px] h-10 w-10 md:w-auto md:px-5 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[#241a30] hover:bg-white/5 transition-all text-white text-sm font-bold leading-normal">
              <span className="material-symbols-outlined text-[20px] md:hidden">person</span>
              <span className="hidden md:inline truncate">Contul Meu</span>
            </button>
          </div>
        </header>

        <main className="flex-grow flex items-center justify-center p-4 py-12 md:py-16">
          <div className="w-full max-w-2xl animate-fade-in-up">
            <div className="bg-[#241a30] border border-white/10 rounded-3xl shadow-[0_0_50px_-12px_rgba(127,19,236,0.3)] overflow-hidden relative">
              <div className="h-1.5 w-full bg-gradient-to-r from-[#7f13ec] via-[#00e5ff] to-[#FFD700]"></div>
              <div className="p-8 md:p-12 flex flex-col items-center text-center">
                <div className="mb-6 relative group">
                  <div className="absolute inset-0 bg-[#FFD700]/30 rounded-full blur-2xl animate-pulse group-hover:bg-[#FFD700]/40 transition-all duration-500"></div>
                  <div className="relative size-20 md:size-24 rounded-full bg-gradient-to-br from-[#FFD700] to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/20 border-4 border-[#241a30] ring-2 ring-[#FFD700]/50">
                    <span className="material-symbols-outlined text-[#191022] text-[40px] md:text-[48px] font-black">check</span>
                  </div>
                </div>
                <h1 className="text-3xl md:text-4xl font-black text-white mb-4 tracking-tight">
                  Plată Reușită!
                </h1>
                <p className="text-slate-300 text-base md:text-lg max-w-md mb-10 leading-relaxed font-medium">
                  Tranzacția a fost procesată cu succes. Te așteptăm la Banaton Fest! Un email de confirmare a fost trimis către tine.
                </p>

                <div className="w-full bg-[#1e1528] border border-white/5 rounded-2xl p-0 mb-10 text-left relative overflow-hidden group shadow-inner">
                  <div className="absolute right-0 top-0 w-48 h-48 bg-[#7f13ec]/5 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110 duration-700 pointer-events-none"></div>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center p-6 border-b border-white/5 bg-white/[0.02]">
                    <div>
                      <p className="text-[10px] font-bold text-[#00e5ff] uppercase tracking-widest mb-1.5">Număr Comandă</p>
                      <p className="text-white font-mono text-lg tracking-wide">#BNT-8821</p>
                    </div>
                    <div className="mt-4 md:mt-0 text-left md:text-right">
                      <p className="text-[10px] font-bold text-[#00e5ff] uppercase tracking-widest mb-1.5">Dată</p>
                      <p className="text-slate-300 text-sm font-medium">24 Iunie 2024, 14:30</p>
                    </div>
                  </div>
                  <div className="p-6">
                    <div className="flex gap-5 mb-6">
                      <div className="h-24 w-24 shrink-0 rounded-xl bg-center bg-cover bg-no-repeat shadow-lg border border-white/10 relative overflow-hidden group-hover:shadow-[#7f13ec]/20 transition-all duration-300" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAoabGHV1ExJnRogxrXxi4h1NxS-gNfW13_Siy1yz2c2F08c3cDengEpChC-QRaUJwwA8vDYYYoGf-edHS3uNWyvnja-x6sYFET1aOlSaq28AOULqRG3qKOwHjiWb2qYEouISPPOMJldPAClj5tjif8zYW_FrPbJTzQ7SaJuvWEaTwwL9cmed5VceCDVr_o6IlB_0bYzgrt1018natyiIYDZqoKvOHogQe4MTfEAZo2VWBgNylC3YHKwrtgTrz0F6qg_LFvVxBI84N8')"}}>
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
                        <span className="absolute bottom-1 left-0 right-0 text-center text-[10px] font-bold text-white uppercase tracking-wider">4 Zile</span>
                      </div>
                      <div className="flex flex-col justify-center py-1">
                        <h3 className="text-white font-bold text-xl leading-tight mb-2">Abonament Full Access</h3>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#7f13ec]/20 text-[#7f13ec] border border-[#7f13ec]/20 uppercase">General</span>
                          <span className="text-slate-400 text-xs">•</span>
                          <span className="text-slate-300 font-medium text-sm">15-18 August</span>
                        </div>
                        <p className="text-slate-400 text-sm">2 Bilete x 300 RON</p>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-4 border-t border-dashed border-white/10">
                      <span className="text-slate-400 font-medium">Total Plătit</span>
                      <div className="flex flex-col items-end">
                        <span className="text-2xl font-black text-white tracking-tight">600 RON</span>
                        <span className="text-[10px] text-[#FFD700] uppercase tracking-wider font-bold">Plată confirmată</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                  <Link to="/ticket-view" className="flex-1 min-w-[200px] h-14 bg-gradient-to-r from-[#7f13ec] to-[#9d4edd] hover:to-[#7f13ec] text-white rounded-xl font-bold text-base transition-all transform hover:-translate-y-1 hover:shadow-lg hover:shadow-[#7f13ec]/30 flex items-center justify-center gap-2 group">
                    <span className="material-symbols-outlined group-hover:animate-bounce">download</span>
                    <span>Descarcă Biletele (PDF)</span>
                  </Link>
                  <Link to="/" className="flex-1 min-w-[200px] h-14 bg-transparent hover:bg-white/5 text-white border border-white/20 hover:border-white/40 rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 group">
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-white transition-colors">arrow_back</span>
                    <span>Înapoi la Pagina Principală</span>
                  </Link>
                </div>
              </div>
              <div className="bg-[#1c1426] p-4 text-center border-t border-white/5">
                <p className="text-slate-500 text-sm">
                  Ai nevoie de ajutor? <a className="text-[#00e5ff] hover:text-cyan-300 transition-colors font-medium underline underline-offset-2 decoration-cyan-500/30" href="#">Contactează suportul</a>
                </p>
              </div>
            </div>
          </div>
        </main>

        <footer className="flex flex-col gap-6 px-5 py-10 text-center bg-[#241a30] border-t border-white/5 relative z-10">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a className="text-slate-400 hover:text-white transition-colors min-w-40" href="#">Termeni și Condiții</a>
            <a className="text-slate-400 hover:text-white transition-colors min-w-40" href="#">Politica de Confidențialitate</a>
            <a className="text-slate-400 hover:text-white transition-colors min-w-40" href="#">Contact</a>
          </div>
          <div className="flex flex-wrap justify-center gap-6">
            <a className="text-slate-400 hover:text-[#7f13ec] transition-colors hover:scale-110 transform duration-200" href="#">
              <span className="material-symbols-outlined" style={{fontSize: "24px"}}>thumb_up</span>
            </a>
            <a className="text-slate-400 hover:text-[#7f13ec] transition-colors hover:scale-110 transform duration-200" href="#">
              <span className="material-symbols-outlined" style={{fontSize: "24px"}}>public</span>
            </a>
            <a className="text-slate-400 hover:text-[#7f13ec] transition-colors hover:scale-110 transform duration-200" href="#">
              <span className="material-symbols-outlined" style={{fontSize: "24px"}}>smart_display</span>
            </a>
          </div>
          <p className="text-slate-600 text-xs">© 2024 Banaton Fest. Toate drepturile rezervate.</p>
        </footer>
      </div>
    </div>
  );
}
