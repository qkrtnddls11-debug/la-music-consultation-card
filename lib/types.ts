export const SUBJECT_OPTIONS = [
  "보컬",
  "미디",
  "작곡",
  "기타",
  "랩",
  "피아노",
  "트럼펫",
  "플루트",
] as const;

export const GUITAR_DETAILS = [
  "베이스",
  "일렉기타",
  "클래식기타",
  "재즈기타",
  "통기타",
] as const;

export const STYLE_DETAILS = ["클래식", "재즈"] as const;
export const VOCAL_DIFFICULTIES = ["음정", "박자", "테크닉", "감정표현", "발성", "호흡"] as const;
export const PURPOSE_OPTIONS = ["프로·입시", "오디션", "개인앨범·유튜브 준비", "여가·자기계발"] as const;
export const REFERRAL_OPTIONS = [
  "네이버 플레이스(지도)",
  "네이버 블로그",
  "네이버 카페",
  "페이스북/인스타",
  "지나가다 보고",
  "전단지",
  "지인추천",
] as const;
export const DAYS = ["월", "화", "수", "목", "금", "토"] as const;
export const TIME_SLOTS = ["오전 11~1시", "오후 1~4시", "오후 4~7시", "저녁 7~10시"] as const;

export type CardType = "일반" | "입시";
export type ConsultationStatus = "상담" | "등록";
export type SubmissionSource = "tablet" | "link";

export type LessonExperience = {
  hasExperience: boolean | null;
  subjects: string;
  period: string;
};

export type SchedulePreference = {
  rank: 1 | 2 | 3;
  days: string[];
  timeSlot: string;
};

export type ConsultationInput = {
  card_type: CardType;
  submission_source: SubmissionSource;
  name: string;
  birth_date: string | null;
  student_phone: string;
  parent_phone: string;
  subjects: string[];
  vocal_difficulties: string[];
  has_instrument: string;
  purpose: string;
  school: string;
  school_status: string;
  region: string;
  gender: string;
  ipsi_type: string;
  ipsi_period: string;
  target_school: string;
  consult_content: string;
  genre_song: string;
  question: string;
  lesson_experience: LessonExperience;
  referral_source: string;
  referral_name: string;
  schedule_preferences: SchedulePreference[];
  start_available: string;
  etc_memo: string;
};

export type ConsultationRecord = ConsultationInput & {
  id: string;
  created_at: string;
  status: ConsultationStatus;
};

export const EMPTY_SCHEDULE: SchedulePreference[] = [
  { rank: 1, days: [], timeSlot: "" },
  { rank: 2, days: [], timeSlot: "" },
  { rank: 3, days: [], timeSlot: "" },
];

export const EMPTY_CONSULTATION: ConsultationInput = {
  card_type: "일반",
  submission_source: "tablet",
  name: "",
  birth_date: null,
  student_phone: "",
  parent_phone: "",
  subjects: [],
  vocal_difficulties: [],
  has_instrument: "",
  purpose: "",
  school: "",
  school_status: "",
  region: "",
  gender: "",
  ipsi_type: "",
  ipsi_period: "",
  target_school: "",
  consult_content: "",
  genre_song: "",
  question: "",
  lesson_experience: { hasExperience: null, subjects: "", period: "" },
  referral_source: "",
  referral_name: "",
  schedule_preferences: EMPTY_SCHEDULE,
  start_available: "",
  etc_memo: "",
};
