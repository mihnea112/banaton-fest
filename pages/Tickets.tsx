import React, { useState } from 'react';
import Icon from '../components/Icon';

type Duration = 1 | 2 | 3 | 4;

const Tickets: React.FC = () => {
    // Available Days
    const allDays = ["Vineri, 29.05", "Sâmbătă, 30.05", "Duminică, 31.05", "Luni, 01.06"];

    // Fan Pit State
    const [fanPitDuration, setFanPitDuration] = useState<Duration>(1);
    const [fanPit1Day, setFanPit1Day] = useState<string>(allDays[0]);
    const [fanPit2Days, setFanPit2Days] = useState<string[]>([allDays[0], allDays[1]]);
    const [fanPit3Days, setFanPit3Days] = useState<string[]>([allDays[0], allDays[1], allDays[2]]);

    // VIP State
    const [vipDuration, setVipDuration] = useState<Duration>(4);
    const [vip1Day, setVip1Day] = useState<string>(allDays[0]);
    const [vip2Days, setVip2Days] = useState<string[]>([allDays[0], allDays[1]]);
    const [vip3Days, setVip3Days] = useState<string[]>([allDays[0], allDays[1], allDays[2]]);

    // Pricing Logic
    const getFanPitPrice = (duration: Duration) => {
        switch (duration) {
            case 1: return 200;
            case 2: return 350;
            case 3: return 450;
            case 4: return 500;
        }
    };

    const getVipPrice = (duration: Duration) => {
        switch (duration) {
            case 1: return 500;
            case 2: return 800;
            case 3: return 1000;
            case 4: return 1200;
        }
    };

    const handleDayToggle = (day: string, current: string[], limit: number, setFn: (v: string[]) => void) => {
        if (current.includes(day)) {
            setFn(current.filter(d => d !== day));
        } else {
            if (current.length < limit) {
                // Sort days based on original order
                const newSelection = [...current, day].sort((a, b) => allDays.indexOf(a) - allDays.indexOf(b));
                setFn(newSelection);
            }
        }
    };

    const renderSingleDaySelector = (
        selected: string,
        setSelected: (s: string) => void,
        variant: 'primary' | 'gold'
    ) => {
        const activeBorder = variant === 'primary' ? 'border-primary' : 'border-accent-gold';
        const activeBg = variant === 'primary' ? 'bg-[#302839]' : 'bg-[#302839]';
        const activeRadio = variant === 'primary' ? 'border-primary bg-white' : 'border-accent-gold bg-accent-gold';
        const shadow = variant === 'primary' ? 'shadow-inner shadow-primary/10' : 'shadow-inner shadow-accent-gold/10';
        const hoverBorder = variant === 'primary' ? 'hover:border-primary/30' : 'hover:border-accent-gold/30';

        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {allDays.map((day) => (
                    <div 
                        key={day}
                        onClick={() => setSelected(day)}
                        className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${selected === day ? `${activeBg} ${activeBorder} ${shadow}` : `border-transparent hover:bg-[#302839] ${hoverBorder} opacity-60 hover:opacity-100`}`}
                    >
                        <div className={`size-5 min-w-[1.25rem] rounded-full border-2 flex items-center justify-center ${selected === day ? activeRadio : 'border-gray-500'}`}>
                            {selected === day && variant === 'primary' && <div className="size-2 rounded-full bg-primary" />}
                        </div>
                        <span className={`text-sm font-medium ${selected === day ? 'text-white' : 'text-gray-300'}`}>{day}</span>
                    </div>
                ))}
            </div>
        );
    };

    const renderMultiDaySelector = (
        selectedDays: string[],
        setSelectedDays: (s: string[]) => void,
        limit: number,
        variant: 'primary' | 'gold'
    ) => {
        const activeBorder = variant === 'primary' ? 'border-primary' : 'border-accent-gold';
        const activeBg = variant === 'primary' ? 'bg-[#302839]' : 'bg-[#302839]';
        const activeCheckbox = variant === 'primary' ? 'bg-primary border-primary text-white' : 'bg-accent-gold border-accent-gold text-background-dark';
        const shadow = variant === 'primary' ? 'shadow-inner shadow-primary/10' : 'shadow-inner shadow-accent-gold/10';
        
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {allDays.map((day) => {
                    const isSelected = selectedDays.includes(day);
                    const isDisabled = !isSelected && selectedDays.length >= limit;

                    return (
                        <div 
                            key={day}
                            onClick={() => !isDisabled && handleDayToggle(day, selectedDays, limit, setSelectedDays)}
                            className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                isSelected 
                                    ? `${activeBg} ${activeBorder} ${shadow} cursor-pointer` 
                                    : isDisabled 
                                        ? 'border-transparent opacity-30 cursor-not-allowed' 
                                        : 'border-transparent hover:bg-[#302839] opacity-60 hover:opacity-100 cursor-pointer'
                            }`}
                        >
                            <div className={`size-5 min-w-[1.25rem] rounded border-2 flex items-center justify-center transition-colors ${isSelected ? activeCheckbox : 'border-gray-500'}`}>
                                {isSelected && <Icon name="check" className="text-sm font-bold" />}
                            </div>
                            <span className={`text-sm font-medium ${isSelected ? 'text-white' : 'text-gray-300'}`}>{day}</span>
                        </div>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="w-full flex flex-col items-center px-4 md:px-10 pb-20">
            {/* Header */}
            <section className="w-full max-w-7xl py-12 md:py-16 text-center space-y-4">
                <span className="inline-block px-4 py-1.5 rounded-full bg-primary/20 text-accent-cyan text-xs font-bold uppercase tracking-wider border border-primary/30 backdrop-blur-sm">
                    Ediția 2026
                </span>
                <h1 className="text-4xl md:text-6xl font-black text-white tracking-tight drop-shadow-xl">
                    Rezervare Bilete <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan to-primary">Fan Pit</span> și <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-gold to-[#fcd34d]">VIP</span>
                </h1>
                <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                    Configurează-ți experiența de festival. Alege tipul de bilet, durata și zilele preferate.
                </p>
            </section>

            {/* Tickets Grid */}
            <section className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16 relative">
                <div className="absolute -left-20 top-1/2 -translate-y-1/2 w-64 h-64 bg-accent-cyan/10 rounded-full blur-[90px] pointer-events-none"></div>
                
                {/* Fan Pit Card */}
                <div className="relative flex flex-col p-8 rounded-3xl bg-[#251e2e] border-2 border-primary/50 shadow-[0_0_30px_rgba(127,13,242,0.1)] hover:shadow-[0_0_40px_rgba(127,13,242,0.2)] transition-all z-10">
                    <div className="flex justify-between items-start mb-6">
                        <div>
                            <div className="flex items-center gap-2 mb-1">
                                <Icon name="equalizer" className="text-primary" />
                                <span className="text-primary font-bold text-xs uppercase tracking-widest">Standard</span>
                            </div>
                            <h3 className="text-3xl font-black text-white">Fan Pit</h3>
                            <p className="text-gray-400 text-sm mt-1 max-w-sm">Trăiește energia din fața scenei. Locuri în picioare, acces rapid la baruri.</p>
                        </div>
                    </div>
                    <div className="mb-6">
                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Alege Durata</label>
                        <div className="grid grid-cols-4 gap-2">
                            {[1, 2, 3, 4].map((d) => (
                                <div key={d} className="contents">
                                    <input 
                                        type="radio" 
                                        name="fanpit-duration" 
                                        id={`fp-${d}`} 
                                        className="hidden duration-radio" 
                                        checked={fanPitDuration === d}
                                        onChange={() => setFanPitDuration(d as Duration)}
                                    />
                                    <label htmlFor={`fp-${d}`} 
                                        className={`cursor-pointer text-center py-2.5 rounded-xl border border-white/5 text-sm font-bold transition-all ${fanPitDuration === d ? 'bg-primary text-white shadow-lg' : 'bg-[#1f1826] text-gray-400 hover:bg-[#302839]'}`}
                                    >
                                        {d} Zi{d > 1 ? 'le' : ''}
                                    </label>
                                </div>
                            ))}
                        </div>
                    </div>
                    
                    {/* Dynamic Date Selection for Fan Pit */}
                    {fanPitDuration < 4 && (
                        <div className="mb-8 p-5 bg-[#1f1826]/80 rounded-2xl border border-white/5 animate-fade-in-up">
                            <div className="flex justify-between items-center mb-2">
                                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                                    {fanPitDuration === 1 ? 'Selectează Ziua' : `Selectează ${fanPitDuration} Zile`}
                                </label>
                                {fanPitDuration > 1 && (
                                    <span className="text-xs text-primary font-medium">
                                        {(fanPitDuration === 2 ? fanPit2Days.length : fanPit3Days.length)}/{fanPitDuration} Selectate
                                    </span>
                                )}
                            </div>
                            
                            {fanPitDuration === 1 && renderSingleDaySelector(fanPit1Day, setFanPit1Day, 'primary')}
                            
                            {fanPitDuration === 2 && renderMultiDaySelector(
                                fanPit2Days, 
                                setFanPit2Days, 
                                2, 
                                'primary'
                            )}
                            
                            {fanPitDuration === 3 && renderMultiDaySelector(
                                fanPit3Days, 
                                setFanPit3Days, 
                                3, 
                                'primary'
                            )}
                        </div>
                    )}
                    
                    {fanPitDuration === 4 && (
                         <div className="mb-8 p-5 bg-[#1f1826]/80 rounded-2xl border border-white/5 animate-fade-in-up">
                             <div className="flex items-center gap-3">
                                <Icon name="calendar_month" className="text-primary text-2xl" />
                                <div>
                                    <p className="text-white font-bold">Abonament Full Access</p>
                                    <p className="text-gray-400 text-sm">29 Mai - 01 Iunie 2026</p>
                                </div>
                             </div>
                         </div>
                    )}

                    <div className="mt-auto border-t border-white/10 pt-6">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex flex-col">
                                <span className="text-sm text-gray-400">Preț total</span>
                                <span className="text-4xl font-black text-white">{getFanPitPrice(fanPitDuration)} <span className="text-lg font-bold text-gray-400">RON</span></span>
                            </div>
                            <ul className="text-right space-y-1">
                                <li className="text-xs text-gray-400 flex items-center justify-end gap-1"><Icon name="check" className="text-[14px] text-primary" /> Acces general</li>
                                <li className="text-xs text-gray-400 flex items-center justify-end gap-1"><Icon name="check" className="text-[14px] text-primary" /> Food court</li>
                            </ul>
                        </div>
                        <button className="w-full py-4 rounded-2xl bg-gradient-to-r from-primary to-[#9d4edd] text-white font-bold text-lg hover:shadow-[0_0_25px_rgba(127,13,242,0.4)] hover:scale-[1.01] transition-all flex justify-center items-center gap-2">
                            Adaugă în Coș <Icon name="shopping_cart" />
                        </button>
                    </div>
                </div>

                {/* VIP Card */}
                <div className="group relative z-10">
                    <div className="absolute -inset-[2px] bg-gradient-to-b from-accent-gold via-accent-gold/40 to-transparent rounded-[26px] blur-sm opacity-70 group-hover:opacity-100 transition-opacity duration-500"></div>
                    <div className="relative h-full flex flex-col p-8 rounded-3xl bg-[#16121a]">
                        <div className="flex justify-between items-start mb-6">
                            <div>
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon name="diamond" className="text-accent-gold" />
                                    <span className="text-accent-gold font-bold text-xs uppercase tracking-widest">Exclusiv</span>
                                </div>
                                <h3 className="text-3xl font-black text-white">VIP Experience</h3>
                                <p className="text-gray-400 text-sm mt-1 max-w-sm">Acces privilegiat, vizibilitate perfectă și confort maxim în zona VIP Lounge.</p>
                            </div>
                        </div>
                        <div className="mb-6">
                            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 block">Alege Durata</label>
                            <div className="grid grid-cols-4 gap-2">
                                {[1, 2, 3, 4].map((d) => (
                                    <div key={d} className="contents">
                                        <input 
                                            type="radio" 
                                            name="vip-duration" 
                                            id={`vip-${d}`} 
                                            className="hidden duration-radio" 
                                            checked={vipDuration === d}
                                            onChange={() => setVipDuration(d as Duration)}
                                        />
                                        <label htmlFor={`vip-${d}`} 
                                            className={`cursor-pointer text-center py-2.5 rounded-xl border border-white/5 text-sm font-bold transition-all ${vipDuration === d ? 'bg-accent-gold text-background-dark shadow-lg' : 'bg-[#251e2e] text-gray-400 hover:bg-[#302839] hover:text-white'}`}
                                        >
                                            {d} Zi{d > 1 ? 'le' : ''}
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* VIP Date Selection */}
                        <div className="mb-8 p-5 bg-[#251e2e]/50 rounded-2xl border border-accent-gold/20 relative overflow-hidden animate-fade-in-up">
                            <div className="absolute right-0 top-0 w-24 h-24 bg-accent-gold/5 rounded-full blur-2xl"></div>
                            
                            {vipDuration === 4 ? (
                                <>
                                    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 block">Perioada Selectată</label>
                                    <div className="flex items-center gap-3">
                                        <Icon name="date_range" className="text-accent-gold text-2xl" />
                                        <div>
                                            <p className="text-white font-bold text-lg">Full Access: 4 Zile</p>
                                            <p className="text-gray-400 text-sm">29 Mai - 01 Iunie 2026</p>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div>
                                    <div className="flex justify-between items-center mb-2">
                                        <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">
                                            {vipDuration === 1 ? 'Selectează Ziua' : `Selectează ${vipDuration} Zile`}
                                        </label>
                                        {vipDuration > 1 && (
                                            <span className="text-xs text-accent-gold font-medium">
                                                {(vipDuration === 2 ? vip2Days.length : vip3Days.length)}/{vipDuration} Selectate
                                            </span>
                                        )}
                                    </div>
                                    
                                    {vipDuration === 1 && renderSingleDaySelector(vip1Day, setVip1Day, 'gold')}
                                    
                                    {vipDuration === 2 && renderMultiDaySelector(
                                        vip2Days, 
                                        setVip2Days, 
                                        2, 
                                        'gold'
                                    )}
                                    
                                    {vipDuration === 3 && renderMultiDaySelector(
                                        vip3Days, 
                                        setVip3Days, 
                                        3, 
                                        'gold'
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="mb-8 grid grid-cols-2 gap-y-2 gap-x-4">
                             {[
                                "VIP Lounge & Bar",
                                "Fast Lane Entry",
                                "Parcare Rezervată",
                                "Afterparty Access"
                            ].map((perk, i) => (
                                <div key={i} className="flex items-center gap-2 text-xs text-gray-300">
                                    <Icon name="star" className="text-accent-gold text-sm" filled />
                                    {perk}
                                </div>
                            ))}
                        </div>
                        <div className="mt-auto border-t border-white/10 pt-6">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex flex-col">
                                    <span className="text-sm text-gray-400">Preț total</span>
                                    <span className="text-4xl font-black text-white">{getVipPrice(vipDuration)} <span className="text-lg font-bold text-gray-400">RON</span></span>
                                </div>
                            </div>
                            <button className="w-full py-4 rounded-2xl bg-accent-gold text-background-dark font-bold text-lg hover:bg-white transition-colors flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                                Rezervă VIP <Icon name="diamond" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Special Packages */}
            <section className="w-full max-w-7xl relative z-10 mb-8">
                <div className="flex items-center gap-4 mb-6">
                    <h2 className="text-2xl font-bold text-white">Pachete Speciale</h2>
                    <div className="h-[1px] bg-white/10 grow"></div>
                </div>
                <div className="group relative overflow-hidden rounded-[2rem] p-[1px] bg-gradient-to-r from-accent-cyan/60 to-primary/40">
                    <div className="absolute inset-0 bg-accent-cyan/10 blur-xl group-hover:bg-accent-cyan/15 transition-colors"></div>
                    <div className="relative flex flex-col md:flex-row items-center gap-8 p-8 md:p-10 bg-[#16121a] rounded-[31px]">
                        <div className="flex flex-col gap-4 grow md:max-w-md">
                            <div className="flex items-center gap-3">
                                <div className="size-12 rounded-full bg-accent-cyan/20 flex items-center justify-center text-accent-cyan">
                                    <Icon name="diversity_3" className="text-2xl" />
                                </div>
                                <div>
                                    <h3 className="text-3xl font-black text-white">Pachet Familie</h3>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className="px-2 py-0.5 rounded bg-accent-cyan/20 text-accent-cyan text-[10px] font-bold uppercase tracking-wider">1 Zi</span>
                                        <span className="text-gray-400 text-sm">Exclusiv pentru familii</span>
                                    </div>
                                </div>
                            </div>
                            <p className="text-gray-300 text-sm leading-relaxed">
                                Acces pentru <strong>2 Adulți</strong> și <strong>2 Copii</strong> (sub 14 ani). Include intrare separată pentru familii și acces la zona "Kids & Fun". Disponibil doar pentru o singură zi.
                            </p>
                        </div>
                        <div className="hidden md:block w-px h-32 bg-white/10"></div>
                        <div className="w-full md:w-auto grow max-w-sm">
                            <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Selectează Ziua Familiei</label>
                            <div className="relative">
                                <select className="w-full appearance-none bg-[#1f1826] border border-white/20 text-white text-base rounded-xl focus:ring-accent-cyan focus:border-accent-cyan block p-4 pr-10 hover:bg-[#251e2e] transition-colors cursor-pointer">
                                    <option>Vineri, 29.05.2026</option>
                                    <option>Sâmbătă, 30.05.2026</option>
                                    <option defaultValue="selected">Duminică, 31.05.2026</option>
                                    <option>Luni, 01.06.2026</option>
                                </select>
                                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-400">
                                    <Icon name="expand_more" />
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-row md:flex-col items-center md:items-end gap-6 md:gap-2 w-full md:w-auto justify-between md:justify-center border-t md:border-t-0 border-white/10 pt-6 md:pt-0">
                            <div className="text-right">
                                <span className="text-3xl font-black text-accent-cyan">450 <span className="text-lg font-bold text-gray-500">RON</span></span>
                            </div>
                            <button className="px-8 py-3 rounded-xl bg-[#1f2937] border border-accent-cyan text-accent-cyan font-bold hover:bg-accent-cyan hover:text-background-dark transition-all flex items-center gap-2 whitespace-nowrap">
                                Cumpără Pachet
                                <Icon name="arrow_forward" className="text-sm" />
                            </button>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Tickets;