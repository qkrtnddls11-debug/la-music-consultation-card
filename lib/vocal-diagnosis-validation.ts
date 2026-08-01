import type { DiagnosisLevel, VocalDiagnosisInput } from "@/lib/types";
import { DIAGNOSIS_LEVELS, EMPTY_VOCAL_DIAGNOSIS } from "@/lib/types";

const TEXT_LIMIT = 5000;
const NAME_LIMIT = 80;

function clean(value: unknown, limit = TEXT_LIMIT) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

function cleanLevel(value: unknown): DiagnosisLevel {
  return typeof value === "string" && DIAGNOSIS_LEVELS.includes(value as (typeof DIAGNOSIS_LEVELS)[number])
    ? value as DiagnosisLevel
    : "";
}

function noteIndex(note: string) {
  const match = /^([A-G])(#?)([2-6])$/.exec(note);
  if (!match) return null;
  const semitones: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const midi = (Number(match[3]) + 1) * 12 + semitones[match[1]] + (match[2] ? 1 : 0);
  return midi >= 36 && midi <= 84 ? midi : null;
}

function cleanNote(value: unknown) {
  const note = clean(value, 4);
  return note && noteIndex(note) !== null ? note : "";
}

function cleanSeconds(value: unknown) {
  if (value === null || value === "" || typeof value === "undefined") return null;
  const number = Number(value);
  return Number.isInteger(number) && number >= 0 && number <= 999 ? number : null;
}

export function normalizeVocalDiagnosis(source: Partial<VocalDiagnosisInput>) {
  const studentName = clean(source.student_name, NAME_LIMIT);
  if (!studentName) return { error: "학생 이름을 입력해 주세요." } as const;

  const chestLow = cleanNote(source.chest_low_note);
  const chestHigh = cleanNote(source.chest_high_note);
  const falsettoLow = cleanNote(source.falsetto_low_note);
  const falsettoHigh = cleanNote(source.falsetto_high_note);

  if (chestLow && chestHigh && noteIndex(chestLow)! > noteIndex(chestHigh)!) {
    return { error: "진성 최고음은 최저음보다 높아야 합니다." } as const;
  }
  if (falsettoLow && falsettoHigh && noteIndex(falsettoLow)! > noteIndex(falsettoHigh)!) {
    return { error: "가성 최고음은 최저음보다 높아야 합니다." } as const;
  }

  const data: VocalDiagnosisInput = {
    ...EMPTY_VOCAL_DIAGNOSIS,
    consultation_id: typeof source.consultation_id === "string" && source.consultation_id ? source.consultation_id : null,
    student_name: studentName,
    confirmation_notes: clean(source.confirmation_notes),
    pitch_level: cleanLevel(source.pitch_level),
    pitch_memo: clean(source.pitch_memo),
    rhythm_level: cleanLevel(source.rhythm_level),
    rhythm_memo: clean(source.rhythm_memo),
    breath_level: cleanLevel(source.breath_level),
    breath_memo: clean(source.breath_memo),
    breath_exercise_seconds: cleanSeconds(source.breath_exercise_seconds),
    phonation_level: cleanLevel(source.phonation_level),
    phonation_memo: clean(source.phonation_memo),
    chest_low_note: chestLow,
    chest_high_note: chestHigh,
    falsetto_low_note: falsettoLow,
    falsetto_high_note: falsettoHigh,
    performance_level: cleanLevel(source.performance_level),
    performance_memo: clean(source.performance_memo),
    other_notes: clean(source.other_notes),
    lesson_direction: clean(source.lesson_direction),
  };

  return { data } as const;
}

export function vocalDiagnosisDatabasePayload(data: VocalDiagnosisInput) {
  return {
    ...data,
    pitch_level: data.pitch_level || null,
    rhythm_level: data.rhythm_level || null,
    breath_level: data.breath_level || null,
    phonation_level: data.phonation_level || null,
    performance_level: data.performance_level || null,
  };
}
