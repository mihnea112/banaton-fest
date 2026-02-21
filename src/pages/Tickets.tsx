import { Link } from 'react-router-dom';
import { useState } from 'react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Helper for conditional classes
function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type TicketCategory = 'general' | 'vip';

interface ProductVariant {
  id: string;
  label: string;
  price: number;
}

interface TicketProduct {
  id: string;
  category: TicketCategory;
  name: string;
  durationLabel: string;
  price: number; // Base price or starting price
  description?: string;
  variants?: ProductVariant[];
}

const PRODUCTS: TicketProduct[] = [
  // General Access
  { 
    id: 'gen-4day', 
    category: 'general', 
    name: 'Full Pass', 
    durationLabel: '4 Zile', 
    price: 550, 
    description: 'Acces complet la festival (Joi - Duminică)' 
  },
  { 
    id: 'gen-3day', 
    category: 'general', 
    name: 'Abonament 3 Zile', 
    durationLabel: '3 Zile', 
    price: 450, 
    description: 'Alege oricare 3 zile consecutive' 
  },
  { 
    id: 'gen-2day', 
    category: 'general', 
    name: 'Abonament 2 Zile', 
    durationLabel: '2 Zile', 
    price: 350, 
    description: 'Perfect pentru un weekend prelungit',
    variants: [
      { id: 'gen-2day-thu-fri', label: 'Joi - Vineri', price: 350 },
      { id: 'gen-2day-fri-sat', label: 'Vineri - Sâmbătă', price: 350 },
      { id: 'gen-2day-sat-sun', label: 'Sâmbătă - Duminică', price: 350 }
    ]
  },
  { 
    id: 'gen-1day', 
    category: 'general', 
    name: 'Bilet o Zi', 
    durationLabel: '1 Zi', 
    price: 150, 
    description: 'Alege ziua preferată de festival',
    variants: [
      { id: 'gen-1day-thu', label: 'Joi', price: 150 },
      { id: 'gen-1day-fri', label: 'Vineri', price: 200 },
      { id: 'gen-1day-sat', label: 'Sâmbătă', price: 250 },
      { id: 'gen-1day-sun', label: 'Duminică', price: 200 }
    ]
  },

  // VIP
  { 
    id: 'vip-4day', 
    category: 'vip', 
    name: 'VIP Full Pass', 
    durationLabel: '4 Zile', 
    price: 1100, 
    description: 'Experiența completă VIP' 
  },
  { 
    id: 'vip-1day', 
    category: 'vip', 
    name: 'VIP - 1 Zi', 
    durationLabel: '1 Zi', 
    price: 450, 
    description: 'Experiență VIP pentru o zi',
    variants: [
      { id: 'vip-1day-thu', label: 'Joi', price: 400 },
      { id: 'vip-1day-fri', label: 'Vineri', price: 450 },
      { id: 'vip-1day-sat', label: 'Sâmbătă', price: 550 },
      { id: 'vip-1day-sun', label: 'Duminică', price: 450 }
    ]
  },
];

