import { Link } from 'react-router-dom';

export default function TicketView() {
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

        <main className="flex-grow flex items-center justify-center p-4 py-8 md:py-12">
          <div className="w-full max-w-5xl flex flex-col items-center">
            <h1 className="text-3xl md:text-4xl font-black text-white mb-8 tracking-tight text-center">Biletul Tău Digital</h1>
            
            <div className="w-full relative flex flex-col md:flex-row shadow-[0_20px_60px_-15px_rgba(127,19,236,0.4)] rounded-3xl overflow-hidden bg-[#241a30] border border-white/10">
              <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-[#7f13ec] via-[#00e5ff] to-[#FFD700] z-20"></div>
              
              {/* Left Side */}
              <div className="flex-grow p-8 md:p-10 relative ticket-perforation-right md:border-r border-dashed border-white/10 md:w-[70%]">
                <div className="absolute top-0 right-0 w-64 h-64 bg-[#7f13ec]/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-48 h-48 bg-[#00e5ff]/5 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none"></div>
                
                <div className="relative z-10 flex flex-col h-full justify-between">
                  <div className="flex justify-between items-start mb-8">
                    <div className="flex flex-col">
                      <span className="text-[#FFD700] font-bold text-sm tracking-widest uppercase mb-1">Banaton Fest 2026</span>
                      <h2 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter">VIP EXPERIENCE</h2>
                      <p className="text-[#00e5ff] font-bold text-lg mt-2 flex items-center gap-2">
                        <span className="material-symbols-outlined text-[20px]">calendar_month</span>
                        29 Mai - 01 Iunie 2026
                      </p>
                    </div>
                    <div className="hidden sm:block size-16 rounded-full bg-white/5 border border-white/10 flex items-center justify-center">
                      <span className="material-symbols-outlined text-3xl text-white">confirmation_number</span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 mb-8">
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Participant</p>
                      <p className="text-white text-2xl font-bold truncate">Alexandru Popescu</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2">Locație</p>
                      <p className="text-white text-lg font-medium flex items-center gap-1">
                        <span className="material-symbols-outlined text-[#7f13ec] text-sm">location_on</span>
                        Muzeul Satului, Timișoara
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap gap-3 mt-auto">
                    <span className="px-4 py-2 rounded-full bg-[#7f13ec]/20 border border-[#7f13ec]/40 text-[#7f13ec] text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">star</span> Acces VIP
                    </span>
                    <span className="px-4 py-2 rounded-full bg-[#00e5ff]/10 border border-[#00e5ff]/30 text-[#00e5ff] text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">bolt</span> Fast-Track
                    </span>
                    <span className="px-4 py-2 rounded-full bg-[#FFD700]/10 border border-[#FFD700]/30 text-[#FFD700] text-xs font-bold uppercase tracking-wider flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">wine_bar</span> Acces Lounge
                    </span>
                    <span className="px-4 py-2 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-bold uppercase tracking-wider">
                      Parcare Inclusă
                    </span>
                  </div>
                </div>
                
                {/* Perforation dots for desktop */}
                <div className="hidden md:block absolute top-1/2 -right-4 w-8 h-8 bg-[#191022] rounded-full z-30 translate-y-[-50%]"></div>
              </div>
              
              {/* Right Side (QR) */}
              <div className="bg-[#1e1528] p-8 md:p-10 flex flex-col items-center justify-center text-center relative md:w-[30%]">
                {/* Perforation dots for desktop/mobile */}
                <div className="hidden md:block absolute top-1/2 -left-4 w-8 h-8 bg-[#191022] rounded-full z-30 translate-y-[-50%]"></div>
                <div className="md:hidden absolute -top-4 left-1/2 w-8 h-8 bg-[#191022] rounded-full z-30 translate-x-[-50%]"></div>
                <div className="md:hidden absolute -top-4 -left-4 w-8 h-8 bg-[#191022] rounded-full z-30"></div>
                <div className="md:hidden absolute -top-4 -right-4 w-8 h-8 bg-[#191022] rounded-full z-30"></div>
                
                <div className="mb-6 bg-white p-3 rounded-xl shadow-lg shadow-white/5">
                  <div className="w-32 h-32 bg-black flex items-center justify-center overflow-hidden">
                    <svg className="w-full h-full text-black bg-white" fill="currentColor" viewBox="0 0 100 100">
                      <path d="M0 0h100v100H0z" fill="white"></path>
                      <path d="M10 10h25v25H10zM40 10h10v10H40zM65 10h25v25H65zM15 15v15h15V15zM70 15v15h15V15zM10 40h10v10H10zM25 40h15v15H25zM50 40h10v10H50zM70 40h10v10H70zM10 65h25v25H10zM15 70v15h15V70zM40 55h15v15H40zM65 55h10v10H65zM55 70h15v15H55zM80 65h10v10H80zM80 80h10v10H80z"></path>
                    </svg>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Scanează la intrare</p>
                <p className="text-white font-mono text-xl tracking-wider font-bold mb-6">#BNT-8821</p>
                <div className="w-full border-t border-dashed border-white/10 pt-6 mt-auto">
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Acest bilet este unic și netransmisibil. Prezintă codul QR la poartă pentru validare.
                  </p>
                </div>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 w-full justify-center mt-10 max-w-2xl">
              <button className="flex-1 min-w-[200px] h-14 bg-gradient-to-r from-[#7f13ec] to-[#9d4edd] hover:to-[#7f13ec] text-white rounded-xl font-bold text-base transition-all transform hover:-translate-y-1 hover:shadow-lg hover:shadow-[#7f13ec]/30 flex items-center justify-center gap-2 group">
                <span className="material-symbols-outlined group-hover:animate-bounce">download</span>
                <span>Descarcă PDF</span>
              </button>
              <button className="flex-1 min-w-[200px] h-14 bg-[#241a30] border border-white/10 hover:bg-white/5 text-white rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 group">
                <span className="material-symbols-outlined">share</span>
                <span>Trimite pe Email</span>
              </button>
              <button className="flex-1 min-w-[200px] h-14 bg-[#241a30] border border-white/10 hover:bg-white/5 text-white rounded-xl font-bold text-base transition-all flex items-center justify-center gap-2 group">
                <span className="material-symbols-outlined">wallet</span>
                <span>Apple Wallet</span>
              </button>
            </div>
            
            <p className="mt-8 text-slate-500 text-sm text-center">
              Probleme cu biletul? <a className="text-[#00e5ff] hover:underline" href="#">Contactează suportul</a>
            </p>
          </div>
        </main>

        <footer className="flex flex-col gap-6 px-5 py-10 text-center bg-[#241a30] border-t border-white/5 relative z-10 mt-auto">
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
            <a className="text-slate-400 hover:text-white transition-colors min-w-40" href="#">Termeni și Condiții</a>
            <a className="text-slate-400 hover:text-white transition-colors min-w-40" href="#">Politica de Confidențialitate</a>
            <a className="text-slate-400 hover:text-white transition-colors min-w-40" href="#">Contact</a>
          </div>
          <p className="text-slate-600 text-xs">© 2024 Banaton Fest. Toate drepturile rezervate.</p>
        </footer>
      </div>
    </div>
  );
}
