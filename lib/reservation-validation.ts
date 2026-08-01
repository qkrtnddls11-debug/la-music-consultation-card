import type {
  ReservationInput,
  ReservationSchedulePreference,
  ReservationSource,
} from "@/lib/types";

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
    return {
      rank: (index + 1) as 1 | 2 | 3,
      day: clean(source.day, 10),
      timeText: clean(source.timeText, 120),
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
  const phoneDigits = phone.replace(/\D/g, "");

  if (!name) return { error: "성함을 입력해 주세요." };
  if (phoneDigits.length !== 10 && phoneDigits.length !== 11) return { error: "전화번호를 10~11자리로 입력해 주세요." };
  if (gender !== "남" && gender !== "여") return { error: "성별을 선택해 주세요." };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return { error: "생년월일을 모두 선택해 주세요." };
  if (subjects.length === 0) return { error: "희망 과목을 하나 이상 선택해 주세요." };
  if (lessonType !== "입시" && lessonType !== "취미") return { error: "입시 또는 취미를 선택해 주세요." };
  if (schedule.length !== 3 || schedule.some((item) => !item.day || !item.timeText)) {
    return { error: "희망 시간대 3개를 모두 입력해 주세요." };
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
      source: reservationSource,
    },
  };
}

export function validReservationId(value: string) {
  return UUID_PATTERN.test(value);
}
