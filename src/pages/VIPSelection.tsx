import { Link } from 'react-router-dom';
import { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

export default function VIPSelection() {
  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);

  const handleZoneClick = (zoneId: string) => {
    setActiveZone(zoneId);
  };

  const handleTableSelect = (tableId: string) => {
    setSelectedTable(tableId);
    setActiveZone(null);
  };

  const TableSelectorModal = ({ zoneId, onClose }: { zoneId: string, onClose: () => void }) => {
    const [start, end] = zoneId.split('-').map(Number);
    const tables = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-[#1A0B2E] border border-[#4C2A85] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-[0_0_50px_rgba(127,19,236,0.5)] overflow-hidden">
          <div className="p-6 border-b border-[#4C2A85] flex justify-between items-center bg-[#241242]">
            <div>
              <h3 className="text-white text-xl font-bold">Alege Masa</h3>
              <p className="text-indigo-300 text-sm">Zona {zoneId}</p>
            </div>
            <button onClick={onClose} className="text-indigo-300 hover:text-white transition-colors">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
          
          <div className="p-6 overflow-y-auto custom-scrollbar bg-[#130026]">
            <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-3">
              {tables.map((num) => {
                const tableId = `Masa ${num}`;
                const isSelected = selectedTable === tableId;
                return (
                  <button
                    key={num}
                    onClick={() => handleTableSelect(tableId)}
                    className={cn(
                      "aspect-square rounded-xl flex items-center justify-center font-bold text-sm transition-all border-2",
                      isSelected
                        ? "bg-accent-cyan border-accent-cyan text-[#130026] shadow-[0_0_15px_rgba(0,229,255,0.5)]"
                        : "bg-[#241242] border-[#4C2A85] text-white hover:border-accent-gold hover:text-accent-gold hover:bg-[#2D1B4E]"
                    )}
                  >
                    {num}
                  </button>
                );
              })}
            </div>
          </div>
          
          <div className="p-4 border-t border-[#4C2A85] bg-[#1A0B2E] text-center">
            <p className="text-xs text-indigo-300">Toate mesele au capacitate de 6 persoane.</p>
          </div>
        </div>
      </div>
    );
  };

  const ZoneCircle = ({ id, label, price, onClick, disabled }: { id: string, label: string, price: number, onClick: () => void, disabled?: boolean }) => {
    // Check if the currently selected table belongs to this zone
    const [start, end] = id.split('-').map(Number);
    let isZoneSelected = false;
    if (selectedTable) {
      const tableNum = parseInt(selectedTable.replace('Masa ', ''));
      if (tableNum >= start && tableNum <= end) {
        isZoneSelected = true;
      }
    }

    return (
      <div 
        onClick={!disabled ? onClick : undefined}
        className={cn(
          "relative size-32 rounded-full border-2 flex flex-col items-center justify-center cursor-pointer transition-all duration-300 group",
          disabled 
            ? "border-[#4C2A85] bg-[#241242] cursor-not-allowed opacity-50" 
            : isZoneSelected
              ? "bg-accent-cyan border-accent-cyan text-[#130026] shadow-[0_0_30px_rgba(0,229,255,0.6)] scale-110 z-10"
              : "bg-[#1A0B2E] border-accent-gold text-accent-gold hover:bg-accent-gold/10 hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]"
        )}
      >
        <span className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">Mesele</span>
        <span className="text-2xl font-black">{label}</span>
        {!disabled && (
          <div className={cn(
            "absolute -bottom-8 bg-[#1A0B2E] border border-[#4C2A85] px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none",
            isZoneSelected && "opacity-100 bottom-[-3rem]"
          )}>
            {price} RON / Masă
          </div>
        )}
        {isZoneSelected && (
          <div className="absolute -top-2 -right-2 bg-white text-[#130026] size-6 flex items-center justify-center rounded-full border-2 border-[#130026] shadow-lg">
            <span className="material-symbols-outlined text-sm font-bold">check</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#130026] text-slate-100 min-h-screen flex flex-col overflow-x-hidden font-display relative">
      {activeZone && <TableSelectorModal zoneId={activeZone} onClose={() => setActiveZone(null)} />}
      
      <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-[#4C2A85] px-10 py-3 bg-[#130026] sticky top-0 z-50 shadow-lg shadow-purple-900/10">
        <Link to="/" className="flex items-center gap-4 text-white">
          <div className="size-8 text-accent-gold drop-shadow-[0_0_8px_rgba(255,215,0,0.5)]">
            <span className="material-symbols-outlined text-3xl">festival</span>
          </div>
          <h2 className="text-white text-lg font-bold leading-tight tracking-[-0.015em] bg-clip-text text-transparent bg-gradient-to-r from-white to-accent-gold">Banaton Fest</h2>
        </Link>
        <div className="flex flex-1 justify-end gap-8">
          <div className="hidden md:flex items-center gap-9">
            <Link to="/" className="text-white text-sm font-medium leading-normal hover:text-accent-cyan transition-colors">Acasă</Link>
            <Link to="/" className="text-white text-sm font-medium leading-normal hover:text-accent-cyan transition-colors">Line-up</Link>
            <a href="#" className="text-white text-sm font-medium leading-normal hover:text-accent-cyan transition-colors">Info</a>
            <a href="#" className="text-white text-sm font-medium leading-normal hover:text-accent-cyan transition-colors">Contact</a>
          </div>
          <button className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 px-4 bg-accent-gold text-[#130026] text-sm font-bold leading-normal tracking-[0.015em] hover:bg-white hover:text-accent-gold transition-colors shadow-[0_0_15px_rgba(255,215,0,0.3)]">
            <span className="truncate">Contul Meu</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 flex-col lg:flex-row h-[calc(100vh-65px)]">
        <main className="flex-1 flex flex-col bg-background-dark overflow-hidden relative border-r border-[#4C2A85]">
          <div className="px-6 py-6 border-b border-[#4C2A85] shrink-0 z-10 bg-[#1A0B2E]">
            <div className="max-w-5xl mx-auto w-full">
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex gap-6 justify-between items-end">
                  <p className="text-white text-base font-medium leading-normal">Progres Rezervare</p>
                  <p className="text-accent-cyan/80 text-sm font-normal leading-normal">Pasul 4 din 5</p>
                </div>
                <div className="h-2 w-full rounded-full bg-[#341C61]">
                  <div className="h-2 rounded-full bg-gradient-to-r from-accent-gold to-accent-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)]" style={{width: "80%"}}></div>
                </div>
              </div>
              <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                <div>
                  <h1 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] mb-2 drop-shadow-md">
                    Alege Zona VIP
                  </h1>
                  <p className="text-indigo-200 text-base font-normal">
                    Selectează o zonă de mese disponibilă pe harta interactivă.
                  </p>
                </div>
                <div className="flex flex-wrap gap-4 text-sm font-medium bg-[#341C61]/50 p-3 rounded-lg border border-[#4C2A85]">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-accent-gold bg-transparent shadow-[0_0_5px_rgba(255,215,0,0.4)]"></div>
                    <span className="text-white">Disponibil</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-accent-cyan border-2 border-accent-cyan shadow-[0_0_8px_rgba(0,229,255,0.6)]"></div>
                    <span className="text-[#130026] font-bold bg-accent-cyan px-1 rounded-sm">Selectat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#4C2A85] border-2 border-[#4C2A85]"></div>
                    <span className="text-indigo-300">Rezervat</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar relative bg-[#0F0518] flex items-center justify-center p-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#2D1B4E] to-[#0F0518]">
            <div className="relative w-[1000px] h-[700px] bg-[#1A0B2E] rounded-3xl border border-[#4C2A85] shadow-2xl shadow-purple-900/30 p-8 select-none transform scale-75 md:scale-90 lg:scale-100 origin-center transition-transform">
              
              {/* Stage Area */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gradient-to-b from-accent-cyan/20 to-transparent rounded-b-[4rem] border-b border-l border-r border-accent-cyan/30 flex items-center justify-center shadow-[0_10px_50px_-10px_rgba(0,229,255,0.2)] z-0">
                <div className="text-center">
                  <span className="text-accent-cyan font-black tracking-[0.3em] text-2xl uppercase drop-shadow-[0_0_10px_rgba(0,229,255,0.8)] block">Scenă Principală</span>
                  <div className="w-full h-1 bg-accent-cyan/50 mt-2 rounded-full blur-[2px]"></div>
                </div>
              </div>

              {/* Fan Pit (Center) */}
              <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[300px] h-[450px] border-2 border-dashed border-accent-cyan/30 rounded-[3rem] flex flex-col items-center justify-center bg-accent-cyan/5 hover:bg-accent-cyan/10 transition-colors group">
                <span className="material-symbols-outlined text-6xl text-accent-cyan/20 mb-4 group-hover:scale-110 transition-transform">groups</span>
                <span className="text-accent-cyan font-black tracking-widest text-3xl uppercase drop-shadow-lg">Fan Pit</span>
                <span className="text-accent-cyan/60 text-sm font-bold tracking-wider mt-2">Standing Area</span>
              </div>

              {/* Left Zones */}
              <div className="absolute left-12 top-40 grid grid-cols-2 gap-6">
                <ZoneCircle 
                  id="1-25" 
                  label="1-25" 
                  price={1200} 
                  onClick={() => handleZoneClick('1-25')} 
                />
                <ZoneCircle 
                  id="26-50" 
                  label="26-50" 
                  price={1200} 
                  onClick={() => handleZoneClick('26-50')} 
                />
                <ZoneCircle 
                  id="51-75" 
                  label="51-75" 
                  price={1200} 
                  onClick={() => handleZoneClick('51-75')} 
                />
                <ZoneCircle 
                  id="76-100" 
                  label="76-100" 
                  price={1200} 
                  onClick={() => handleZoneClick('76-100')} 
                />
              </div>

              {/* Right Zones */}
              <div className="absolute right-12 top-40 grid grid-cols-2 gap-6">
                <ZoneCircle 
                  id="101-125" 
                  label="101-125" 
                  price={1200} 
                  onClick={() => handleZoneClick('101-125')} 
                />
                <ZoneCircle 
                  id="126-150" 
                  label="126-150" 
                  price={1200} 
                  onClick={() => handleZoneClick('126-150')} 
                />
                <ZoneCircle 
                  id="151-175" 
                  label="151-175" 
                  price={1200} 
                  onClick={() => handleZoneClick('151-175')} 
                />
                <ZoneCircle 
                  id="176-200" 
                  label="176-200" 
                  price={1200} 
                  onClick={() => handleZoneClick('176-200')} 
                />
              </div>

              {/* Decorative Grid */}
              <div className="absolute inset-0 pointer-events-none opacity-20 z-[-1]" style={{backgroundImage: "radial-gradient(#00E5FF 1px, transparent 1px)", backgroundSize: "30px 30px"}}>
              </div>
            </div>

            {selectedTable && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-lg bg-[#341C61]/80 backdrop-blur-xl rounded-xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex items-center justify-between gap-4 animate-fade-in-up border-t border-accent-cyan/20 border border-accent-gold/10 z-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent-cyan rounded-full flex items-center justify-center text-[#130026] shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                    <span className="material-symbols-outlined">table_bar</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">{selectedTable}</h3>
                    <p className="text-indigo-200 text-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">groups</span> 6 Persoane / Masă
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-accent-gold font-black text-xl drop-shadow-[0_0_5px_rgba(255,215,0,0.6)]">1.200 RON</p>
                  <button className="text-xs text-accent-cyan underline hover:text-white transition-colors">Vezi ce include</button>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="w-full lg:w-[380px] bg-[#130026] border-l border-[#4C2A85] flex flex-col h-auto lg:h-full z-20 shadow-[-10px_0_40px_rgba(0,0,0,0.6)]">
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <h3 className="text-white text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-gold">receipt_long</span>
              Sumar Comandă
            </h3>
            <div className="space-y-6">
              <div className="flex gap-4 pb-6 border-b border-[#4C2A85]">
                <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#241242] shrink-0 border border-[#4C2A85]">
                  <div className="w-full h-full bg-gradient-to-br from-[#341C61] to-[#1A0B2E] flex items-center justify-center">
                    <span className="material-symbols-outlined text-indigo-300">music_note</span>
                  </div>
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-bold text-sm">Abonament Festival</h4>
                  <p className="text-indigo-200 text-xs mt-1">4 Zile • Acces General</p>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-indigo-100 text-sm">2 x 450 RON</span>
                    <span className="text-white font-bold text-sm">900 RON</span>
                  </div>
                </div>
              </div>

              {selectedTable && (
                <div className="bg-[#241242]/50 rounded-xl p-4 border border-accent-gold/30 relative shadow-[0_0_15px_rgba(255,215,0,0.05)]">
                  <div className="absolute -top-2 -right-2 bg-accent-gold text-[#130026] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">NOU</div>
                  <div className="flex gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-accent-gold/10 flex items-center justify-center text-accent-gold shrink-0 border border-accent-gold/20">
                      <span className="material-symbols-outlined">star</span>
                    </div>
                    <div>
                      <h4 className="text-accent-gold font-bold text-sm">Rezervare Masă VIP</h4>
                      <p className="text-white text-xs">{selectedTable}</p>
                    </div>
                  </div>
                  <ul className="text-indigo-200 text-xs space-y-1 pl-13 mb-3 list-disc list-inside">
                    <li>Intrare Prioritară</li>
                    <li>1x Sticlă Premium Vodka</li>
                    <li>Servire la masă</li>
                  </ul>
                  <div className="flex justify-between items-center pt-3 border-t border-[#4C2A85]/50">
                    <button className="text-xs text-indigo-300 hover:text-red-400 flex items-center gap-1 transition-colors" onClick={() => setSelectedTable(null)}>
                      <span className="material-symbols-outlined text-sm">delete</span> Șterge
                    </button>
                    <span className="text-accent-gold font-bold text-lg drop-shadow-[0_0_5px_rgba(255,215,0,0.3)]">1.200 RON</span>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div className="p-6 bg-[#0F0518] border-t border-[#4C2A85]">
            <div className="flex justify-between items-end mb-2">
              <span className="text-indigo-200 text-sm">Subtotal</span>
              <span className="text-white font-medium">{selectedTable ? "2.100" : "900"} RON</span>
            </div>
            <div className="flex justify-between items-end mb-6">
              <span className="text-indigo-200 text-sm">Taxe procesare</span>
              <span className="text-white font-medium">15 RON</span>
            </div>
            <div className="flex justify-between items-end mb-6 pt-4 border-t border-[#4C2A85]">
              <span className="text-white text-lg font-bold">Total</span>
              <span className="text-accent-gold text-2xl font-black drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]">{selectedTable ? "2.115" : "915"} RON</span>
            </div>
            <div className="flex gap-3">
              <Link to="/tickets" className="px-4 py-3 rounded-lg border border-[#4C2A85] text-white font-bold text-sm hover:bg-[#341C61] hover:text-accent-cyan transition-colors w-1/3 text-center flex items-center justify-center">
                Înapoi
              </Link>
              <Link to="/checkout" className="px-4 py-3 rounded-lg bg-gradient-to-r from-accent-gold to-[#FFC107] text-[#130026] font-bold text-sm hover:from-white hover:to-white hover:text-accent-gold transition-all w-2/3 flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.4)] group">
                Continuă
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </Link>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
