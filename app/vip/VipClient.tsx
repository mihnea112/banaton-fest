"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: (string | undefined | null | false)[]) {
  return twMerge(clsx(inputs));
}

type ApiOrderItem = {
  id?: string;
  productCode?: string;
  category?: "general" | "vip";
  qty?: number;
  quantity?: number;
  unitPrice?: number;
  unit_price?: number;
  lineTotal?: number;
  line_total?: number;
  totalPrice?: number;
  name?: string;
  label?: string;
  variantLabel?: string | null;
  selectedDayCodes?: string[];
};

type ApiOrderResponse = {
  ok?: boolean;
  order?: {
    id?: string;
    publicToken?: string;
    status?: string;
    totalItems?: number;
    totalAmount?: number;
  };
  items?: ApiOrderItem[];
  error?: { message?: string };
};

type VipAllocationPayload = {
  allocations: Array<{
    tableLabel: string;
    dayCodes: Array<"fri" | "sat" | "sun" | "mon">;
    seats: number;
  }>;
};

function safeNumber(v: unknown) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function normalizeDayCodeLower(
  v: string,
): "fri" | "sat" | "sun" | "mon" | null {
  const x = String(v || "")
    .trim()
    .toLowerCase();
  if (x === "fri" || x === "sat" || x === "sun" || x === "mon") return x;
  return null;
}

