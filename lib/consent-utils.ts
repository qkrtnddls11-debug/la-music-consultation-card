import type { ConsentChoice } from "@/lib/types";

export const CONSENT_CHOICES: ConsentChoice[] = ["동의함", "동의하지 않음"];

function datePartsInSeoul(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return { year: Number(value.year), month: Number(value.month), day: Number(value.day) };
}

export function isUnder19(birthDate: string | null, today = new Date()) {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return true;
  const [year, month, day] = birthDate.split("-").map(Number);
  const current = datePartsInSeoul(today);
  let age = current.year - year;
  if (current.month < month || (current.month === month && current.day < day)) age -= 1;
  return age < 19;
}

export function consentChoice(value: unknown): ConsentChoice | null {
  return value === "동의함" || value === "동의하지 않음" ? value : null;
}
