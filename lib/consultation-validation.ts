import type {
  CardType,
  ConsultationInput,
  LessonExperience,
  SchedulePreference,
} from "@/lib/types";

const MAX_SHORT = 160;
const MAX_LONG = 4000;

const clean = (value: unknown, max = MAX_SHORT) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

const cleanArray = (value: unknown, maxItems = 30) =>
  Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim().slice(0, MAX_SHORT))
        .filter(Boolean)
        .slice(0, maxItems)
    : [];

function cleanLessonExperience(value: unknown): LessonExperience {
  if (!value || typeof value !== "object") {
    return { hasExperience: null, subjects: "", period: "" };
  }

  const source = value as Record<string, unknown>;
  return {
    hasExperience:
      typeof source.hasExperience === "boolean" ? source.hasExperience : null,
    subjects: clean(source.subjects),
    period: clean(source.period),
  };
}

function cleanSchedule(value: unknown): SchedulePreference[] {
  if (!Array.isArray(value)) return [];

  return value.slice(0, 3).flatMap((item, index) => {
    if (!item || typeof item !== "object") return [];
    const source = item as Record<string, unknown>;
    const rank = source.rank === 1 || source.rank === 2 || source.rank === 3
      ? source.rank
      : ((index + 1) as 1 | 2 | 3);

    return [{
      rank,
      days: cleanArray(source.days, 6),
      timeSlot: clean(source.timeSlot),
    }];
  });
}

export function normalizeConsultation(
  value: unknown,
): { data?: ConsultationInput; error?: string } {
  if (!value || typeof value !== "object") {
    return { error: "입력 형식이 올바르지 않습니다." };
  }

  const source = value as Record<string, unknown>;
  const purpose = clean(source.purpose);
  const cardType: CardType = purpose === "프로·입시" ? "입시" : "일반";
  const name = clean(source.name, 80);
  const subjects = cleanArray(source.subjects, 20);
  const birthDate = clean(source.birth_date, 10);
  const gender = clean(source.gender, 4);

  if (!name) return { error: "이름을 입력해 주세요." };
  if (!purpose) return { error: "레슨 목적을 선택해 주세요." };
  if (subjects.length === 0) return { error: "관심 과목을 하나 이상 선택해 주세요." };
  if (gender !== "남" && gender !== "여") return { error: "성별을 선택해 주세요." };
  if (birthDate && !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { error: "생년월일 형식이 올바르지 않습니다." };
  }

  const data: ConsultationInput = {
    card_type: cardType,
    submission_source: source.submission_source === "link" ? "link" : "tablet",
    name,
    birth_date: birthDate || null,
    student_phone: clean(source.student_phone, 20),
    parent_phone: clean(source.parent_phone, 20),
    subjects,
    vocal_difficulties: cleanArray(source.vocal_difficulties, 20),
    has_instrument: clean(source.has_instrument),
    purpose,
    school: cardType === "입시" ? clean(source.school) : "",
    school_status: cardType === "입시" ? clean(source.school_status) : "",
    region: cardType === "입시" ? clean(source.region) : "",
    gender,
    ipsi_type: cardType === "입시" ? clean(source.ipsi_type) : "",
    ipsi_period: cardType === "입시" ? clean(source.ipsi_period) : "",
    target_school: cardType === "입시" ? clean(source.target_school) : "",
    consult_content: cardType === "입시" ? clean(source.consult_content, MAX_LONG) : "",
    genre_song: cardType === "일반" ? clean(source.genre_song, 500) : "",
    question: cardType === "일반" ? clean(source.question, MAX_LONG) : "",
    lesson_experience: cleanLessonExperience(source.lesson_experience),
    referral_source: clean(source.referral_source),
    referral_name:
      clean(source.referral_source) === "지인추천"
        ? clean(source.referral_name, 80)
        : "",
    schedule_preferences: cleanSchedule(source.schedule_preferences),
    start_available: clean(source.start_available, 300),
    etc_memo: clean(source.etc_memo, MAX_LONG),
  };

  return { data };
}