export default function VipClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const orderToken = searchParams?.get("order") ?? null;

  const [activeZone, setActiveZone] = useState<string | null>(null);
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<number>(0);
  const [orderData, setOrderData] = useState<ApiOrderResponse | null>(null);
  const [vipItemsCount, setVipItemsCount] = useState(0);
  const [isLoadingOrder, setIsLoadingOrder] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSavingAllocation, setIsSavingAllocation] = useState(false);
  const [allocationError, setAllocationError] = useState<string | null>(null);

  const TABLE_CAPACITY = 6;

  useEffect(() => {
    let cancelled = false;

    const loadOrder = async () => {
      if (!orderToken) {
        setLoadError("Lipsește token-ul comenzii din URL.");
        setIsLoadingOrder(false);
        return;
      }

      try {
        setIsLoadingOrder(true);
        setLoadError(null);

        const res = await fetch(
          `/api/order/${encodeURIComponent(orderToken)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        const json = (await res.json().catch(() => ({}))) as ApiOrderResponse;

        if (!res.ok || !json?.ok) {
          throw new Error(
            json?.error?.message || "Nu s-a putut încărca comanda.",
          );
        }

        if (cancelled) return;

        setOrderData(json);

        const vipItems = (json.items || []).filter(
          (item) => item.category === "vip",
        );
        const vipCount = vipItems.reduce(
          (sum, item) => sum + safeNumber(item.qty ?? item.quantity ?? 0),
          0,
        );

        setVipItemsCount(vipCount);

        // IMPORTANT: keep selectedSeats in sync with vipCount
        setSelectedSeats((prev) => {
          if (vipCount <= 0) return 0;
          // if user didn't pick, default to full allocation
          if (prev <= 0) return Math.min(vipCount, TABLE_CAPACITY);
          // clamp to constraints
          return Math.min(prev, vipCount, TABLE_CAPACITY);
        });
      } catch (error) {
        if (cancelled) return;
        setOrderData(null);
        setLoadError(
          error instanceof Error
            ? error.message
            : "A apărut o eroare la încărcarea comenzii.",
        );
      } finally {
        if (!cancelled) setIsLoadingOrder(false);
      }
    };

    loadOrder();

    return () => {
      cancelled = true;
    };
  }, [orderToken]);

  useEffect(() => {
    if (isLoadingOrder) return;
    if (!orderToken) return;
    if (!orderData) return;

    if (!orderToken) return;

    if (vipItemsCount <= 0) {
      router.replace(`/checkout?order=${encodeURIComponent(orderToken)}`);
    }
  }, [isLoadingOrder, orderToken, orderData, vipItemsCount, router]);

  const vipUnitPrice = useMemo(() => {
    const vipItems = (orderData?.items || []).filter(
      (item) => item.category === "vip",
    );
    if (vipItems.length === 0) return 0;
    return Math.max(
      ...vipItems.map((item) =>
        safeNumber(item.unitPrice ?? item.unit_price ?? 0),
      ),
    );
  }, [orderData]);

  const orderTotalAmount = useMemo(() => {
    const apiTotal = safeNumber(orderData?.order?.totalAmount);
    if (apiTotal > 0) return apiTotal;

    return (orderData?.items || []).reduce((sum, item) => {
      const qty = safeNumber(item.qty ?? item.quantity ?? 0);
      const unit = safeNumber(item.unitPrice ?? item.unit_price ?? 0);
      const line = safeNumber(
        item.totalPrice ?? item.lineTotal ?? item.line_total ?? qty * unit,
      );
      return sum + line;
    }, 0);
  }, [orderData]);

  const vipSelectedDayCodes = useMemo(() => {
    const set = new Set<"fri" | "sat" | "sun" | "mon">();

    for (const item of orderData?.items || []) {
      if (item.category !== "vip") continue;
      for (const d of item.selectedDayCodes || []) {
        const normalized = normalizeDayCodeLower(d);
        if (normalized) set.add(normalized);
      }
    }

    return Array.from(set);
  }, [orderData]);

  const vipTablesSelectedCount = selectedTable ? 1 : 0;
  const vipTablesRequired = 1;
  const requiredVipSeats = Math.max(0, vipItemsCount);
  const availableSeatsForSelectedTable = selectedTable ? TABLE_CAPACITY : 0;
  const remainingVipSeats = Math.max(0, requiredVipSeats - selectedSeats);

  const canContinue =
    !!orderToken &&
    !isLoadingOrder &&
    !!selectedTable &&
    requiredVipSeats > 0 &&
    selectedSeats === requiredVipSeats;

  const buildVipAllocationsPayload = () => {
    if (!orderData || !selectedTable) {
      return [] as Array<{
        tableLabel: string;
        dayCodes: Array<"fri" | "sat" | "sun" | "mon">;
        seats: number;
      }>;
    }

    const allocations: Array<{
      tableLabel: string;
      dayCodes: Array<"fri" | "sat" | "sun" | "mon">;
      seats: number;
    }> = [];

    for (const item of orderData.items || []) {
      if (item.category !== "vip") continue;
      const qty = safeNumber(item.qty ?? item.quantity ?? 0);
      if (!Number.isFinite(qty) || qty <= 0) continue;

      const dayCodesFromItem = (item.selectedDayCodes || [])
        .map((d) => normalizeDayCodeLower(d))
        .filter(Boolean) as Array<"fri" | "sat" | "sun" | "mon">;

      if (!dayCodesFromItem.length) continue;

      allocations.push({
        tableLabel: selectedTable,
        dayCodes: dayCodesFromItem,
        seats: qty,
      });
    }

    return allocations;
  };

  const handleContinue = async () => {
    if (!orderToken || !selectedTable || !canContinue) return;

    try {
      setAllocationError(null);
      setIsSavingAllocation(true);

      const allocations = buildVipAllocationsPayload();
      const payload: VipAllocationPayload = { allocations };

      console.log("[vip-ui] saving vip allocation", {
        orderToken,
        payload,
        selectedTable,
        selectedSeats,
        vipSelectedDayCodes,
      });

      const res = await fetch(
        `/api/order/${encodeURIComponent(orderToken)}/vip-allocation`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );

      const json = (await res.json().catch(() => ({}))) as {
        error?: { message?: string };
        message?: string;
      };

      console.log("[vip-ui] vip allocation response", {
        status: res.status,
        ok: res.ok,
        body: json,
      });

      if (!res.ok) {
        throw new Error(
          json?.error?.message ||
            json?.message ||
            "Nu s-a putut salva alocarea VIP.",
        );
      }

      router.push(`/checkout?order=${encodeURIComponent(orderToken)}`);
    } catch (error) {
      console.error("[vip-ui] handleContinue error", error);
      setAllocationError(
        error instanceof Error
          ? error.message
          : "A apărut o eroare la salvarea alocării VIP.",
      );
    } finally {
      setIsSavingAllocation(false);
    }
  };

  const handleZoneClick = (zoneId: string) => {
    if (requiredVipSeats <= 0) return;
    setActiveZone(zoneId);
  };

  const handleTableSelect = (tableId: string) => {
    setSelectedTable(tableId);

    // IMPORTANT: for your current logic, seats must equal requiredVipSeats
    // Otherwise canContinue will never be true.
    setSelectedSeats(Math.min(requiredVipSeats || 1, TABLE_CAPACITY));

    setActiveZone(null);
  };

  const TableSelectorModal = ({
    zoneId,
    onClose,
  }: {
    zoneId: string;
    onClose: () => void;
  }) => {
    const [start, end] = zoneId.split("-").map(Number);
    const tables = Array.from({ length: end - start + 1 }, (_, i) => start + i);

    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
        <div className="bg-[#1A0B2E] border border-[#4C2A85] rounded-2xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-[0_0_50px_rgba(127,19,236,0.5)] overflow-hidden">
          <div className="p-6 border-b border-[#4C2A85] flex justify-between items-center bg-[#241242]">
            <div>
              <h3 className="text-white text-xl font-bold">Alege Masa</h3>
              <p className="text-indigo-300 text-sm">Zona {zoneId}</p>
            </div>
            <button
              onClick={onClose}
              className="text-indigo-300 hover:text-white transition-colors"
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>

          <div className="p-6 overflow-y-auto custom-scrollbar bg-[#130026]">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {tables.map((num) => {
                const tableId = `Masa ${num}`;
                const isSelected = selectedTable === tableId;

                const emptySeats = TABLE_CAPACITY;
                const canFitWholeOrder = (vipItemsCount || 0) <= emptySeats;

                return (
                  <button
                    key={num}
                    onClick={() => {
                      if (!canFitWholeOrder) return;
                      handleTableSelect(tableId);
                    }}
                    className={cn(
                      "rounded-xl p-3 min-h-[92px] flex flex-col items-center justify-center text-center transition-all border-2",
                      !canFitWholeOrder
                        ? "bg-[#1b1430] border-[#3a285e] text-indigo-300 opacity-60 cursor-not-allowed"
                        : isSelected
                          ? "bg-accent-cyan/10 border-accent-cyan text-white shadow-[0_0_15px_rgba(0,229,255,0.25)]"
                          : "bg-[#241242] border-[#4C2A85] text-white hover:border-accent-gold hover:bg-[#2D1B4E]",
                    )}
                  >
                    <span
                      className={cn(
                        "text-base font-black leading-none",
                        isSelected ? "text-accent-cyan" : "text-white",
                      )}
                    >
                      Masa {num}
                    </span>

                    <span className="mt-2 text-[11px] leading-tight text-indigo-200">
                      Locuri libere:{" "}
                      <span className="font-bold text-white">{emptySeats}</span>
                    </span>
                    <span
                      className={cn(
                        "mt-1 text-[10px] font-semibold",
                        canFitWholeOrder ? "text-accent-cyan" : "text-rose-300",
                      )}
                    >
                      {canFitWholeOrder
                        ? `Potrivită pentru ${vipItemsCount} bilete VIP`
                        : `Nu încape comanda (${vipItemsCount} locuri)`}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 border-t border-[#4C2A85] bg-[#1A0B2E] text-center">
            <p className="text-xs text-indigo-300">
              Toate mesele au capacitate de 6 persoane.
            </p>
          </div>
        </div>
      </div>
    );
  };

  const ZoneCircle = ({
    id,
    label,
    price,
    onClick,
    disabled,
  }: {
    id: string;
    label: string;
    price: number;
    onClick: () => void;
    disabled?: boolean;
  }) => {
    const [start, end] = id.split("-").map(Number);
    let isZoneSelected = false;
    if (selectedTable) {
      const tableNum = parseInt(selectedTable.replace("Masa ", ""));
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
              : "bg-[#1A0B2E] border-accent-gold text-accent-gold hover:bg-accent-gold/10 hover:shadow-[0_0_20px_rgba(255,215,0,0.3)]",
        )}
      >
        <span className="text-xs font-bold uppercase tracking-wider mb-1 opacity-80">
          Mesele
        </span>
        <span className="text-2xl font-black">{label}</span>
        {!disabled && (
          <div
            className={cn(
              "absolute -bottom-8 bg-[#1A0B2E] border border-[#4C2A85] px-2 py-1 rounded text-xs text-white opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none",
              isZoneSelected && "opacity-100 bottom-[-3rem]",
            )}
          >
            {price} RON / Masă
          </div>
        )}
        {isZoneSelected && (
          <div className="absolute -top-2 -right-2 bg-white text-[#130026] size-6 flex items-center justify-center rounded-full border-2 border-[#130026] shadow-lg">
            <span className="material-symbols-outlined text-sm font-bold">
              check
            </span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="bg-[#130026] text-slate-100 min-h-screen flex flex-col overflow-x-hidden font-display relative">
      {activeZone && (
        <TableSelectorModal
          zoneId={activeZone}
          onClose={() => setActiveZone(null)}
        />
      )}

      <div className="flex flex-1 flex-col lg:flex-row min-h-[calc(100vh-120px)]">
        <main className="flex-1 flex flex-col bg-background-dark overflow-hidden relative border-r border-[#4C2A85]">
          <div className="px-6 py-6 border-b border-[#4C2A85] shrink-0 z-10 bg-[#1A0B2E]">
            <div className="max-w-5xl mx-auto w-full">
              <div className="flex flex-col gap-3 mb-6">
                <div className="flex gap-6 justify-between items-end">
                  <p className="text-white text-base font-medium leading-normal">
                    Progres Rezervare
                  </p>
                  <p className="text-accent-cyan/80 text-sm font-normal leading-normal">
                    Pasul 4 din 5
                  </p>
                </div>
                <div className="h-2 w-full rounded-full bg-[#341C61]">
                  <div
                    className="h-2 rounded-full bg-gradient-to-r from-accent-gold to-accent-cyan shadow-[0_0_10px_rgba(0,229,255,0.5)]"
                    style={{ width: "80%" }}
                  ></div>
                </div>
              </div>

              <div className="flex justify-between items-start md:items-center flex-col md:flex-row gap-4">
                <div>
                  <h1 className="text-white text-3xl md:text-4xl font-black leading-tight tracking-[-0.033em] mb-2 drop-shadow-md">
                    Alege Zona VIP
                  </h1>
                  <p className="text-indigo-200 text-base font-normal">
                    Selectează o masă și alocă exact numărul de locuri VIP din
                    comandă.
                  </p>
                </div>

                <div className="flex flex-wrap gap-4 text-sm font-medium bg-[#341C61]/50 p-3 rounded-lg border border-[#4C2A85]">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full border-2 border-accent-gold bg-transparent shadow-[0_0_5px_rgba(255,215,0,0.4)]"></div>
                    <span className="text-white">Disponibil</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-accent-cyan border-2 border-accent-cyan shadow-[0_0_8px_rgba(0,229,255,0.6)]"></div>
                    <span className="text-[#130026] font-bold bg-accent-cyan px-1 rounded-sm">
                      Selectat
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full bg-[#4C2A85] border-2 border-[#4C2A85]"></div>
                    <span className="text-indigo-300">Rezervat</span>
                  </div>
                </div>

                {!isLoadingOrder && orderData && (
                  <div className="mt-4 rounded-lg border border-[#4C2A85] bg-[#241242]/60 p-3 text-sm text-indigo-100">
                    <p className="font-semibold text-white">
                      Rezervare din coș
                    </p>
                    <p className="mt-1">
                      Bilete VIP în comandă:{" "}
                      <span className="font-bold text-accent-gold">
                        {vipItemsCount}
                      </span>
                    </p>
                    <p>
                      Mese VIP selectate:{" "}
                      <span className="font-bold text-white">
                        {vipTablesSelectedCount} / {vipTablesRequired}
                      </span>
                    </p>
                    <p>
                      Locuri VIP de alocat:{" "}
                      <span className="font-bold text-white">
                        {requiredVipSeats}
                      </span>
                    </p>
                    <p>
                      Total coș curent:{" "}
                      <span className="font-bold text-accent-cyan">
                        {orderTotalAmount} RON
                      </span>
                    </p>
                    {allocationError && (
                      <div className="mt-3 rounded-md border border-rose-400/30 bg-rose-500/10 px-2 py-2 text-xs text-rose-200">
                        {allocationError}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-auto custom-scrollbar relative bg-[#0F0518] flex items-center justify-center p-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#2D1B4E] to-[#0F0518]">
            <div className="relative w-[1000px] h-[700px] bg-[#1A0B2E] rounded-3xl border border-[#4C2A85] shadow-2xl shadow-purple-900/30 p-8 select-none transform scale-75 md:scale-90 lg:scale-100 origin-center transition-transform">
              <div className="absolute right-6 top-6 z-20 rounded-xl border border-[#4C2A85] bg-[#241242]/80 backdrop-blur p-3 min-w-[250px]">
                <p className="text-white text-sm font-semibold">Alocare VIP</p>
                <p className="text-indigo-200 text-xs mt-1">
                  Ai{" "}
                  <span className="font-bold text-accent-gold">
                    {requiredVipSeats}
                  </span>{" "}
                  bilete VIP în comandă. Alege o masă cu minim{" "}
                  {requiredVipSeats || 1} locuri disponibile.
                </p>
                {selectedTable ? (
                  <div className="mt-2 text-xs text-indigo-100 space-y-1">
                    <p>
                      Masă selectată:{" "}
                      <span className="font-bold text-white">
                        {selectedTable}
                      </span>
                    </p>
                    <p>
                      Locuri disponibile:{" "}
                      <span className="font-bold text-white">
                        {availableSeatsForSelectedTable}
                      </span>
                    </p>
                  </div>
                ) : (
                  <p className="mt-2 text-xs text-indigo-300">
                    Nu ai selectat încă o masă.
                  </p>
                )}
              </div>

              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-gradient-to-b from-accent-cyan/20 to-transparent rounded-b-[4rem] border-b border-l border-r border-accent-cyan/30 flex items-center justify-center shadow-[0_10px_50px_-10px_rgba(0,229,255,0.2)] z-0">
                <div className="text-center">
                  <span className="text-accent-cyan font-black tracking-[0.3em] text-2xl uppercase drop-shadow-[0_0_10px_rgba(0,229,255,0.8)] block">
                    Scenă Principală
                  </span>
                  <div className="w-full h-1 bg-accent-cyan/50 mt-2 rounded-full blur-[2px]"></div>
                </div>
              </div>

              <div className="absolute top-40 left-1/2 -translate-x-1/2 w-[300px] h-[450px] border-2 border-dashed border-accent-cyan/30 rounded-[3rem] flex flex-col items-center justify-center bg-accent-cyan/5 hover:bg-accent-cyan/10 transition-colors group">
                <span className="material-symbols-outlined text-6xl text-accent-cyan/20 mb-4 group-hover:scale-110 transition-transform">
                  groups
                </span>
                <span className="text-accent-cyan font-black tracking-widest text-3xl uppercase drop-shadow-lg">
                  Fan Pit
                </span>
                <span className="text-accent-cyan/60 text-sm font-bold tracking-wider mt-2">
                  Standing Area
                </span>
              </div>

              <div className="absolute left-12 top-40 grid grid-cols-2 gap-6">
                <ZoneCircle
                  id="1-25"
                  label="1-25"
                  price={vipUnitPrice || 0}
                  onClick={() => handleZoneClick("1-25")}
                  disabled={requiredVipSeats <= 0}
                />
                <ZoneCircle
                  id="26-50"
                  label="26-50"
                  price={vipUnitPrice || 0}
                  onClick={() => handleZoneClick("26-50")}
                  disabled={requiredVipSeats <= 0}
                />
                <ZoneCircle
                  id="51-75"
                  label="51-75"
                  price={vipUnitPrice || 0}
                  onClick={() => handleZoneClick("51-75")}
                  disabled={requiredVipSeats <= 0}
                />
                <ZoneCircle
                  id="76-100"
                  label="76-100"
                  price={vipUnitPrice || 0}
                  onClick={() => handleZoneClick("76-100")}
                  disabled={requiredVipSeats <= 0}
                />
              </div>

              <div className="absolute right-12 top-40 grid grid-cols-2 gap-6">
                <ZoneCircle
                  id="101-125"
                  label="101-125"
                  price={vipUnitPrice || 0}
                  onClick={() => handleZoneClick("101-125")}
                  disabled={requiredVipSeats <= 0}
                />
                <ZoneCircle
                  id="126-150"
                  label="126-150"
                  price={vipUnitPrice || 0}
                  onClick={() => handleZoneClick("126-150")}
                  disabled={requiredVipSeats <= 0}
                />
                <ZoneCircle
                  id="151-175"
                  label="151-175"
                  price={vipUnitPrice || 0}
                  onClick={() => handleZoneClick("151-175")}
                  disabled={requiredVipSeats <= 0}
                />
                <ZoneCircle
                  id="176-200"
                  label="176-200"
                  price={vipUnitPrice || 0}
                  onClick={() => handleZoneClick("176-200")}
                  disabled={requiredVipSeats <= 0}
                />
              </div>

              <div
                className="absolute inset-0 pointer-events-none opacity-20 z-[-1]"
                style={{
                  backgroundImage:
                    "radial-gradient(#00E5FF 1px, transparent 1px)",
                  backgroundSize: "30px 30px",
                }}
              ></div>
            </div>

            {selectedTable && (
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-[90%] max-w-2xl bg-[#341C61]/80 backdrop-blur-xl rounded-xl p-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] flex flex-col md:flex-row md:items-center justify-between gap-4 animate-fade-in-up border-t border-accent-cyan/20 border border-accent-gold/10 z-50">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-accent-cyan rounded-full flex items-center justify-center text-[#130026] shadow-[0_0_15px_rgba(0,229,255,0.4)]">
                    <span className="material-symbols-outlined">table_bar</span>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-lg">
                      {selectedTable}
                    </h3>
                    <p className="text-indigo-200 text-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">
                        groups
                      </span>{" "}
                      {TABLE_CAPACITY} Persoane / Masă
                    </p>
                    <p className="text-xs text-indigo-300 mt-1">
                      Trebuie să aloci exact{" "}
                      <span className="font-bold text-white">
                        {requiredVipSeats}
                      </span>{" "}
                      locuri VIP.
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-start md:items-end gap-2">
                  <div className="flex items-center gap-3 rounded-lg border border-[#4C2A85] bg-[#1A0B2E]/70 p-2">
                    <span className="text-xs text-indigo-200 px-1">
                      Locuri VIP
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSeats((prev) => Math.max(1, prev - 1))
                      }
                      className="w-8 h-8 rounded bg-white/10 hover:bg-white/20 text-white disabled:opacity-40"
                      disabled={selectedSeats <= 1}
                    >
                      <span className="material-symbols-outlined text-sm">
                        remove
                      </span>
                    </button>
                    <span className="min-w-[28px] text-center font-bold text-white">
                      {selectedSeats}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setSelectedSeats((prev) =>
                          Math.min(
                            TABLE_CAPACITY,
                            requiredVipSeats || 1,
                            prev + 1,
                          ),
                        )
                      }
                      className="w-8 h-8 rounded bg-accent-cyan hover:bg-cyan-300 text-[#130026]"
                      disabled={
                        selectedSeats >=
                        Math.min(TABLE_CAPACITY, requiredVipSeats || 1)
                      }
                    >
                      <span className="material-symbols-outlined text-sm">
                        add
                      </span>
                    </button>
                  </div>

                  <p
                    className={cn(
                      "text-xs font-semibold",
                      selectedSeats === requiredVipSeats
                        ? "text-accent-cyan"
                        : "text-rose-300",
                    )}
                  >
                    {selectedSeats === requiredVipSeats
                      ? `Alocare completă: ${selectedSeats}/${requiredVipSeats} locuri`
                      : `Alocare incompletă: ${selectedSeats}/${requiredVipSeats} locuri`}
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        <aside className="w-full lg:w-[380px] bg-[#130026] border-l border-[#4C2A85] flex flex-col h-auto lg:h-full z-20 shadow-[-10px_0_40px_rgba(0,0,0,0.6)]">
          <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <h3 className="text-white text-xl font-bold mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-accent-gold">
                receipt_long
              </span>
              Sumar Comandă
            </h3>
            <div className="space-y-6">
              <div className="pb-6 border-b border-[#4C2A85]">
                <h4 className="text-white font-bold text-sm mb-3">
                  Bilete selectate
                </h4>

                {isLoadingOrder ? (
                  <div className="rounded-lg border border-dashed border-[#4C2A85] p-4 text-sm text-indigo-300">
                    Se încarcă comanda...
                  </div>
                ) : loadError ? (
                  <div className="rounded-lg border border-rose-400/30 bg-rose-500/10 p-4 text-sm text-rose-200">
                    {loadError}
                  </div>
                ) : orderData && (orderData.items || []).length > 0 ? (
                  <div className="space-y-3">
                    {(orderData.items || []).map((item, index) => {
                      const quantity = safeNumber(
                        item.qty ?? item.quantity ?? 0,
                      );
                      const unitPrice = safeNumber(
                        item.unitPrice ?? item.unit_price ?? 0,
                      );
                      const lineTotal = safeNumber(
                        item.totalPrice ??
                          item.lineTotal ??
                          item.line_total ??
                          quantity * unitPrice,
                      );
                      const title =
                        item.name || item.label || item.productCode || "Bilet";

                      return (
                        <div
                          key={
                            item.id ?? `${item.productCode ?? "item"}-${index}`
                          }
                          className="flex items-center justify-between gap-3 rounded-lg border border-[#4C2A85]/50 bg-[#241242]/40 p-3"
                        >
                          <div>
                            <p className="text-white text-sm font-semibold">
                              {title}
                            </p>
                            {item.variantLabel && (
                              <p className="text-indigo-200 text-xs">
                                {item.variantLabel}
                              </p>
                            )}
                            {!!item.selectedDayCodes?.length && (
                              <p className="text-indigo-300 text-xs mt-1">
                                Zile:{" "}
                                {item.selectedDayCodes.join(", ").toUpperCase()}
                              </p>
                            )}
                            <p className="text-indigo-300 text-xs mt-1">
                              {quantity} x {unitPrice} RON
                            </p>
                          </div>
                          <p className="text-white font-bold text-sm">
                            {lineTotal} RON
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-lg border border-dashed border-[#4C2A85] p-4 text-sm text-indigo-300">
                    Nu există date de comandă pentru acest token.
                  </div>
                )}
              </div>

              {selectedTable && (
                <div className="bg-[#241242]/50 rounded-xl p-4 border border-accent-gold/30 relative shadow-[0_0_15px_rgba(255,215,0,0.05)]">
                  <div className="absolute -top-2 -right-2 bg-accent-gold text-[#130026] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md">
                    NOU
                  </div>
                  <div className="flex gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-accent-gold/10 flex items-center justify-center text-accent-gold shrink-0 border border-accent-gold/20">
                      <span className="material-symbols-outlined">star</span>
                    </div>
                    <div>
                      <h4 className="text-accent-gold font-bold text-sm">
                        Masă VIP selectată
                      </h4>
                      <p className="text-white text-xs">{selectedTable}</p>
                      <p className="text-indigo-200 text-xs mt-1">
                        Locuri VIP alocate:{" "}
                        <span className="font-bold text-white">
                          {selectedSeats}
                        </span>{" "}
                        / {requiredVipSeats}
                      </p>
                    </div>
                  </div>
                  <ul className="text-indigo-200 text-xs space-y-1 pl-13 mb-3 list-disc list-inside">
                    <li>Intrare Prioritară</li>
                    <li>1x Sticlă Premium Vodka</li>
                    <li>Servire la masă</li>
                  </ul>
                  <div className="flex justify-between items-center pt-3 border-t border-[#4C2A85]/50">
                    <button
                      className="text-xs text-indigo-300 hover:text-red-400 flex items-center gap-1 transition-colors"
                      onClick={() => setSelectedTable(null)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm">
                        delete
                      </span>{" "}
                      Șterge
                    </button>
                    <span className="text-accent-gold font-bold text-sm drop-shadow-[0_0_5px_rgba(255,215,0,0.3)]">
                      {selectedSeats === requiredVipSeats
                        ? "Alocare completă"
                        : "Alocare incompletă"}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6 bg-[#0F0518] border-t border-[#4C2A85]">
            <div className="flex justify-between items-end mb-2">
              <span className="text-indigo-200 text-sm">Subtotal bilete</span>
              <span className="text-white font-medium">
                {orderTotalAmount} RON
              </span>
            </div>
            <div className="flex justify-between items-end mb-2">
              <span className="text-indigo-200 text-sm">
                Locuri VIP alocate
              </span>
              <span className="text-white font-medium">
                {selectedSeats} / {requiredVipSeats}
              </span>
            </div>
            <div className="flex justify-between items-end mb-6">
              <span className="text-indigo-200 text-sm">
                Masă VIP selectată
              </span>
              <span className="text-white font-medium">
                {selectedTable ? "Inclus în biletul VIP" : "0 RON"}
              </span>
            </div>
            <div className="flex justify-between items-end mb-6 pt-4 border-t border-[#4C2A85]">
              <span className="text-white text-lg font-bold">Total</span>
              <span className="text-accent-gold text-2xl font-black drop-shadow-[0_0_8px_rgba(255,215,0,0.4)]">
                {orderTotalAmount} RON
              </span>
            </div>
            <p className="mb-4 text-xs text-indigo-300">
              Selectarea mesei și alocarea exactă a locurilor VIP este
              obligatorie înainte de finalizarea comenzii.
            </p>
            <div className="flex gap-3">
              <Link
                href={
                  orderToken
                    ? `/tickets?order=${encodeURIComponent(orderToken)}`
                    : "/tickets"
                }
                className="px-4 py-3 rounded-lg border border-[#4C2A85] text-white font-bold text-sm hover:bg-[#341C61] hover:text-accent-cyan transition-colors w-1/3 text-center flex items-center justify-center"
              >
                Înapoi
              </Link>
              <button
                type="button"
                onClick={handleContinue}
                disabled={!canContinue || isSavingAllocation || isLoadingOrder}
                className={cn(
                  "px-4 py-3 rounded-lg font-bold text-sm transition-all w-2/3 flex items-center justify-center gap-2 group shadow-[0_0_20px_rgba(255,215,0,0.25)]",
                  canContinue && !isSavingAllocation && !isLoadingOrder
                    ? "bg-gradient-to-r from-accent-gold to-[#FFC107] text-[#130026] hover:from-white hover:to-white hover:text-accent-gold"
                    : "bg-[#4C2A85]/50 text-indigo-200 cursor-not-allowed shadow-none",
                )}
              >
                {isSavingAllocation
                  ? "Se salvează alocarea..."
                  : isLoadingOrder
                    ? "Se încarcă comanda..."
                    : selectedTable
                      ? canContinue
                        ? "Continuă la checkout"
                        : `Alocă toate locurile (${remainingVipSeats} rămase)`
                      : "Selectează o masă"}
                <span className="material-symbols-outlined text-lg group-hover:translate-x-1 transition-transform">
                  arrow_forward
                </span>
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
