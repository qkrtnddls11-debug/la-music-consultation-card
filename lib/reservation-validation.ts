import type {
  ReservationInput,
  ReservationSchedulePreference,
  ReservationSource,
} from "@/lib/types";
import { DAYS, DEFAULT_BRANCH, TIME_SLOTS } from "@/lib/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clean(value: unknown, max = 160) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

function cleanSubjects(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string").map((item) => item.trim().slice(0, 160)).filter(Boolean).slice(0, 20)
    : [];
}

function cleanSchedule(value: unknown): ReservationSchedulePreference[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 3).map((item, index) => {
    const source = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const legacyDay = clean(source.day, 10);
    const days = Array.isArray(source.days)
      ? source.days.filter((day): day is string => typeof day === "string" && DAYS.includes(day as (typeof DAYS)[number])).slice(0, DAYS.length)
      : legacyDay ? [legacyDay] : [];
    return {
      rank: (index + 1) as 1 | 2 | 3,
      days,
      timeSlot: clean(source.timeSlot, 40) || clean(source.timeText, 120),
    };
  });
}

export function normalizeReservation(value: unknown): { data?: ReservationInput; error?: string } {
  if (!value || typeof value !== "object") return { error: "입력 형식이 올바르지 않습니다." };
  const source = value as Record<string, unknown>;
  const name = clean(source.name, 80);
  const phone = clean(source.phone, 20);
  const gender = clean(source.gender, 4);
  const birthDate = clean(source.birth_date, 10);
  const subjects = cleanSubjects(source.subjects);
  const lessonType = clean(source.lesson_type, 4);
  const schedule = cleanSchedule(source.schedule_preferences);
  const scheduleNote = clean(source.schedule_note, 500);
  const phoneDigits = phone.replace(/\D/g, "");

  if (!name) return { error: "성함을 입력해 주세요." };
  if (phoneDigits.length !== 10 && phoneDigits.length !== 11) return { error: "전화번호를 10~11자리로 입력해 주세요." };
  if (gender !== "남" && gender !== "여") return { error: "성별을 선택해 주세요." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return { error: "생년월일을 모두 선택해 주세요." };
  if (subjects.length === 0) return { error: "희망 과목을 하나 이상 선택해 주세요." };
  if (lessonType !== "입시" && lessonType !== "취미") return { error: "입시 또는 취미를 선택해 주세요." };
  if (schedule.length !== 3 || !schedule[0]?.days.length || !schedule[0]?.timeSlot) {
    return { error: "1순위 요일과 시간대를 선택해 주세요." };
  }
  if (schedule.some((item) => (item.days.length > 0 || item.timeSlot) && (!item.days.length || !item.timeSlot))) {
    return { error: "선택한 순위는 요일과 시간대를 모두 골라 주세요." };
  }
  if (schedule.some((item) => item.timeSlot && !TIME_SLOTS.includes(item.timeSlot as (typeof TIME_SLOTS)[number]))) {
    return { error: "시간대를 다시 선택해 주세요." };
  }

  const requestedSource = clean(source.source, 10);
  const reservationSource: ReservationSource = requestedSource === "tablet" || requestedSource === "crm" ? requestedSource : "link";
  return {
    data: {
      name,
      phone,
      gender,
      birth_date: birthDate,
      subjects,
      lesson_type: lessonType,
      schedule_preferences: schedule,
      schedule_note: scheduleNote,
      source: reservationSource,
      branch_name: clean(source.branch_name, 60) || DEFAULT_BRANCH,
    },
  };
}

export function validReservationId(value: string) {
  return UUID_PATTERN.test(value);
}
