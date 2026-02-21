import { Link } from 'react-router-dom';

export default function DaySelection() {
  return (
    <div className="bg-[#1a0b2e] text-slate-100 antialiased min-h-screen flex flex-col font-display">
      <header className="sticky top-0 z-50 flex items-center justify-between whitespace-nowrap border-b border-solid border-b-[#432c7a] bg-[#1a0b2e]/90 backdrop-blur-md px-10 py-3 shadow-lg shadow-purple-900/10">
        <Link to="/" className="flex items-center gap-4 text-white">
          <div className="size-8 text-[#0dccf2] flex items-center justify-center">
            <span className="material-symbols-outlined text-3xl">festival</span>
          </div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em]">Banaton Fest</h2>
        </Link>
        <div className="flex flex-1 justify-end gap-8">
          <div className="hidden md:flex items-center gap-9">
            <Link to="/" className="text-white text-sm font-medium leading-normal hover:text-[#0dccf2] transition-colors">Line-up</Link>
            <a href="#" className="text-white text-sm font-medium leading-normal hover:text-[#0dccf2] transition-colors">Info</a>
            <a href="#" className="text-white text-sm font-medium leading-normal hover:text-[#0dccf2] transition-colors">Contact</a>
            <Link to="/tickets" className="text-white text-sm font-medium leading-normal hover:text-[#0dccf2] transition-colors">Bilete</Link>
          </div>
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-full h-10 px-4 bg-[#0dccf2] text-[#1a0b2e] hover:bg-[#0bb8da] transition-colors text-sm font-bold leading-normal tracking-[0.015em]">
            <span className="truncate">Contul meu</span>
          </button>
        </div>
      </header>

      <main className="flex-grow flex justify-center w-full px-4 py-8 md:px-10 lg:px-20">
        <div className="layout-content-container flex flex-col w-full max-w-[1200px] gap-8">
          <div className="flex flex-col gap-3">
            <div className="flex gap-6 justify-between items-end">
              <p className="text-white text-base font-medium leading-normal">Pasul 3 din 4</p>
              <p className="text-[#b8a5d6] text-sm font-normal">Următorul: Detalii Client</p>
            </div>
            <div className="rounded-full h-2 w-full bg-[#432c7a] overflow-hidden">
              <div className="h-full rounded-full bg-[#0dccf2] shadow-[0_0_10px_rgba(13,204,242,0.6)]" style={{width: "75%"}}></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-8 flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <h1 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em]">
                  Selecție Zile și Prețuri
                </h1>
                <p className="text-[#b8a5d6] text-base font-normal leading-normal max-w-2xl">
                  Ai selectat <span className="text-white font-semibold">Abonament 2 Zile</span>. Alege cele 2 zile în care dorești să participi la festival. Sâmbăta este exclusă pentru acest tip de abonament.
                </p>
              </div>
              <div className="flex">
                <div className="flex h-8 items-center justify-center gap-x-2 rounded-full bg-[#432c7a] border border-[#2d1b4e] pl-3 pr-4">
                  <span className="material-symbols-outlined text-[#0dccf2] text-[20px]">confirmation_number</span>
                  <p className="text-white text-sm font-medium leading-normal">Abonament 2 Zile (Activ)</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Day 1 */}
                <div className="group relative cursor-pointer">
                  <div className="absolute -inset-0.5 bg-[#0dccf2] rounded-xl blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
                  <div className="relative flex flex-col justify-between h-full bg-[#2d1b4e] border-2 border-[#0dccf2] rounded-xl p-5 shadow-lg shadow-cyan-900/20">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-[#b8a5d6] text-sm font-medium uppercase tracking-wider">Ziua 1</span>
                        <h3 className="text-white text-xl font-bold mt-1">Vineri</h3>
                        <p className="text-[#b8a5d6] text-sm">29 Mai</p>
                      </div>
                      <div className="size-6 rounded-full bg-[#0dccf2] flex items-center justify-center text-[#1a0b2e] shadow-[0_0_8px_rgba(13,204,242,0.6)]">
                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end border-t border-[#432c7a] pt-4 mt-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-[#b8a5d6]">Line-up principal</span>
                        <span className="text-white text-sm font-medium truncate max-w-[150px]">Subcarpați, Argatu</span>
                      </div>
                      <span className="text-[#0dccf2] text-lg font-bold">70 RON</span>
                    </div>
                  </div>
                </div>

                {/* Day 2 */}
                <div className="group relative cursor-not-allowed opacity-60 grayscale">
                  <div className="relative flex flex-col justify-between h-full bg-[#2d1b4e] border border-[#432c7a] rounded-xl p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-[#b8a5d6] text-sm font-medium uppercase tracking-wider">Ziua 2</span>
                        <h3 className="text-white text-xl font-bold mt-1">Sâmbătă</h3>
                        <p className="text-[#b8a5d6] text-sm">30 Mai</p>
                      </div>
                      <div className="size-6 rounded-full bg-[#432c7a] flex items-center justify-center text-[#b8a5d6]">
                        <span className="material-symbols-outlined text-sm">block</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end border-t border-[#432c7a] pt-4 mt-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-[#b8a5d6]">Status</span>
                        <span className="text-red-400 text-sm font-medium">Indisponibil</span>
                      </div>
                      <span className="text-[#b8a5d6] text-lg font-bold decoration-slice">80 RON</span>
                    </div>
                    <div className="absolute inset-0 bg-black/60 rounded-xl flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity backdrop-blur-[2px]">
                      <span className="text-white text-sm font-bold bg-[#432c7a] px-4 py-2 rounded-full border border-red-500/50">Exclus din pachetul de 2 zile</span>
                    </div>
                  </div>
                </div>

                {/* Day 3 */}
                <div className="group relative cursor-pointer hover:-translate-y-1 transition-transform duration-300">
                  <div className="relative flex flex-col justify-between h-full bg-[#2d1b4e] border border-[#432c7a] hover:border-[#0dccf2]/50 rounded-xl p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-[#b8a5d6] text-sm font-medium uppercase tracking-wider">Ziua 3</span>
                        <h3 className="text-white text-xl font-bold mt-1">Duminică</h3>
                        <p className="text-[#b8a5d6] text-sm">31 Mai</p>
                      </div>
                      <div className="size-6 rounded-full border border-[#b8a5d6] flex items-center justify-center text-transparent group-hover:text-[#b8a5d6]/50 transition-colors">
                        <span className="material-symbols-outlined text-sm">add</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end border-t border-[#432c7a] pt-4 mt-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-[#b8a5d6]">Line-up principal</span>
                        <span className="text-white text-sm font-medium truncate max-w-[150px]">Lupii lui Calancea</span>
                      </div>
                      <span className="text-white text-lg font-bold group-hover:text-[#0dccf2] transition-colors">70 RON</span>
                    </div>
                  </div>
                </div>

                {/* Day 4 */}
                <div className="group relative cursor-pointer">
                  <div className="absolute -inset-0.5 bg-[#0dccf2] rounded-xl blur opacity-40 group-hover:opacity-70 transition duration-500"></div>
                  <div className="relative flex flex-col justify-between h-full bg-[#2d1b4e] border-2 border-[#0dccf2] rounded-xl p-5 shadow-lg shadow-cyan-900/20">
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex flex-col">
                        <span className="text-[#b8a5d6] text-sm font-medium uppercase tracking-wider">Ziua 4</span>
                        <h3 className="text-white text-xl font-bold mt-1">Luni</h3>
                        <p className="text-[#b8a5d6] text-sm">01 Iunie</p>
                      </div>
                      <div className="size-6 rounded-full bg-[#0dccf2] flex items-center justify-center text-[#1a0b2e] shadow-[0_0_8px_rgba(13,204,242,0.6)]">
                        <span className="material-symbols-outlined text-sm font-bold">check</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-end border-t border-[#432c7a] pt-4 mt-2">
                      <div className="flex flex-col">
                        <span className="text-xs text-[#b8a5d6]">Line-up principal</span>
                        <span className="text-white text-sm font-medium truncate max-w-[150px]">DJ Set & Chill</span>
                      </div>
                      <span className="text-[#0dccf2] text-lg font-bold">50 RON</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3 bg-[#432c7a]/40 border border-blue-500/30 p-4 rounded-xl">
                <span className="material-symbols-outlined text-[#0dccf2] mt-0.5">info</span>
                <div className="flex flex-col gap-1">
                  <p className="text-white text-sm font-bold">Informație importantă</p>
                  <p className="text-[#b8a5d6] text-sm">Ai selectat maximul de 2 zile permis de abonamentul tău. Pentru a adăuga mai multe zile, te rugăm să schimbi tipul de abonament.</p>
                </div>
              </div>

              <div className="flex lg:hidden pt-4">
                <Link to="/tickets" className="flex items-center gap-2 text-[#b8a5d6] hover:text-white transition-colors">
                  <span className="material-symbols-outlined">arrow_back</span>
                  <span className="font-medium">Înapoi la Pasul 2</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-4 relative">
              <div className="sticky top-28 flex flex-col gap-6 bg-[#2d1b4e] border border-[#432c7a] rounded-2xl p-6 shadow-2xl shadow-purple-900/40">
                <div className="flex items-center gap-2 pb-4 border-b border-[#432c7a]">
                  <span className="material-symbols-outlined text-[#0dccf2]">shopping_cart</span>
                  <h3 className="text-white text-xl font-bold">Sumar Comandă</h3>
                </div>
                <div className="flex flex-col gap-6 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                  <div className="flex flex-col gap-3 pb-4 border-b border-[#432c7a] border-dashed">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-base">Abonament 2 Zile</span>
                          <button className="text-red-400 hover:text-red-300 transition-colors" title="Șterge biletul">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                        <p className="text-[#b8a5d6] text-xs">Acces General</p>
                      </div>
                      <p className="text-white font-bold text-lg">120 RON</p>
                    </div>
                    <div className="pl-3 border-l-2 border-[#432c7a]/50 flex flex-col gap-1.5 ml-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#b8a5d6]">Ziua 1 (Vineri)</span>
                        <span className="text-[#0dccf2] text-xs font-medium">70 RON</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-[#b8a5d6]">Ziua 4 (Luni)</span>
                        <span className="text-[#0dccf2] text-xs font-medium">50 RON</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 pb-4 border-b border-[#432c7a] border-dashed">
                    <div className="flex justify-between items-start">
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-bold text-base">Bilet 1 Zi</span>
                          <button className="text-red-400 hover:text-red-300 transition-colors" title="Șterge biletul">
                            <span className="material-symbols-outlined text-lg">delete</span>
                          </button>
                        </div>
                        <p className="text-[#b8a5d6] text-xs">Student</p>
                      </div>
                      <p className="text-white font-bold text-lg">40 RON</p>
                    </div>
                    <div className="pl-3 border-l-2 border-[#432c7a]/50 flex flex-col gap-1.5 ml-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-[#b8a5d6]">Ziua 1 (Vineri)</span>
                        <span className="text-[#0dccf2] text-xs font-medium">40 RON</span>
                      </div>
                    </div>
                  </div>

                  <button className="flex items-center justify-center gap-2 w-full py-3 border border-dashed border-[#0dccf2]/50 rounded-xl text-[#0dccf2] hover:bg-[#0dccf2]/10 transition-colors group">
                    <span className="material-symbols-outlined group-hover:scale-110 transition-transform">add_circle</span>
                    <span className="font-semibold text-sm">Adaugă încă un bilet</span>
                  </button>

                  <div className="flex flex-col gap-2 pt-2">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#b8a5d6]">Subtotal Bilete</span>
                      <span className="text-white font-medium">160 RON</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-[#b8a5d6]">Taxe procesare</span>
                      <span className="text-white font-medium">10 RON</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between items-end pt-4 border-t border-[#432c7a] mt-auto">
                  <div className="flex flex-col">
                    <span className="text-[#b8a5d6] text-sm">Total de plată</span>
                    <span className="text-xs text-[#b8a5d6] font-light">TVA inclus</span>
                  </div>
                  <p className="text-3xl font-black text-[#0dccf2] tracking-tight drop-shadow-[0_0_8px_rgba(13,204,242,0.4)]">170 RON</p>
                </div>

                <div className="flex flex-col gap-3 mt-4">
                  <Link to="/checkout" className="flex w-full cursor-pointer items-center justify-center overflow-hidden rounded-full h-12 px-6 bg-[#0dccf2] text-[#1a0b2e] hover:bg-[#0bb8da] hover:shadow-[0_0_20px_rgba(13,204,242,0.6)] transition-all duration-300 text-base font-bold leading-normal tracking-[0.015em]">
                    Continuă
                  </Link>
                </div>
                <div className="flex items-center justify-center gap-2 pt-2 opacity-50">
                  <span className="material-symbols-outlined text-xs">lock</span>
                  <span className="text-[10px] uppercase tracking-widest">Plată Securizată</span>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex pt-4">
            <Link to="/tickets" className="group flex items-center gap-2 text-[#b8a5d6] hover:text-[#0dccf2] transition-colors px-4 py-2 rounded-lg hover:bg-[#432c7a]">
              <span className="material-symbols-outlined group-hover:-translate-x-1 transition-transform">arrow_back</span>
              <span className="font-medium">Înapoi la Pasul 2</span>
            </Link>
          </div>
        </div>
      </main>

      <footer className="mt-12 py-8 bg-[#130723] border-t border-[#432c7a] text-center">
        <p className="text-[#b8a5d6] text-sm">© 2024 Banaton Fest Timișoara. Toate drepturile rezervate.</p>
      </footer>
    </div>
  );
}