export default function Tickets() {
  const [cart, setCart] = useState<Record<string, number>>({});
  const [expandedProducts, setExpandedProducts] = useState<Record<string, boolean>>({});

  const updateQuantity = (id: string, delta: number) => {
    setCart(prev => {
      const current = prev[id] || 0;
      const next = Math.max(0, current + delta);
      if (next === 0) {
        const { [id]: _, ...rest } = prev;
        return rest;
      }
      return { ...prev, [id]: next };
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedProducts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  // Helper to find product details (including variants) by ID
  const getProductDetails = (id: string) => {
    for (const p of PRODUCTS) {
      if (p.id === id) return { ...p, variantLabel: null };
      if (p.variants) {
        const v = p.variants.find(v => v.id === id);
        if (v) return { ...p, id: v.id, name: p.name, price: v.price, variantLabel: v.label };
      }
    }
    return null;
  };

  const totalAmount = Object.entries(cart).reduce((sum, [id, qty]) => {
    const product = getProductDetails(id);
    return sum + (product ? product.price * qty : 0);
  }, 0);

  const totalItems = Object.values(cart).reduce((sum, qty) => sum + qty, 0);

  const renderQuantityControls = (id: string, price: number, compact = false) => {
    const qty = cart[id] || 0;
    return (
      <div className={cn("flex items-center gap-3 bg-brand-deep/50 rounded-lg p-1 border border-white/10", compact && "gap-2")}>
        <button 
          onClick={(e) => { e.stopPropagation(); updateQuantity(id, -1); }}
          className={cn("rounded bg-white/5 hover:bg-white/10 flex items-center justify-center text-white transition-colors disabled:opacity-30", compact ? "size-6" : "size-8")}
          disabled={qty === 0}
        >
          <span className="material-symbols-outlined text-sm font-bold">remove</span>
        </button>
        <span className={cn("font-bold text-white text-center", compact ? "min-w-[16px] text-sm" : "min-w-[24px]")}>{qty}</span>
        <button 
          onClick={(e) => { e.stopPropagation(); updateQuantity(id, 1); }}
          className={cn("rounded bg-accent-cyan hover:bg-cyan-400 text-brand-deep flex items-center justify-center transition-colors shadow-[0_0_10px_rgba(0,240,255,0.3)]", compact ? "size-6" : "size-8")}
        >
          <span className="material-symbols-outlined text-sm font-bold">add</span>
        </button>
      </div>
    );
  };

  const renderProductRow = (product: TicketProduct) => {
    const hasVariants = !!product.variants;
    const isExpanded = expandedProducts[product.id];
    
    // Calculate total quantity for this product (sum of variants if any)
    const totalQty = hasVariants 
      ? product.variants!.reduce((sum, v) => sum + (cart[v.id] || 0), 0)
      : (cart[product.id] || 0);

    return (
      <div key={product.id} className={cn(
        "flex flex-col rounded-xl border transition-all duration-200 overflow-hidden",
        totalQty > 0 || isExpanded
          ? "bg-brand-surface border-accent-cyan/50 shadow-[0_0_15px_rgba(0,240,255,0.1)]" 
          : "bg-brand-surface/30 border-white/5 hover:border-white/10"
      )}>
        {/* Main Row */}
        <div 
          className={cn("flex flex-col sm:flex-row sm:items-center justify-between p-4 cursor-pointer", hasVariants && "hover:bg-white/5")}
          onClick={() => hasVariants && toggleExpand(product.id)}
        >
          <div className="flex flex-col gap-1 mb-4 sm:mb-0">
            <div className="flex items-center gap-3">
              <span className="font-bold text-white text-lg">{product.name}</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 text-brand-text uppercase tracking-wider">
                {product.durationLabel}
              </span>
            </div>
            {product.description && (
              <p className="text-sm text-brand-text/70">{product.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1 sm:hidden">
              <span className="text-accent-cyan font-bold">
                {hasVariants ? `de la ${Math.min(...product.variants!.map(v => v.price))} RON` : `${product.price} RON`}
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between sm:justify-end gap-6">
            <span className="hidden sm:block text-accent-cyan font-bold text-lg">
              {hasVariants ? `de la ${Math.min(...product.variants!.map(v => v.price))} RON` : `${product.price} RON`}
            </span>
            
            {hasVariants ? (
              <div className="flex items-center gap-2">
                 {totalQty > 0 && (
                   <span className="bg-accent-cyan text-brand-deep text-xs font-bold px-2 py-1 rounded-full">
                     {totalQty} selectate
                   </span>
                 )}
                 <span className={cn("material-symbols-outlined text-accent-cyan transition-transform duration-300", isExpanded && "rotate-180")}>
                   expand_more
                 </span>
              </div>
            ) : (
              renderQuantityControls(product.id, product.price)
            )}
          </div>
        </div>

        {/* Variants Section */}
        {hasVariants && (
          <div className={cn(
            "bg-black/20 border-t border-white/5 transition-all duration-300 ease-in-out overflow-hidden",
            isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
          )}>
            <div className="p-4 grid gap-3">
              <p className="text-sm text-brand-text mb-1 font-medium">Selectează perioada:</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {product.variants!.map(variant => (
                  <div key={variant.id} className={cn(
                    "flex items-center justify-between p-3 rounded-lg border transition-colors",
                    (cart[variant.id] || 0) > 0 
                      ? "bg-accent-cyan/10 border-accent-cyan/50" 
                      : "bg-white/5 border-white/5 hover:bg-white/10"
                  )}>
                    <div className="flex flex-col">
                      <span className="text-white font-medium text-sm">{variant.label}</span>
                      <span className="text-accent-cyan text-xs font-bold">{variant.price} RON</span>
                    </div>
                    {renderQuantityControls(variant.id, variant.price, true)}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="bg-brand-deep min-h-screen flex flex-col font-manrope text-slate-100 overflow-x-hidden selection:bg-accent-cyan selection:text-brand-deep">
      {/* Header */}
      <header className="flex items-center justify-between whitespace-nowrap border-b border-white/10 px-6 lg:px-10 py-4 bg-brand-deep/80 backdrop-blur-md z-50 sticky top-0">
        <Link to="/" className="flex items-center gap-4">
          <div className="size-8 text-accent-cyan">
            <span className="material-symbols-outlined text-3xl drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]">festival</span>
          </div>
          <h2 className="text-lg lg:text-xl font-bold leading-tight tracking-[-0.015em] text-white">Banaton Fest</h2>
        </Link>
        <div className="flex flex-1 justify-end gap-8 hidden lg:flex">
          <div className="flex items-center gap-9">
            <Link to="/" className="text-sm font-medium text-brand-text hover:text-accent-cyan transition-colors">Lineup</Link>
            <a href="#" className="text-sm font-medium text-brand-text hover:text-accent-cyan transition-colors">Info</a>
            <a href="#" className="text-sm font-medium text-brand-text hover:text-accent-cyan transition-colors">Contact</a>
          </div>
          <div className="flex gap-2">
            <button className="flex min-w-[84px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 bg-accent-cyan hover:bg-cyan-400 text-brand-deep text-sm font-bold transition-colors shadow-[0_0_15px_rgba(0,240,255,0.3)]">
              <span>Login</span>
            </button>
          </div>
        </div>
        <div className="lg:hidden text-white">
          <span className="material-symbols-outlined">menu</span>
        </div>
      </header>

      <main className="flex-grow w-full max-w-[1440px] mx-auto p-4 lg:p-8 relative">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-brand-surface/30 blur-[120px] rounded-full pointer-events-none -z-10"></div>
        <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-accent-cyan/5 blur-[100px] rounded-full pointer-events-none -z-10"></div>
        
        <div className="flex flex-col lg:flex-row gap-8">
          <div className="flex-1 w-full lg:w-[65%] flex flex-col gap-10">
            <div className="flex flex-col gap-2">
              <h1 className="text-3xl lg:text-4xl font-black leading-tight tracking-[-0.033em] text-white">Configurator Bilete</h1>
              <p className="text-brand-text text-base font-medium">Alege biletele dorite pentru Banaton Fest 2024.</p>
            </div>

            {/* General Access Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-brand-surface border border-white/10 flex items-center justify-center shadow-lg">
                  <span className="material-symbols-outlined text-white">confirmation_number</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">Acces General</h2>
              </div>
              
              <div className="flex flex-col gap-4">
                {PRODUCTS.filter(p => p.category === 'general').map(renderProductRow)}
              </div>
            </section>

            {/* VIP Section */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="size-10 rounded-xl bg-brand-surface border border-accent-gold/30 flex items-center justify-center shadow-lg shadow-accent-gold/10">
                  <span className="material-symbols-outlined text-accent-gold">star</span>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-white">VIP Experience</h2>
              </div>
              
              <div className="flex flex-col gap-4">
                {PRODUCTS.filter(p => p.category === 'vip').map(renderProductRow)}
              </div>
            </section>

            <div className="p-4 rounded-lg bg-accent-gold/10 border border-accent-gold/20 flex items-start gap-3">
              <span className="material-symbols-outlined text-accent-gold mt-0.5">info</span>
              <div>
                <p className="text-sm font-medium text-accent-gold mb-1">Informație importantă</p>
                <p className="text-sm text-brand-text">Prețurile includ toate taxele. Copiii sub 12 ani au acces gratuit însoțiți de un adult plătitor.</p>
              </div>
            </div>
          </div>

          {/* Sidebar Summary */}
          <aside className="w-full lg:w-[35%] relative">
            <div className="sticky top-24 flex flex-col gap-4">
              <div className="bg-brand-surface rounded-2xl p-6 shadow-2xl border border-white/10 flex flex-col h-auto backdrop-blur-xl">
                <h3 className="text-xl font-bold mb-6 flex items-center gap-2 text-white">
                  <span className="material-symbols-outlined text-accent-cyan">receipt_long</span>
                  Sumar Comandă
                </h3>
                
                <div className="flex flex-col gap-4 mb-6 max-h-[400px] overflow-y-auto custom-scrollbar pr-2">
                  {totalItems === 0 ? (
                    <div className="text-center py-8 text-brand-text/50 border-2 border-dashed border-white/5 rounded-xl">
                      <span className="material-symbols-outlined text-4xl mb-2">shopping_cart_off</span>
                      <p className="text-sm">Coșul tău este gol</p>
                    </div>
                  ) : (
                    Object.entries(cart).map(([id, qty]) => {
                      const product = getProductDetails(id);
                      if (!product) return null;
                      return (
                        <div key={id} className="flex flex-col gap-2 pb-4 border-b border-white/10 border-dashed last:border-0">
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <span className="bg-accent-cyan text-brand-deep text-[10px] font-bold px-1.5 rounded">{qty}x</span>
                                <p className="text-xs text-brand-text uppercase font-semibold">{product.category === 'vip' ? 'VIP' : 'General'}</p>
                              </div>
                              <p className="font-bold text-white text-sm">{product.name}</p>
                              {product.variantLabel && (
                                <p className="text-xs text-accent-cyan mt-0.5">{product.variantLabel}</p>
                              )}
                            </div>
                            <div className="text-right">
                              <p className="text-accent-cyan font-bold">{product.price * qty} RON</p>
                              <p className="text-[10px] text-brand-text">{product.price} x {qty}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="flex gap-2 mt-2 mb-4">
                  <input className="flex-1 bg-brand-deep border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-accent-cyan placeholder-white/30 transition-colors" placeholder="Cod Promo" type="text"/>
                  <button className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl text-white transition-colors border border-white/5">
                    <span className="material-symbols-outlined text-sm font-bold">arrow_forward</span>
                  </button>
                </div>

                <div className="mt-auto pt-4 border-t border-white/10">
                  <div className="flex justify-between items-end mb-2">
                    <span className="text-brand-text font-medium">Subtotal</span>
                    <span className="text-lg font-bold text-white">{totalAmount} RON</span>
                  </div>
                  <div className="flex justify-between items-end mb-6">
                    <span className="text-brand-text font-medium text-lg">Total de plată</span>
                    <span className="text-3xl font-black text-accent-cyan drop-shadow-[0_0_8px_rgba(0,240,255,0.3)]">{totalAmount} RON</span>
                  </div>
                  <Link 
                    to={totalItems > 0 ? "/checkout" : "#"} 
                    className={cn(
                      "w-full group font-bold text-lg py-4 px-6 rounded-xl shadow-[0_0_20px_rgba(0,240,255,0.3)] transition-all flex items-center justify-center gap-2",
                      totalItems > 0 
                        ? "bg-gradient-to-r from-accent-cyan to-cyan-400 hover:to-cyan-300 text-brand-deep hover:scale-[1.02] active:scale-[0.98]" 
                        : "bg-white/10 text-white/30 cursor-not-allowed shadow-none"
                    )}
                  >
                    Pasul Următor
                    <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform font-bold">arrow_forward</span>
                  </Link>
                  <p className="text-center text-xs text-brand-text/60 mt-4">
                    Prin continuarea comenzii accepți <a className="underline hover:text-white transition-colors" href="#">Termenii și Condiții</a>.
                  </p>
                </div>
              </div>
              
              <div className="bg-brand-surface/30 border border-white/5 rounded-2xl p-4 flex items-center gap-4">
                <div className="size-10 rounded-full bg-accent-cyan/10 flex items-center justify-center text-accent-cyan shrink-0">
                  <span className="material-symbols-outlined">support_agent</span>
                </div>
                <div>
                  <p className="font-bold text-sm text-white">Ai nevoie de ajutor?</p>
                  <a className="text-xs text-accent-cyan font-medium hover:underline hover:text-cyan-300 transition-colors" href="#">Contactează suportul</a>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
