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
export const COMMON_INSTRUMENT_DIFFICULTIES = ["기초 자세", "리듬·박자", "악보 읽기", "테크닉·속도", "곡 완성·표현"] as const;
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
export type ReservationSource = "link" | "tablet" | "crm";
export type ReservationStatus = "대기" | "확정" | "상담완료";
export type ConsentChoice = "동의함" | "동의하지 않음";
export type SignerRole = "본인" | "법정대리인";
export const DIAGNOSIS_LEVELS = ["상", "중상", "중", "중하", "하"] as const;
export type DiagnosisLevel = "" | (typeof DIAGNOSIS_LEVELS)[number];

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

export type ReservationSchedulePreference = {
  rank: 1 | 2 | 3;
  day: string;
  timeText: string;
};

export type ReservationInput = {
  name: string;
  phone: string;
  gender: string;
  birth_date: string;
  subjects: string[];
  lesson_type: "입시" | "취미" | "";
  schedule_preferences: ReservationSchedulePreference[];
  source: ReservationSource;
};

export type ReservationRecord = ReservationInput & {
  id: string;
  created_at: string;
  status: ReservationStatus;
  confirmed_at: string | null;
};

export type ConsultationInput = {
  reservation_id: string | null;
  card_type: CardType;
  submission_source: SubmissionSource;
  name: string;
  birth_date: string | null;
  student_phone: string;
  parent_phone: string;
  subjects: string[];
  vocal_difficulties: string[];
  instrument_difficulties: string[];
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
  admin_memo: string;
};

export type ConsultationRecord = ConsultationInput & {
  id: string;
  created_at: string;
  status: ConsultationStatus;
};

export type VocalDiagnosisInput = {
  consultation_id: string | null;
  student_name: string;
  confirmation_notes: string;
  pitch_level: DiagnosisLevel;
  pitch_memo: string;
  rhythm_level: DiagnosisLevel;
  rhythm_memo: string;
  breath_level: DiagnosisLevel;
  breath_memo: string;
  breath_exercise_seconds: number | null;
  phonation_level: DiagnosisLevel;
  phonation_memo: string;
  chest_low_note: string;
  chest_high_note: string;
  falsetto_low_note: string;
  falsetto_high_note: string;
  performance_level: DiagnosisLevel;
  performance_memo: string;
  other_notes: string;
  lesson_direction: string;
};

export type VocalDiagnosisRecord = VocalDiagnosisInput & {
  id: string;
  created_at: string;
  updated_at: string;
  branch_name?: string;
  author_name?: string | null;
};

export type ConsentRecord = {
  id: string;
  created_at: string;
  consultation_id: string;
  signer_name: string;
  signer_role: SignerRole;
  rules_agreed: boolean;
  required_info_agreed: boolean;
  unique_identifier_consent: ConsentChoice;
  optional_info_consent: ConsentChoice;
  marketing_consent: ConsentChoice;
  is_minor: boolean;
  guardian_name: string;
  guardian_phone: string;
  guardian_relationship: string;
  name_trace_path?: string;
  signature_path?: string;
  name_trace_url?: string;
  signature_url?: string;
  agreed_at: string;
};

export type ConsentSubmission = {
  consultation_id: string;
  rules_agreed: boolean;
  required_info_agreed: boolean;
  unique_identifier_consent: ConsentChoice;
  optional_info_consent: ConsentChoice;
  marketing_consent: ConsentChoice;
  guardian_name: string;
  guardian_phone: string;
  guardian_relationship: string;
  name_trace_image: string;
  signature_image: string;
};

export type ConsentConsultation = Pick<
  ConsultationRecord,
  "id" | "name" | "birth_date" | "student_phone" | "parent_phone" | "school" | "gender"
>;

export type ConsentRequestRecord = {
  id: string;
  created_at: string;
  consultation_id: string;
  expires_at: string;
  completed_at: string | null;
  revoked_at: string | null;
};

export const EMPTY_SCHEDULE: SchedulePreference[] = [
  { rank: 1, days: [], timeSlot: "" },
  { rank: 2, days: [], timeSlot: "" },
  { rank: 3, days: [], timeSlot: "" },
];

export const EMPTY_CONSULTATION: ConsultationInput = {
  reservation_id: null,
  card_type: "일반",
  submission_source: "tablet",
  name: "",
  birth_date: null,
  student_phone: "",
  parent_phone: "",
  subjects: [],
  vocal_difficulties: [],
  instrument_difficulties: [],
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
  admin_memo: "",
};

export const EMPTY_RESERVATION_SCHEDULE: ReservationSchedulePreference[] = [
  { rank: 1, day: "", timeText: "" },
  { rank: 2, day: "", timeText: "" },
  { rank: 3, day: "", timeText: "" },
];

export const EMPTY_VOCAL_DIAGNOSIS: VocalDiagnosisInput = {
  consultation_id: null,
  student_name: "",
  confirmation_notes: "",
  pitch_level: "",
  pitch_memo: "",
  rhythm_level: "",
  rhythm_memo: "",
  breath_level: "",
  breath_memo: "",
  breath_exercise_seconds: null,
  phonation_level: "",
  phonation_memo: "",
  chest_low_note: "",
  chest_high_note: "",
  falsetto_low_note: "",
  falsetto_high_note: "",
  performance_level: "",
  performance_memo: "",
  other_notes: "",
  lesson_direction: "",
};
