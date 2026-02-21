import { Link } from 'react-router-dom';

export default function Checkout() {
  return (
    <div className="bg-[#1A0B2E] text-slate-100 font-display min-h-screen flex flex-col antialiased selection:bg-[#00E5FF] selection:text-[#1A0B2E]">
      <div className="relative flex h-auto w-full flex-col bg-[#130026]/90 backdrop-blur-md sticky top-0 z-50 border-b border-[#432C7A]">
        <div className="layout-container flex h-full grow flex-col">
          <header className="flex items-center justify-between whitespace-nowrap px-4 lg:px-10 py-4 max-w-7xl mx-auto w-full">
            <Link to="/" className="flex items-center gap-4 text-white">
              <div className="size-10 text-[#FFD700] flex items-center justify-center bg-[#2D1B4E] rounded-lg border border-[#432C7A]">
                <span className="material-symbols-outlined text-[28px]">music_note</span>
              </div>
              <div className="flex flex-col">
                <h2 className="text-white text-xl font-bold leading-tight tracking-tight">Banaton Fest</h2>
                <span className="text-[#00E5FF] text-[10px] font-bold tracking-widest uppercase">Timișoara</span>
              </div>
            </Link>
            <div className="flex flex-1 justify-end gap-6 items-center">
              <div className="hidden md:flex items-center gap-2 text-[#B39DDB] text-sm font-medium">
                <span className="material-symbols-outlined text-lg text-[#00E5FF]">lock</span>
                Plată Securizată SSL
              </div>
              <div className="h-10 w-10 rounded-full bg-[#2D1B4E] border border-[#432C7A] flex items-center justify-center overflow-hidden ring-2 ring-transparent hover:ring-[#00E5FF] transition-all">
                <img alt="User profile avatar" className="h-full w-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDsSbQf1VoDhIvzZnfy6IIZxTjx-TvvJiwdfxnCa6-d9Zeua10qZ2k11QPwoPUAeYqijQ6ODYkFRMIp-2HNrjT37cUFHiQwi0lTb8gZjMH_0OkwbW9r3tndbkmJum7hBqpzL1zs54Ce0Aoq-vcZFqg4lfMHGUqKww9o6lwkDDxpHo_sZQ2xnfd3NEtaAitwdDiwvi-Ii1qVysCrQBHU5ZbAmyi0d8vLnIPABmyo6OLrx4XxH38ufgv1qm5tYt4T6U18dLbpAue6Trcc"/>
              </div>
            </div>
          </header>
        </div>
      </div>

      <main className="flex-grow w-full max-w-7xl mx-auto px-4 lg:px-10 py-8 lg:py-12 relative z-10">
        <div className="fixed top-20 left-0 w-96 h-96 bg-[#00E5FF]/5 rounded-full blur-3xl -z-10 pointer-events-none"></div>
        <div className="fixed bottom-0 right-0 w-[500px] h-[500px] bg-[#7C4DFF]/10 rounded-full blur-3xl -z-10 pointer-events-none"></div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 xl:gap-16">
          <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-8">
            <div className="flex flex-col gap-2 mb-2">
              <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
                <span className="w-1.5 h-8 bg-gradient-to-b from-[#00E5FF] to-[#7C4DFF] rounded-full block"></span>
                Finalizare Comandă
              </h1>
              <p className="text-[#B39DDB] text-base font-normal pl-5">Completează detaliile pentru a primi biletele pe email.</p>
            </div>

            <section className="bg-[#2D1B4E]/70 backdrop-blur-md rounded-2xl p-6 border border-[#432C7A] shadow-xl">
              <div className="flex items-center gap-4 mb-6 border-b border-[#432C7A] pb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 font-bold text-lg shadow-[0_0_15px_rgba(0,229,255,0.3)]">1</div>
                <h3 className="text-white text-xl font-bold tracking-tight">Date de Facturare</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <label className="flex flex-col gap-2 group">
                  <span className="text-slate-200 text-sm font-medium group-focus-within:text-[#00E5FF] transition-colors">Nume</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#B39DDB] group-focus-within:text-[#00E5FF] transition-colors">person</span>
                    <input className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#24123E] border border-[#432C7A] text-white placeholder:text-gray-500 focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all duration-200" placeholder="Popescu" type="text"/>
                  </div>
                </label>
                <label className="flex flex-col gap-2 group">
                  <span className="text-slate-200 text-sm font-medium group-focus-within:text-[#00E5FF] transition-colors">Prenume</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#B39DDB] group-focus-within:text-[#00E5FF] transition-colors">badge</span>
                    <input className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#24123E] border border-[#432C7A] text-white placeholder:text-gray-500 focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all duration-200" placeholder="Ion" type="text"/>
                  </div>
                </label>
                <label className="flex flex-col gap-2 md:col-span-2 group">
                  <span className="text-slate-200 text-sm font-medium group-focus-within:text-[#00E5FF] transition-colors">Adresă de Email</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#B39DDB] group-focus-within:text-[#00E5FF] transition-colors">mail</span>
                    <input className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#24123E] border border-[#432C7A] text-white placeholder:text-gray-500 focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all duration-200" placeholder="ion.popescu@email.com" type="email"/>
                  </div>
                  <p className="text-xs text-[#B39DDB] mt-0.5 flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">info</span> Biletele vor fi trimise la această adresă.</p>
                </label>
                <label className="flex flex-col gap-2 group">
                  <span className="text-slate-200 text-sm font-medium group-focus-within:text-[#00E5FF] transition-colors">Telefon</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#B39DDB] group-focus-within:text-[#00E5FF] transition-colors">call</span>
                    <input className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#24123E] border border-[#432C7A] text-white placeholder:text-gray-500 focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all duration-200" placeholder="07xx xxx xxx" type="tel"/>
                  </div>
                </label>
                <label className="flex flex-col gap-2 group">
                  <span className="text-slate-200 text-sm font-medium group-focus-within:text-[#00E5FF] transition-colors">Oraș / Județ</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#B39DDB] group-focus-within:text-[#00E5FF] transition-colors">location_on</span>
                    <input className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#24123E] border border-[#432C7A] text-white placeholder:text-gray-500 focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all duration-200" placeholder="Timișoara, Timiș" type="text"/>
                  </div>
                </label>
                <label className="flex flex-col gap-2 md:col-span-2 group">
                  <span className="text-slate-200 text-sm font-medium group-focus-within:text-[#00E5FF] transition-colors">Adresă de Facturare</span>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-[#B39DDB] group-focus-within:text-[#00E5FF] transition-colors">home</span>
                    <input className="w-full h-12 pl-11 pr-4 rounded-xl bg-[#24123E] border border-[#432C7A] text-white placeholder:text-gray-500 focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all duration-200" placeholder="Strada Victoriei, Nr. 12, Bl. A4, Ap. 20" type="text"/>
                  </div>
                </label>
              </div>
            </section>

            <section className="bg-[#2D1B4E]/70 backdrop-blur-md rounded-2xl p-6 border border-[#432C7A] shadow-xl">
              <div className="flex items-center gap-4 mb-6 border-b border-[#432C7A] pb-4">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-[#00E5FF]/20 text-[#00E5FF] border border-[#00E5FF]/30 font-bold text-lg shadow-[0_0_15px_rgba(0,229,255,0.3)]">2</div>
                <h3 className="text-white text-xl font-bold tracking-tight">Metodă de Plată</h3>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <label className="cursor-pointer group relative">
                  <input defaultChecked className="peer sr-only" name="payment_method" type="radio"/>
                  <div className="flex flex-col items-center justify-center p-6 rounded-xl bg-[#24123E] border border-[#432C7A] hover:border-[#00E5FF]/50 hover:bg-[#24123E]/80 peer-checked:border-[#00E5FF] peer-checked:bg-[#00E5FF]/10 peer-checked:shadow-[0_0_15px_rgba(0,229,255,0.15)] transition-all relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-[#00E5FF]/5 to-transparent opacity-0 peer-checked:opacity-100 transition-opacity"></div>
                    <span className="material-symbols-outlined text-4xl mb-3 text-white group-hover:text-[#00E5FF] transition-colors relative z-10">credit_card</span>
                    <span className="text-white font-medium text-lg relative z-10">Plată cu Cardul Online</span>
                    <span className="text-[#B39DDB] text-sm mt-1 relative z-10 text-center max-w-sm">Vei fi redirecționat către pagina securizată Stripe pentru a finaliza plata. Acceptăm Visa și Mastercard.</span>
                  </div>
                  <div className="absolute top-4 right-4 opacity-0 peer-checked:opacity-100 text-[#00E5FF] transition-opacity z-20">
                    <span className="material-symbols-outlined filled text-2xl drop-shadow-[0_0_8px_rgba(0,229,255,0.5)]">check_circle</span>
                  </div>
                </label>
              </div>
              <label className="flex items-start gap-3 mt-6 cursor-pointer group">
                <input className="mt-1 w-5 h-5 rounded border-[#432C7A] bg-[#24123E] text-[#00E5FF] focus:ring-[#00E5FF] focus:ring-offset-[#1A0B2E]" type="checkbox"/>
                <span className="text-[#B39DDB] text-sm leading-normal select-none group-hover:text-white transition-colors">
                  Sunt de acord cu <a className="text-[#00E5FF] hover:underline hover:text-[#00E5FF]/80 transition-colors" href="#">Termenii și Condițiile</a> și <a className="text-[#00E5FF] hover:underline hover:text-[#00E5FF]/80 transition-colors" href="#">Politica de Confidențialitate</a> Banaton Fest.
                </span>
              </label>
            </section>
          </div>

          <div className="lg:col-span-5 xl:col-span-4 relative">
            <div className="sticky top-28 flex flex-col gap-6">
              <div className="rounded-2xl bg-[#2D1B4E] border border-[#432C7A] overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                <div className="bg-[#24123E] px-6 py-5 border-b border-[#432C7A] flex items-center justify-between relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-[#00E5FF]/10 to-transparent"></div>
                  <h3 className="text-white text-lg font-bold relative z-10 flex items-center gap-2">
                    <span className="material-symbols-outlined text-[#FFD700]">shopping_cart</span>
                    Sumar Comandă
                  </h3>
                </div>
                <div className="p-6 flex flex-col gap-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-3 group bg-[#1A0B2E]/30 p-3 rounded-xl border border-transparent hover:border-[#00E5FF]/30 transition-all">
                      <div className="bg-cover bg-center w-14 h-14 rounded-lg shrink-0 border border-[#432C7A] shadow-sm" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuAY7mtdEL5De-XFzvo3sq3GeboVN0VDlesbA9hv9xgwxfro2T1Tp0ssU7cQMCFVXIx1Sy3pRN7yz-DMG8rAfUXSNrWDa_CM840QSQRezEsogMc9w9BSXQJOhjbyqnnyibqGv9pbiS4grpjU3444KadoJawaRKycJGt99edfGv1Wq1qyqljLF1mik2OiaiAcQcnfs8y5NkVabXtYGLb3TZTsqrPJgOqIMflRw8FPNf_1Xi6NSbpdRFi_bNQLaJA-CH4Zlh2ChMih0LC9')"}}></div>
                      <div className="flex flex-col grow">
                        <div className="flex justify-between items-start">
                          <span className="text-white font-bold text-sm">Acces General - 4 Zile</span>
                          <span className="text-[#FFD700] font-bold text-sm">600 lei</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[#B39DDB] text-xs bg-[#24123E] px-2 py-0.5 rounded">2 x 300 lei</span>
                          <button className="text-[#B39DDB] hover:text-red-400 transition-colors p-1 hover:bg-red-400/10 rounded">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-start gap-3 group bg-[#1A0B2E]/30 p-3 rounded-xl border border-transparent hover:border-[#00E5FF]/30 transition-all">
                      <div className="bg-cover bg-center w-14 h-14 rounded-lg shrink-0 border border-[#432C7A] shadow-sm" style={{backgroundImage: "url('https://lh3.googleusercontent.com/aida-public/AB6AXuDSPhQvXBjTktsUE4VPzPOYIzqqpJrSKBT1Z3bOP9ClY2xndZCsO2ERlAJNs0kpoxTrI6YsIawkO9FRFupS_GOvthAX-L7PIQqPD2_lt0T_BYxxgDx7pei1QGlKmlwqy_Wj1la-fn8XtiMPiRJ2CXn8u_rcJtQJfdsd1MRIlUV5xX_Pd8A9J6sBlHT6QaRy-WnOjFD-Gi2qUfIA2JLDumX4_bgSQcHQiam5mdxH03mGFrpBWoy03F3z05zTIGPXSQKoqs08ZKEDq90C')"}}></div>
                      <div className="flex flex-col grow">
                        <div className="flex justify-between items-start">
                          <span className="text-white font-bold text-sm">VIP Experience - 1 Zi</span>
                          <span className="text-[#FFD700] font-bold text-sm">450 lei</span>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-[#B39DDB] text-xs bg-[#24123E] px-2 py-0.5 rounded">Sâmbătă, 15 Iulie</span>
                          <button className="text-[#B39DDB] hover:text-red-400 transition-colors p-1 hover:bg-red-400/10 rounded">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <input className="flex-1 h-10 px-3 rounded-lg bg-[#1A0B2E] border border-[#432C7A] text-white text-sm placeholder:text-[#B39DDB]/50 focus:border-[#00E5FF] focus:ring-1 focus:ring-[#00E5FF] transition-all" placeholder="Cod de reducere" type="text"/>
                    <button className="h-10 px-4 rounded-lg bg-[#24123E] border border-[#432C7A] hover:bg-[#00E5FF]/20 hover:border-[#00E5FF]/50 text-white text-sm font-medium transition-all">Aplică</button>
                  </div>
                  <div className="h-px bg-gradient-to-r from-transparent via-[#432C7A] to-transparent w-full"></div>
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B39DDB]">Subtotal</span>
                      <span className="text-white font-medium">1050 lei</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B39DDB]">Taxe procesare</span>
                      <span className="text-white font-medium">15 lei</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-[#B39DDB]">TVA (19%)</span>
                      <span className="text-white font-medium">Inclus</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-end border-t border-dashed border-[#432C7A] pt-4 mt-2">
                    <div className="flex flex-col">
                      <span className="text-[#B39DDB] text-xs uppercase tracking-wider font-semibold mb-1">Total de plată</span>
                      <span className="text-3xl font-extrabold text-white tracking-tight drop-shadow-md">1065 <span className="text-lg text-[#00E5FF]">lei</span></span>
                    </div>
                  </div>
                  <Link to="/success" className="w-full h-14 bg-gradient-to-r from-[#FFD700] to-[#FDB931] hover:from-[#FFE066] hover:to-[#FDB931] text-[#24123E] rounded-xl font-bold text-lg shadow-[0_0_20px_rgba(255,215,0,0.3)] hover:shadow-[0_0_30px_rgba(255,215,0,0.5)] transition-all duration-300 flex items-center justify-center gap-2 transform active:scale-[0.98] group">
                    <span className="material-symbols-outlined font-bold group-hover:rotate-12 transition-transform">lock_open</span>
                    Plătește 1065 RON
                  </Link>
                  <p className="text-xs text-[#B39DDB] text-center mt-2">Vei fi redirecționat către pagina securizată Stripe pentru a finaliza plata.</p>
                  <div className="flex justify-center gap-4 opacity-60 grayscale hover:grayscale-0 transition-all duration-500 mt-2">
                    <div className="h-6 w-10 bg-white/10 rounded flex items-center justify-center text-xs text-white font-bold font-sans">VISA</div>
                    <div className="h-6 w-10 bg-white/10 rounded flex items-center justify-center text-xs text-white font-bold font-sans">MC</div>
                    <div className="flex items-center gap-1 text-[10px] text-[#B39DDB]">
                      <span className="material-symbols-outlined text-sm text-green-400">verified_user</span>
                      <span>Securizat SSL</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl bg-[#2D1B4E]/50 border border-[#432C7A] p-4 flex gap-4 items-center shadow-lg backdrop-blur-sm">
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#00E5FF] to-[#7C4DFF] flex items-center justify-center text-white shrink-0 shadow-[0_0_10px_rgba(0,229,255,0.4)]">
                  <span className="material-symbols-outlined text-[20px]">support_agent</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-white text-sm font-bold">Ai nevoie de ajutor?</span>
                  <span className="text-[#B39DDB] text-xs">Contactează-ne la <a className="text-[#00E5FF] hover:text-white hover:underline transition-colors" href="#">suport@banaton.ro</a></span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="mt-auto border-t border-[#432C7A] bg-[#130026] py-8 relative z-10">
        <div className="max-w-7xl mx-auto px-4 lg:px-10 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[#B39DDB] text-sm flex items-center gap-2">
            © 2024 Banaton Fest. 
            <span className="hidden md:inline text-white/20">|</span>
            <span className="text-white/50">Made in Timișoara</span>
          </p>
          <div className="flex gap-6">
            <a className="text-[#B39DDB] hover:text-[#00E5FF] text-sm transition-colors" href="#">Termeni și Condiții</a>
            <a className="text-[#B39DDB] hover:text-[#00E5FF] text-sm transition-colors" href="#">Politica de Confidențialitate</a>
            <a className="text-[#B39DDB] hover:text-[#00E5FF] text-sm transition-colors" href="#">Cookies</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
