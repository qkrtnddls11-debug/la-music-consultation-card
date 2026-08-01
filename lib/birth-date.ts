export type BirthDateParts = {
  year: string;
  month: string;
  day: string;
};

export const EMPTY_BIRTH_DATE: BirthDateParts = { year: "", month: "", day: "" };

export function birthDateFromInput(value: string, today = new Date()) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 8) return "";
  const year = Number(digits.slice(0, 4));
  const month = Number(digits.slice(4, 6));
  const day = Number(digits.slice(6, 8));
  const candidate = new Date(year, month - 1, day);
  const valid = year >= 1900
    && candidate.getFullYear() === year
    && candidate.getMonth() === month - 1
    && candidate.getDate() === day
    && candidate.getTime() <= today.getTime();
  return valid ? `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}` : "";
}

export function birthDateFromParts(value: BirthDateParts, today = new Date()) {
  return birthDateFromInput(`${value.year}${value.month}${value.day}`, today);
}

export function birthPartsFromDate(value: string | null): BirthDateParts {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return { ...EMPTY_BIRTH_DATE };
  const [year, month, day] = value.split("-");
  return { year, month, day };
}
