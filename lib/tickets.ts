export type DayCode = "FRI" | "SAT" | "SUN" | "MON";
export type Category = "general" | "vip";

export type ProductCode =
  | "GENERAL_1_DAY"
  | "GENERAL_2_DAY"
  | "GENERAL_3_DAY"
  | "GENERAL_4_DAY"
  | "VIP_1_DAY"
  | "VIP_4_DAY";

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
      return days[0] === "SAT" ? 350 : 200;
    }

    case "VIP_4_DAY":
      return 750;

    default:
      throw new Error("Unknown product code");
  }
}

export function categoryFromProductCode(productCode: ProductCode): Category {
  return productCode.startsWith("VIP") ? "vip" : "general";
}

export function labelFromProductCode(productCode: ProductCode): string {
  switch (productCode) {
    case "GENERAL_1_DAY": return "Acces General - 1 zi";
    case "GENERAL_2_DAY": return "Acces General - 2 zile";
    case "GENERAL_3_DAY": return "Acces General - 3 zile";
    case "GENERAL_4_DAY": return "Acces General - 4 zile";
    case "VIP_1_DAY": return "VIP - 1 zi";
    case "VIP_4_DAY": return "VIP - 4 zile";
    default: return productCode;
  }
}

export function durationLabelFromProductCode(productCode: ProductCode): string {
  switch (productCode) {
    case "GENERAL_1_DAY":
    case "VIP_1_DAY":
      return "1 zi";
    case "GENERAL_2_DAY":
      return "2 zile";
    case "GENERAL_3_DAY":
      return "3 zile";
    case "GENERAL_4_DAY":
    case "VIP_4_DAY":
      return "4 zile";
    default:
      return "";
  }
}