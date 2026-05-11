export type DayCode = "FRI" | "SAT" | "SUN" | "MON";
export type Category = "general" | "vip" | "parter" | "scaun";

export type ProductCode =
  | "GENERAL_1_DAY"
  | "GENERAL_2_DAY"
  | "GENERAL_3_DAY"
  | "GENERAL_4_DAY"
  | "VIP_1_DAY"
  | "VIP_4_DAY"
  | "PARTER_1_DAY"
  | "PARTER_4_DAY"
  | "SCAUN_1_DAY";

export const ALL_DAY_CODES: DayCode[] = ["FRI", "SAT", "SUN", "MON"];
export const NON_SAT_DAY_CODES: DayCode[] = ["FRI", "SUN", "MON"];

export function uniqueDayCodes(input: string[]): DayCode[] {
  const set = new Set(input);
  const filtered = [...set].filter((d): d is DayCode =>
    ["FRI", "SAT", "SUN", "MON"].includes(d)
  );
  return filtered;
}

export function arraysEqualUnordered(a: string[], b: string[]) {
  if (a.length !== b.length) return false;
  const aa = [...a].sort().join("|");
  const bb = [...b].sort().join("|");
  return aa === bb;
}

export function validateSelection(productCode: ProductCode, selectedDayCodes?: string[]) {
  const days = uniqueDayCodes(selectedDayCodes ?? []);

  switch (productCode) {
    case "GENERAL_1_DAY": {
      if (days.length !== 1) return { valid: false, message: "GENERAL_1_DAY necesită exact 1 zi." };
      return { valid: true, days };
    }

    case "GENERAL_2_DAY": {
      if (days.length !== 2) return { valid: false, message: "GENERAL_2_DAY necesită exact 2 zile." };
      const allAllowed = days.every((d) => NON_SAT_DAY_CODES.includes(d));
      if (!allAllowed) return { valid: false, message: "GENERAL_2_DAY permite doar Vineri, Duminică, Luni." };
      return { valid: true, days };
    }

    case "GENERAL_3_DAY": {
      const expected = ["FRI", "SUN", "MON"];
      if (!arraysEqualUnordered(days, expected)) {
        return { valid: false, message: "GENERAL_3_DAY este fix: Vineri + Duminică + Luni." };
      }
      return { valid: true, days: expected as DayCode[] };
    }

    case "GENERAL_4_DAY": {
      if (days.length > 0 && !arraysEqualUnordered(days, ALL_DAY_CODES)) {
        return { valid: false, message: "GENERAL_4_DAY este fix: toate cele 4 zile." };
      }
      return { valid: true, days: ALL_DAY_CODES };
    }

    case "VIP_1_DAY": {
      if (days.length !== 1) return { valid: false, message: "VIP_1_DAY necesită exact 1 zi." };
      return { valid: true, days };
    }

    case "VIP_4_DAY": {
      if (days.length > 0 && !arraysEqualUnordered(days, ALL_DAY_CODES)) {
        return { valid: false, message: "VIP_4_DAY este fix: toate cele 4 zile." };
      }
      return { valid: true, days: ALL_DAY_CODES };
    }

    case "PARTER_1_DAY": {
      if (days.length !== 1) return { valid: false, message: "PARTER_1_DAY necesită exact 1 zi." };
      return { valid: true, days };
    }

    case "PARTER_4_DAY": {
      if (days.length > 0 && !arraysEqualUnordered(days, ALL_DAY_CODES)) {
        return { valid: false, message: "PARTER_4_DAY este fix: toate cele 4 zile." };
      }
      return { valid: true, days: ALL_DAY_CODES };
    }

    case "SCAUN_1_DAY": {
      if (days.length !== 1) return { valid: false, message: "SCAUN_1_DAY necesită exact 1 zi." };
      // SCAUN only available Friday and Sunday
      if (days[0] !== "FRI" && days[0] !== "SUN") {
        return { valid: false, message: "Locurile pe scaun sunt disponibile doar Vineri și Duminică." };
      }
      return { valid: true, days };
    }

    default:
      return { valid: false, message: "Product code invalid." };
  }
}

export function computeUnitPrice(productCode: ProductCode, selectedDayCodes?: string[]): number {
  const days = uniqueDayCodes(selectedDayCodes ?? []);

  switch (productCode) {
    case "GENERAL_1_DAY": {
      if (days.length !== 1) throw new Error("GENERAL_1_DAY requires exactly 1 day.");
      return days[0] === "SAT" ? 80 : 50;
    }

    case "GENERAL_2_DAY":
      return 60;

    case "GENERAL_3_DAY":
      return 80;

    case "GENERAL_4_DAY":
      return 120;

    case "VIP_1_DAY": {
      if (days.length !== 1) throw new Error("VIP_1_DAY requires exactly 1 day.");
      // VIP: 400 lei for CECA (SAT), 300 lei for other days
      return days[0] === "SAT" ? 400 : 300;
    }

    case "VIP_4_DAY":
      // VIP 4-day package: 850 lei/seat
      return 850;

    case "PARTER_1_DAY": {
      if (days.length !== 1) throw new Error("PARTER_1_DAY requires exactly 1 day.");
      // PARTER: 100 lei for CECA (SAT), 75 lei for other days
      return days[0] === "SAT" ? 100 : 75;
    }

    case "PARTER_4_DAY":
      // PARTER 4-day package: 150 lei/seat (includes CECA)
      return 150;

    case "SCAUN_1_DAY": {
      if (days.length !== 1) throw new Error("SCAUN_1_DAY requires exactly 1 day.");
      // SCAUN: 100 lei for FRI and SUN only, NOT available SAT/MON
      if (days[0] === "SAT" || days[0] === "MON") {
        throw new Error("SCAUN seats are not available on Saturday (CECA) or Monday");
      }
      return 100;
    }

    default:
      throw new Error("Unknown product code");
  }
}

export function categoryFromProductCode(productCode: ProductCode): Category {
  if (productCode.startsWith("VIP")) return "vip";
  if (productCode.startsWith("PARTER")) return "parter";
  if (productCode.startsWith("SCAUN")) return "scaun";
  return "general";
}

export function labelFromProductCode(productCode: ProductCode): string {
  switch (productCode) {
    case "GENERAL_1_DAY": return "Acces General - 1 zi";
    case "GENERAL_2_DAY": return "Acces General - 2 zile";
    case "GENERAL_3_DAY": return "Acces General - 3 zile";
    case "GENERAL_4_DAY": return "Acces General - 4 zile";
    case "VIP_1_DAY": return "VIP - 1 zi";
    case "VIP_4_DAY": return "VIP - 4 zile";
    case "PARTER_1_DAY": return "Parter - 1 zi";
    case "PARTER_4_DAY": return "Parter - 4 zile";
    case "SCAUN_1_DAY": return "Scaun - 1 zi";
    default: return productCode;
  }
}

export function durationLabelFromProductCode(productCode: ProductCode): string {
  switch (productCode) {
    case "GENERAL_1_DAY":
    case "VIP_1_DAY":
    case "PARTER_1_DAY":
      return "1 zi";
    case "GENERAL_2_DAY":
      return "2 zile";
    case "GENERAL_3_DAY":
      return "3 zile";
    case "GENERAL_4_DAY":
    case "VIP_4_DAY":
    case "PARTER_4_DAY":
      return "4 zile";
    default:
      return "";
  }
}