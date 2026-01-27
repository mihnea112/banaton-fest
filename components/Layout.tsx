import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import Icon from './Icon';

interface LayoutProps {
    children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const isTicketsPage = location.pathname === '/tickets';

    return (
        <div className="relative flex min-h-screen w-full flex-col">
            {/* Ambient Background Effects */}
            <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px]"></div>
                <div className="absolute bottom-[10%] right-[-5%] w-[400px] h-[400px] bg-accent-cyan/10 rounded-full blur-[100px]"></div>
                <div className="absolute top-[40%] left-[20%] w-[300px] h-[300px] bg-primary/10 rounded-full blur-[80px]"></div>
            </div>

            <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-[#191022]/80 border-b border-white/10">
                <div className="px-4 md:px-10 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
                    <Link to="/" className="flex items-center gap-3 group">
                        <div className="size-8 text-primary group-hover:scale-110 transition-transform">
                            <Icon name="equalizer" className="!text-[32px]" />
                        </div>
                        <h2 className="text-white text-xl font-extrabold tracking-tight">Banaton Fest</h2>
                    </Link>
                    <nav className="hidden md:flex items-center gap-8">
                        <Link to="/" className={`text-sm font-medium transition-colors ${!isTicketsPage ? 'text-accent-cyan font-bold' : 'text-white/80 hover:text-white hover:text-accent-cyan'}`}>Acasă</Link>
                        <a href="#" className="text-white/80 hover:text-white hover:text-accent-cyan transition-colors text-sm font-medium">Despre</a>
                        <a href="#" className="text-white/80 hover:text-white hover:text-accent-cyan transition-colors text-sm font-medium">Program</a>
                        <a href="#" className="text-white/80 hover:text-white hover:text-accent-cyan transition-colors text-sm font-medium">Contact</a>
                    </nav>
                    <div className="flex gap-3">
                        <button className="hidden md:flex bg-[#302839] hover:bg-[#40354a] text-white p-2.5 rounded-full transition-colors">
                            <Icon name="search" />
                        </button>
                        <Link to="/tickets" className={`flex items-center justify-center rounded-full h-10 px-6 bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-[0_0_15px_rgba(127,13,242,0.5)] transition-all transform hover:scale-105 ${isTicketsPage ? 'ring-2 ring-white ring-offset-2 ring-offset-background-dark' : ''}`}>
                            <span className="truncate">Bilete Online</span>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex flex-col items-center w-full grow">
                {children}
            </main>

            <footer className="w-full border-t border-white/5 bg-[#0f0c12] py-16 relative z-10">
                <div className="max-w-7xl mx-auto px-4 md:px-10">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-12 mb-12">
                        <div className="col-span-1 md:col-span-2">
                            <div className="flex items-center gap-2 mb-6">
                                <span className="material-symbols-outlined text-primary text-3xl">equalizer</span>
                                <h2 className="text-white font-black text-2xl">Banaton Fest</h2>
                            </div>
                            <p className="text-gray-400 max-w-sm mb-6">Festivalul care unește ritmurile balcanice cu energia modernă. O experiență unică în Timișoara.</p>
                            <div className="flex gap-4">
                                <a className="size-10 rounded-full bg-white/5 hover:bg-primary hover:text-white text-gray-400 flex items-center justify-center transition-all" href="#"><Icon name="public" className="text-sm" /></a>
                                <a className="size-10 rounded-full bg-white/5 hover:bg-primary hover:text-white text-gray-400 flex items-center justify-center transition-all" href="#"><Icon name="alternate_email" className="text-sm" /></a>
                                <a className="size-10 rounded-full bg-white/5 hover:bg-primary hover:text-white text-gray-400 flex items-center justify-center transition-all" href="#"><Icon name="photo_camera" className="text-sm" /></a>
                            </div>
                        </div>
                        <div>
                            <h3 className="text-white font-bold mb-6">Navigare Rapidă</h3>
                            <ul className="space-y-4">
                                <li><Link className="text-gray-400 hover:text-accent-cyan transition-colors text-sm" to="/">Acasă</Link></li>
                                <li><a className="text-gray-400 hover:text-accent-cyan transition-colors text-sm" href="#">Despre</a></li>
                                <li><a className="text-gray-400 hover:text-accent-cyan transition-colors text-sm" href="#">Line-up</a></li>
                                <li><Link className="text-gray-400 hover:text-accent-cyan transition-colors text-sm" to="/tickets">Bilete</Link></li>
                            </ul>
                        </div>
                        <div>
                            <h3 className="text-white font-bold mb-6">Legal</h3>
                            <ul className="space-y-4">
                                <li><a className="text-gray-400 hover:text-accent-cyan transition-colors text-sm" href="#">Termeni și Condiții</a></li>
                                <li><a className="text-gray-400 hover:text-accent-cyan transition-colors text-sm" href="#">Politica de Confidențialitate</a></li>
                                <li><a className="text-gray-400 hover:text-accent-cyan transition-colors text-sm" href="#">Regulament Festival</a></li>
                                <li><a className="text-gray-400 hover:text-accent-cyan transition-colors text-sm" href="#">Cookie Policy</a></li>
                            </ul>
                        </div>
                    </div>
                    <div className="border-t border-white/5 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
                        <p className="text-gray-500 text-sm">© 2024 Banaton Fest. Toate drepturile rezervate.</p>
                        <p className="text-gray-600 text-xs">Designed with passion in Timișoara.</p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Layout;