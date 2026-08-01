export function formatBirthInput(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 8);
  if (digits.length <= 4) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 4)}.${digits.slice(4)}`;
  return `${digits.slice(0, 4)}.${digits.slice(4, 6)}.${digits.slice(6)}`;
}

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

export function birthInputFromDate(value: string | null) {
  return value && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value.replaceAll("-", ".") : "";
}
