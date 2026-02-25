import React from 'react';
import { Link } from 'react-router-dom';
import Icon from '../components/Icon';
import { Artist, NewsItem } from '../types';

const artists: Artist[] = [
    { name: "Subcarpați", day: "VINERI", genre: "Underground Folclor", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuAU0XxqSuhJC2ZcurILyrLl93A4MQfSPiocdHC2fEzlDsLTZHwJW_rB_u8O0Dpge-BVId2BnzUNuPYSJTWWcHO31CeVcHJpCmIxdH0ohmt6y9MoHNxj2IUhAfCa8sbtE3t7HoMmpO18vjx7TMYeJS_o-si8dMKKGTPVcZzrm0Mme5VsI9U4-2XkAHrMYBsRqxezj7EtY6hKgh-m-oa4KegHz6WQyryYfZEVNlibLD8Ykt7-eK7WCCuzwEkk9J1CcWbia8K2bHx6JA_B", color: 'primary' },
    { name: "Goran Bregović", day: "SÂMBĂTĂ", genre: "Legendă Balcanică", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCiEgC3xx5slV5SvcAgibzBhj10uesI0bFYUOb7M5-xcbXs2Hj0qKu_J_0J6hKOiOlwW9jlhh8qpC8_-9yuizc4VrebMh9uWwbn7VivyFJ1yaek-j1swPU_WyPiRudAiHZgK78ihEkbTfzfBYFmqDIHmwdtVdEjK28UNp0ucOGWfg88keXSDSSE-8cGm-dC99NZ2el_2zHKLrYX_xQAOuty77XPXsON47ZA3n1YjIrbYI6Wziq4bkwpGjDxf9_cxhLYaiaSVDwUTfqt", color: 'accent-gold' },
    { name: "Lupii lui Calancea", day: "DUMINICĂ", genre: "Folk Rock Modern", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBaAbX8gBSfcUD4mKKMXxGvNVAyJaXZce7aloo0xcTAe1a-KMua2AFuQ2PDW5NPuaH1nuDavIqWrn1J4TGTj4IFzNVvdkQDXznWpi0uWvQtJymtfHy8ZD_pJckcXD7ZxBBW4f8A0zZvZFEQurn0oobmqL-faxFJagzW3BB5RNi2u1SxJs2Ta6dIrqHdFzukaarIb_rflO0Y_ZtdvwWiDB51IM5wc8eDJ8D4k9M2EqQndhhQrxAEEJ2PN3Pq9NUzrxyEv3ZO8btcDROQ", color: 'accent-cyan' },
    { name: "Dubioza Kolektiv", day: "LUNI", genre: "Ska Punk Energy", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuDSzpPNEfBX1gAm0oMMpFn4ADkwtslPa9H-3lGMVynmTbn0gE4GNfW01tXPIQZFI1TtcmxtR4H1OFs_CNNsWHtUqD6D_AidMlziv5Y-QiUuWOKRbPSsWDluOHIsHM2eD4p_0OTKxkbCtm2ewcQE1NF5-Z26XWGpCsZZAVD77G3Tb34tBtSQ9lUmqDw1A0IPO3YIoikS1AHScgqD_XGYXcDHDZ_JjxyWgXHoKTZA3rkPoayrK0_D5phbrNMp6lDZAL9IEAMEo8OWz3RG", color: 'primary' }
];

const news: NewsItem[] = [
    { id: 1, category: "Anunț Oficial", title: "Primele nume confirmate pentru ediția 2026", excerpt: "Descoperă cine va urca pe scena principală anul acesta. Lista completă include artiști din 10 țări.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuBTErVwYxEDR61nn7UOki5ksSFlRbMjbnqpxiO_qGq6J_v0MAokqHD0aajG1xoS-NifLcmIG8SY3uCP9Hn2iPxOM11v1NiUBEBI2cjP9KbXgkkNVF-qR0WKOiFqAVJgb49lazg-B2IDd7t4SkVZOppCr-wl-zAQEjjb6AYrx92KKQLfLOFbZ5AKtlkXU1XFjkaJWE5mMax890xGo4KR4sfRC5x7qdK53GxZhHqCp1Jeqqp_Xqq9guiQZhG632uGqakyixJCP0Qjx9mZ", color: 'primary' },
    { id: 2, category: "Transport & Camping", title: "Noi opțiuni de camping disponibile", excerpt: "Anul acesta extindem zona de camping cu facilități premium, dușuri calde și zonă de relaxare.", image: "https://lh3.googleusercontent.com/aida-public/AB6AXuCciGm1y7s1NMFKnB8aXso_FZWoFU19m68jYCuXu3Fir4MIc3xKeBTC7TrW-fLVatKlH41lMjqn3-ilqrJOAgFWxI_1mEAKxVb5DDbBCTVbWK4uVFphk5PnwRR-EwUI0Qd5Nl6UAmVkGw8eTfjaym0DHY-PGkNHECzuOdZSPh8kdY7DounDyp8-Jc2s_ckSQ8KtIgFdyFjVw6k2RQIf4FrMASmRYWadBtRQdz9vWW3b2d5uDOhSv397yabfTuG1rrlyeo6mBULbapEo", color: 'accent-cyan' }
];

const Home: React.FC = () => {
    return (
        <div className="w-full flex flex-col">
            {/* Hero Section */}
            <section className="relative w-full h-[85vh] flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 z-0">
                    <img alt="Concert Crowd" className="w-full h-full object-cover opacity-60" src="https://lh3.googleusercontent.com/aida-public/AB6AXuCLT8ZF4ZilaFxDwtovDVe2kCZLPyxVSzSDNIjQg56SeuualdC4SaUhc0-9UIwIuMjOIyzFe4_56-dURim6qq3mIkx2ltIjnmfD-ScaubvzpF_xz2_ZjTUiZkAFjfzPvPseOdi8ef3Ckz_JVWw8ffK5_2V38BZCW8v2DYiGJKIspJcDaNs40hfr1IrNlKCQG2aTLMvzBKypVHeVvjyC7ZYYrzt653Wha7KeQbE92olA_spo5SiV4P9dqkrDtPhLu7je7J99BPfTaYzC" />
                    <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-background-dark/60 to-transparent"></div>
                    <div className="absolute inset-0 bg-primary/20 mix-blend-overlay"></div>
                </div>
                <div className="relative z-10 text-center px-4 max-w-5xl mx-auto flex flex-col items-center gap-6 mt-10">
                    <div className="mb-4 animate-fade-in-up">
                        <Icon name="equalizer" className="text-[80px] md:text-[120px] text-white drop-shadow-[0_0_25px_rgba(255,255,255,0.4)]" />
                    </div>
                    <span className="inline-block px-6 py-2 rounded-full bg-accent-gold/20 text-accent-gold text-sm font-black uppercase tracking-widest border border-accent-gold/40 backdrop-blur-sm shadow-[0_0_15px_rgba(255,215,0,0.3)]">
                        29 Mai - 01 Iunie 2026
                    </span>
                    <h1 className="text-5xl md:text-7xl lg:text-8xl font-black text-white tracking-tight leading-none drop-shadow-2xl"> 
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-accent-cyan via-white to-primary text-glow">Banton Festival</span> 
                    </h1>
                    <p className="text-gray-200 text-lg md:text-2xl max-w-2xl mx-auto leading-relaxed font-medium drop-shadow-md">
                        Cea mai mare celebrare a muzicii și culturii balcanice din inima Timișoarei.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 mt-8">
                        <Link to="/tickets" className="px-8 py-4 bg-primary hover:bg-[#680bc9] text-white text-lg font-bold rounded-full shadow-[0_0_20px_rgba(127,13,242,0.6)] transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                            Rezervă Bilete
                            <Icon name="confirmation_number" />
                        </Link>
                        <button className="px-8 py-4 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/30 text-white text-lg font-bold rounded-full transition-all transform hover:scale-105 flex items-center justify-center gap-2">
                            Vezi Programul
                            <Icon name="calendar_month" />
                        </button>
                    </div>
                </div>
            </section>

            {/* Line-up Section */}
            <section className="w-full max-w-7xl mx-auto px-4 md:px-10 py-20">
                <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                    <div>
                        <span className="text-accent-cyan font-bold tracking-widest uppercase text-sm mb-2 block">Line-up 2026</span>
                        <h2 className="text-4xl md:text-5xl font-black text-white">Artiștii Ediției</h2>
                    </div>
                    <a href="#" className="group flex items-center gap-2 text-white font-bold hover:text-accent-cyan transition-colors">
                        Vezi tot line-up-ul
                        <span className="group-hover:translate-x-1 transition-transform">
                            <Icon name="arrow_forward" />
                        </span>
                    </a>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {artists.map((artist, index) => (
                        <div key={index} className="group relative aspect-[3/4] rounded-3xl overflow-hidden cursor-pointer">
                            <img alt={artist.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0" src={artist.image} />
                            <div className="absolute inset-0 bg-gradient-to-t from-background-dark via-transparent to-transparent opacity-90"></div>
                            <div className="absolute top-4 left-4">
                                <span className={`text-background-dark text-xs font-bold px-3 py-1 rounded-lg backdrop-blur-md ${artist.color === 'primary' ? 'bg-primary/90 text-white' : artist.color === 'accent-gold' ? 'bg-accent-gold/90' : 'bg-accent-cyan/90'}`}>
                                    {artist.day}
                                </span>
                            </div>
                            <div className="absolute bottom-0 left-0 w-full p-6 translate-y-2 group-hover:translate-y-0 transition-transform">
                                <h3 className="text-2xl font-black text-white mb-1">{artist.name}</h3>
                                <p className={`text-sm font-bold opacity-0 group-hover:opacity-100 transition-opacity transform translate-y-4 group-hover:translate-y-0 ${artist.color === 'primary' ? 'text-primary' : artist.color === 'accent-gold' ? 'text-accent-gold' : 'text-accent-cyan'}`}>
                                    {artist.genre}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            {/* Zones Section */}
            <section className="relative py-20 bg-[#120b18] overflow-hidden">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-accent-gold/5 rounded-full blur-[100px] pointer-events-none"></div>
                <div className="w-full max-w-7xl mx-auto px-4 md:px-10 relative z-10">
                    <div className="text-center mb-16">
                        <span className="text-accent-gold font-bold tracking-widest uppercase text-sm mb-2 block">Descoperă</span>
                        <h2 className="text-4xl md:text-5xl font-black text-white">Zone de Festival</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="bg-[#1f1826] p-8 rounded-3xl border border-white/5 hover:border-primary/50 transition-all hover:-translate-y-2 group">
                            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 group-hover:bg-primary/20 transition-colors">
                                <Icon name="restaurant" className="text-4xl text-primary" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">Food Court</h3>
                            <p className="text-gray-400 leading-relaxed">Peste 20 de vendori cu mâncare tradițională balcanică și opțiuni internaționale gourmet.</p>
                        </div>
                        <div className="bg-[#1f1826] p-8 rounded-3xl border border-white/5 hover:border-accent-cyan/50 transition-all hover:-translate-y-2 group">
                            <div className="size-16 rounded-2xl bg-accent-cyan/10 flex items-center justify-center mb-6 group-hover:bg-accent-cyan/20 transition-colors">
                                <Icon name="family_restroom" className="text-4xl text-accent-cyan" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">Activități Copii</h3>
                            <p className="text-gray-400 leading-relaxed">Zonă dedicată familiilor cu ateliere creative, locuri de joacă și supraveghere profesionistă.</p>
                        </div>
                        <div className="bg-[#1f1826] p-8 rounded-3xl border border-white/5 hover:border-accent-gold/50 transition-all hover:-translate-y-2 group">
                            <div className="size-16 rounded-2xl bg-accent-gold/10 flex items-center justify-center mb-6 group-hover:bg-accent-gold/20 transition-colors">
                                <Icon name="diamond" className="text-4xl text-accent-gold" />
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-3">VIP Lounge</h3>
                            <p className="text-gray-400 leading-relaxed">Trăiește experiența premium cu bar privat, vedere panoramică la scenă și acces rapid.</p>
                        </div>
                    </div>
                </div>
            </section>

            {/* News Section */}
            <section className="w-full max-w-7xl mx-auto px-4 md:px-10 py-20">
                <div className="flex flex-col md:flex-row items-end justify-between mb-12 gap-6">
                    <div>
                        <span className="text-gray-400 font-bold tracking-widest uppercase text-sm mb-2 block">Blog &amp; Noutăți</span>
                        <h2 className="text-4xl md:text-5xl font-black text-white">Ultimele Știri</h2>
                    </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {news.map((item) => (
                        <article key={item.id} className="flex flex-col md:flex-row gap-6 p-4 rounded-3xl bg-[#16121a] hover:bg-[#1f1826] transition-colors border border-white/5 group">
                            <div className="w-full md:w-48 aspect-square rounded-2xl overflow-hidden shrink-0">
                                <img alt="News" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={item.image} />
                            </div>
                            <div className="flex flex-col justify-center py-2">
                                <span className={`text-xs font-bold uppercase tracking-wider mb-2 ${item.color === 'primary' ? 'text-primary' : 'text-accent-cyan'}`}>{item.category}</span>
                                <h3 className={`text-xl font-bold text-white mb-3 transition-colors ${item.color === 'primary' ? 'group-hover:text-primary' : 'group-hover:text-accent-cyan'}`}>{item.title}</h3>
                                <p className="text-gray-400 text-sm line-clamp-2 mb-4">{item.excerpt}</p>
                                <a className="text-white text-sm font-bold flex items-center gap-1 hover:gap-2 transition-all" href="#">
                                    Citește mai mult
                                    <Icon name="arrow_forward" className="text-sm" />
                                </a>
                            </div>
                        </article>
                    ))}
                </div>
            </section>
        </div>
    );
};
