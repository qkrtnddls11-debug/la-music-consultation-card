"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DAYS,
  EMPTY_CONSULTATION,
  GUITAR_DETAILS,
  PURPOSE_OPTIONS,
  REFERRAL_OPTIONS,
  STYLE_DETAILS,
  SUBJECT_OPTIONS,
  TIME_SLOTS,
  VOCAL_DIFFICULTIES,
  type ConsultationInput,
  type SchedulePreference,
  type SubmissionSource,
} from "@/lib/types";

type StepId =
  | "name"
  | "birth"
  | "gender"
  | "phones"
  | "subjects"
  | "vocal"
  | "instrument"
  | "purpose"
  | "ipsi-info"
  | "ipsi-type"
  | "ipsi-target"
  | "experience"
  | "ipsi-consult"
  | "genre"
  | "question"
  | "source"
  | "schedule"
  | "etc"
  | "summary";

type SubjectDetailKey = "기타" | "피아노" | "트럼펫" | "플루트";
type SubjectDetails = Record<SubjectDetailKey, string[]>;

const STEP_LABELS: Record<StepId, string> = {
  name: "이름",
  birth: "생년월일",
  gender: "성별",
  phones: "연락처",
  subjects: "관심 과목",
  vocal: "보컬",
  instrument: "악기 소지",
  purpose: "레슨 목적",
  "ipsi-info": "입시 · 학교 정보",
  "ipsi-type": "입시 · 유형",
  "ipsi-target": "입시 · 목표 학교",
  experience: "레슨 경험",
  "ipsi-consult": "입시 · 상담 내용",
  genre: "관심 곡·장르",
  question: "궁금한 점",
  source: "알게 된 경로",
  schedule: "가능한 스케줄",
  etc: "기타",
  summary: "확인",
};

const INSTRUMENTS = ["기타", "피아노", "트럼펫", "플루트", "미디"];
const EMPTY_DETAILS: SubjectDetails = { 기타: [], 피아노: [], 트럼펫: [], 플루트: [] };

function createEmptyDraft(submissionSource: SubmissionSource): ConsultationInput {
  return {
    ...EMPTY_CONSULTATION,
    submission_source: submissionSource,
    subjects: [],
    vocal_difficulties: [],
    lesson_experience: { hasExperience: null, subjects: "", period: "" },
    schedule_preferences: [
      { rank: 1, days: [], timeSlot: "" },
      { rank: 2, days: [], timeSlot: "" },
      { rank: 3, days: [], timeSlot: "" },
    ],
  };
}

function buildFlow(draft: ConsultationInput): StepId[] {
  const steps: StepId[] = ["name", "birth", "gender", "phones", "subjects"];
  if (draft.subjects.includes("보컬")) steps.push("vocal");
  if (draft.subjects.some((subject) => INSTRUMENTS.includes(subject))) steps.push("instrument");
  steps.push("purpose");

  if (draft.purpose === "프로·입시") {
    steps.push("ipsi-info", "ipsi-type", "ipsi-target", "experience", "ipsi-consult");
  } else {
    steps.push("experience", "genre", "question");
  }

  steps.push("source", "schedule", "etc", "summary");
  return steps;
}

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function validPhone(value: string) {
  const length = value.replace(/\D/g, "").length;
  return length === 0 || length === 10 || length === 11;
}

function toggleValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function birthDate(year: string, month: string, day: string) {
  if (!year || !month || !day) return null;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function getAge(date: string | null, today: Date | null) {
  if (!date || !today) return null;
  const [year, month, day] = date.split("-").map(Number);
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age;
}

function detailSubjects(subjects: string[], details: SubjectDetails) {
  return subjects.map((subject) => {
    if (!(subject in details)) return subject;
    const selected = details[subject as SubjectDetailKey];
    return selected.length ? `${subject}(${selected.join(",")})` : subject;
  });
}

function Chip({
  children,
  selected,
  onClick,
  compact = false,
}: {
  children: React.ReactNode;
  selected: boolean;
  onClick: () => void;
  compact?: boolean;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`inline-flex max-w-full min-w-0 items-center justify-center whitespace-normal break-keep rounded-[14px] border-[1.5px] text-center font-medium leading-snug transition active:scale-[0.99] ${
        compact ? "min-h-12 px-3.5 py-[11px] text-[0.92rem] sm:px-[15px] sm:text-[0.95rem]" : "min-h-[54px] px-4 py-[14px] text-base sm:px-[19px] sm:text-[1.05rem]"
      } ${
        selected
          ? "border-[#2b2723] bg-[#2b2723] font-semibold text-white"
          : "border-[#d8d2c8] bg-[#faf9f6] text-[#3a362f]"
      }`}
    >
      {selected ? <span className="mr-1.5 font-bold text-[#e8a23d]" aria-hidden="true">✓</span> : null}
      {children}
    </button>
  );
}

function ChipWrap({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`flex flex-wrap items-stretch gap-2.5 ${className}`}>{children}</div>;
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="mb-[7px] text-[0.88rem] font-semibold text-[#6b6459]">{label}</div>
      {children}
    </div>
  );
}

const inputClass =
  "min-h-[54px] w-full min-w-0 rounded-xl border-[1.5px] border-[#d8d2c8] bg-[#faf9f6] px-3.5 py-3 text-base text-[#1e1c18] placeholder:text-[#aaa399] focus:border-[#e8a23d] focus:bg-white focus:outline-none sm:text-[1.08rem]";

function QuestionHeading({ title, sub }: { title: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <header>
      <h2 className="text-[1.22rem] font-extrabold leading-[1.4] tracking-[-0.02em] sm:text-[1.35rem]">{title}</h2>
      <div className={`text-[0.9rem] text-[#8a8378] ${sub ? "mt-1.5 mb-[22px]" : "mb-[22px]"}`}>
        {sub}
      </div>
    </header>
  );
}

function SubBlock({ children }: { children: React.ReactNode }) {
  return <div className="mt-[18px] rounded-[14px] bg-[#f7f4ee] p-4">{children}</div>;
}

export function ConsultationWizard({ submissionSource }: { submissionSource: SubmissionSource }) {
  const [draft, setDraft] = useState<ConsultationInput>(() => createEmptyDraft(submissionSource));
  const [details, setDetails] = useState<SubjectDetails>({ ...EMPTY_DETAILS });
  const [birth, setBirth] = useState({ year: "", month: "", day: "" });
  const [targetKnown, setTargetKnown] = useState<boolean | null>(null);
  const [genreKnown, setGenreKnown] = useState<boolean | null>(null);
  const [current, setCurrent] = useState<StepId>("name");
  const [today, setToday] = useState<Date | null>(null);
  const [warning, setWarning] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const stageRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<() => void>(() => undefined);
  const autoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flow = useMemo(() => buildFlow(draft), [draft]);
  const stepIndex = Math.max(0, flow.indexOf(current));
  const isIpsi = draft.purpose === "프로·입시";
  const chosenBirthDate = birthDate(birth.year, birth.month, birth.day);
  const age = getAge(chosenBirthDate, today);

  useEffect(() => {
    const timer = window.setTimeout(() => setToday(new Date()), 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    return () => {
      if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    stageRef.current?.scrollTo({ top: 0 });
  }, [current]);

  useEffect(() => {
    if (!submitted) return;
    const timer = window.setTimeout(() => {
      setDraft(createEmptyDraft(submissionSource));
      setDetails({ 기타: [], 피아노: [], 트럼펫: [], 플루트: [] });
      setBirth({ year: "", month: "", day: "" });
      setTargetKnown(null);
      setGenreKnown(null);
      setCurrent("name");
      setSubmitError("");
      setSubmitted(false);
    }, 3000);
    return () => window.clearTimeout(timer);
  }, [submissionSource, submitted]);

  const years = useMemo(() => {
    if (!today) return [];
    return Array.from({ length: 67 }, (_, index) => today.getFullYear() - 4 - index);
  }, [today]);

  const daysInMonth = useMemo(() => {
    if (!birth.month) return 31;
    return new Date(Number(birth.year) || today?.getFullYear() || 2000, Number(birth.month), 0).getDate();
  }, [birth.month, birth.year, today]);

  function changeBirthYear(year: string) {
    setBirth((previous) => {
      if (!previous.month || !previous.day) return { ...previous, year };
      const maximum = new Date(Number(year) || today?.getFullYear() || 2000, Number(previous.month), 0).getDate();
      return { ...previous, year, day: String(Math.min(Number(previous.day), maximum)) };
    });
  }

  function changeBirthMonth(month: string) {
    setBirth((previous) => {
      if (!month || !previous.day) return { ...previous, month };
      const maximum = new Date(Number(previous.year) || today?.getFullYear() || 2000, Number(month), 0).getDate();
      return { ...previous, month, day: String(Math.min(Number(previous.day), maximum)) };
    });
  }

  function patchDraft<K extends keyof ConsultationInput>(key: K, value: ConsultationInput[K]) {
    setDraft((previous) => ({ ...previous, [key]: value }));
  }

  function validateStep(step: StepId) {
    if (step === "name" && !draft.name.trim()) return "이름을 입력해 주세요";
    if (step === "birth" && [birth.year, birth.month, birth.day].some(Boolean) && !chosenBirthDate) {
      return "생년월일의 년, 월, 일을 모두 선택해 주세요";
    }
    if (step === "gender" && !draft.gender) return "성별을 선택해 주세요";
    if (step === "phones" && (!validPhone(draft.student_phone) || !validPhone(draft.parent_phone))) {
      return "연락처를 10~11자리로 입력해 주세요";
    }
    if (step === "subjects" && draft.subjects.length === 0) return "관심 과목을 하나 이상 선택해 주세요";
    if (step === "purpose" && !draft.purpose) return "레슨 목적을 선택해 주세요";
    return "";
  }

  function goNext() {
    const message = validateStep(current);
    if (message) {
      setWarning(message);
      return;
    }
    setWarning("");
    const activeFlow = buildFlow(draft);
    const index = activeFlow.indexOf(current);
    if (index >= 0 && index < activeFlow.length - 1) setCurrent(activeFlow[index + 1]);
  }
  useEffect(() => {
    nextRef.current = goNext;
  });

  function goPrevious() {
    setWarning("");
    const activeFlow = buildFlow(draft);
    const index = activeFlow.indexOf(current);
    if (index > 0) setCurrent(activeFlow[index - 1]);
  }

  function scheduleNext(stay = false) {
    if (stay) return;
    if (autoTimerRef.current) clearTimeout(autoTimerRef.current);
    autoTimerRef.current = setTimeout(() => nextRef.current(), 350);
  }

  function selectPurpose(value: string) {
    setDraft((previous) => ({
      ...previous,
      purpose: value,
      card_type: value === "프로·입시" ? "입시" : "일반",
    }));
    scheduleNext();
  }

  function selectSubject(subject: string) {
    const selected = draft.subjects.includes(subject);
    patchDraft("subjects", toggleValue(draft.subjects, subject));
    if (selected && subject in details) {
      setDetails((previous) => ({ ...previous, [subject]: [] }));
    }
    if (selected && subject === "보컬") patchDraft("vocal_difficulties", []);
  }

  function updateSchedule(rank: 1 | 2 | 3, patch: Partial<SchedulePreference>) {
    patchDraft(
      "schedule_preferences",
      draft.schedule_preferences.map((item) => item.rank === rank ? { ...item, ...patch } : item),
    );
  }

  function payload(): ConsultationInput {
    return {
      ...draft,
      birth_date: chosenBirthDate,
      card_type: isIpsi ? "입시" : "일반",
      subjects: detailSubjects(draft.subjects, details),
      target_school: targetKnown === false ? "잘 모른다" : draft.target_school,
      genre_song: genreKnown === false ? "없음" : draft.genre_song,
    };
  }

  async function submit() {
    setSubmitting(true);
    setSubmitError("");
    try {
      const response = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload()),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "저장하지 못했습니다.");
      setSubmitted(true);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "저장하지 못했습니다.");
    } finally {
      setSubmitting(false);
    }
  }

  const dateLabel = today ? `${today.getMonth() + 1}월 ${today.getDate()}일` : null;

  if (submitted) {
    return (
      <main className="flex min-h-dvh flex-col bg-[#f4f2ee]">
        <TopBar isIpsi={isIpsi} label="저장 완료" />
        <div className="flex flex-1 items-center justify-center p-5">
          <section className="animate-card-in w-full max-w-[680px] rounded-[20px] bg-white px-8 py-14 text-center shadow-[0_2px_10px_rgba(0,0,0,0.07)]">
            <div className="animate-check-in mx-auto flex size-20 items-center justify-center rounded-full bg-[#e8a23d] text-4xl font-black text-[#2b2723]" aria-hidden="true">✓</div>
            <h1 className="mt-6 text-[1.6rem] font-extrabold">감사합니다!</h1>
            <p className="mt-2 text-base leading-relaxed text-[#6b6459]">상담 카드가 안전하게 저장되었어요.<br />잠시 후 처음 화면으로 돌아갑니다.</p>
            <div className="mx-auto mt-8 h-1.5 w-40 overflow-hidden rounded-full bg-[#eee9e0]">
              <div className="h-full w-full origin-left animate-[pulse_1s_ease-in-out_infinite] bg-[#e8a23d]" />
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh max-h-dvh flex-col overflow-hidden bg-[#f4f2ee]">
      <TopBar isIpsi={isIpsi && stepIndex >= flow.indexOf("purpose")} label={submissionSource === "link" ? "온라인 작성" : "현장 작성"} />
      <div className="shrink-0 bg-[#2b2723] px-4 pb-3 sm:px-[22px]">
        <div className="mb-1.5 flex justify-between text-[0.78rem] text-[#b5aea3]">
          <span>{STEP_LABELS[current]}</span>
          <span aria-label={`전체 ${flow.length}단계 중 ${stepIndex + 1}단계`}>{stepIndex + 1} / {flow.length}</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[#4a453d]" role="progressbar" aria-valuemin={1} aria-valuemax={flow.length} aria-valuenow={stepIndex + 1}>
          <div
            className="h-full rounded-full bg-[#e8a23d] transition-[width] duration-300"
            style={{ width: `${flow.length > 1 ? Math.round((stepIndex / (flow.length - 1)) * 100) : 0}%` }}
          />
        </div>
      </div>

      <div ref={stageRef} className="flex flex-1 flex-col items-center overflow-y-auto px-3.5 py-4 overscroll-contain sm:px-5 sm:py-6">
        <section key={current} className="animate-card-in w-full max-w-[680px] rounded-[18px] bg-white px-4 py-6 shadow-[0_2px_10px_rgba(0,0,0,0.07)] sm:rounded-[20px] sm:px-[30px] sm:pt-[34px] sm:pb-7">
          {renderCurrentStep()}
          {warning ? <p className="mt-3 text-[0.88rem] font-semibold text-[#c0392b]" role="alert">{warning}</p> : null}
          <nav className="mt-7 flex gap-2.5" aria-label="상담 카드 단계 이동">
            {stepIndex > 0 ? (
              <button type="button" onClick={goPrevious} className="min-h-[54px] flex-1 rounded-[14px] bg-[#eee9e0] px-3 text-base font-extrabold text-[#4a453d] active:scale-[0.99] sm:px-4 sm:text-[1.05rem]">← 이전</button>
            ) : null}
            {current === "summary" ? (
              <button type="button" onClick={submit} disabled={submitting} className="min-h-[54px] flex-[2.2] rounded-[14px] bg-[#2b2723] px-4 text-[1.05rem] font-extrabold text-white disabled:cursor-wait disabled:opacity-60">
                {submitting ? "안전하게 저장 중…" : "이대로 제출 ✓"}
              </button>
            ) : (
              <button type="button" onClick={goNext} className="min-h-[54px] flex-[2.2] rounded-[14px] bg-[#e8a23d] px-3 text-base font-extrabold text-[#2b2723] shadow-[0_4px_14px_rgba(232,162,61,0.35)] active:scale-[0.99] sm:px-4 sm:text-[1.05rem]">
                {current === "etc" ? "작성 완료 →" : "다음 →"}
              </button>
            )}
          </nav>
          {submitError ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-center text-sm font-semibold text-red-700" role="alert">{submitError}</p> : null}
        </section>
      </div>
    </main>
  );

  function renderCurrentStep() {
    switch (current) {
      case "name":
        return (
          <>
            <QuestionHeading title={<>안녕하세요! 😊<br />이름을 알려주세요</>} sub={<>방문 날짜는 오늘{dateLabel ? <>(<b>{dateLabel}</b>)</> : null}로 자동 저장돼요</>} />
            <label className="sr-only" htmlFor="student-name">이름</label>
            <input id="student-name" autoComplete="name" className={inputClass} value={draft.name} onChange={(event) => patchDraft("name", event.target.value)} placeholder="이름 입력" autoFocus />
          </>
        );
      case "birth":
        return (
          <>
            <QuestionHeading title="생년월일을 선택해 주세요" sub={age === null ? "나이는 자동으로 계산돼요" : <><b className="text-[#4a453d]">만 {age}세</b>로 계산되었어요</>} />
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <label className="sr-only" htmlFor="birth-year">태어난 연도</label>
              <select id="birth-year" className={`${inputClass} px-2 text-[0.95rem] sm:px-3.5 sm:text-[1.08rem]`} value={birth.year} onChange={(event) => changeBirthYear(event.target.value)}>
                <option value="">년</option>{years.map((year) => <option key={year} value={year}>{year}년</option>)}
              </select>
              <label className="sr-only" htmlFor="birth-month">태어난 월</label>
              <select id="birth-month" className={`${inputClass} px-2 text-[0.95rem] sm:px-3.5 sm:text-[1.08rem]`} value={birth.month} onChange={(event) => changeBirthMonth(event.target.value)}>
                <option value="">월</option>{Array.from({ length: 12 }, (_, index) => index + 1).map((month) => <option key={month} value={month}>{month}월</option>)}
              </select>
              <label className="sr-only" htmlFor="birth-day">태어난 일</label>
              <select id="birth-day" className={`${inputClass} px-2 text-[0.95rem] sm:px-3.5 sm:text-[1.08rem]`} value={birth.day} onChange={(event) => setBirth((previous) => ({ ...previous, day: event.target.value }))}>
                <option value="">일</option>{Array.from({ length: daysInMonth }, (_, index) => index + 1).map((day) => <option key={day} value={day}>{day}일</option>)}
              </select>
            </div>
          </>
        );
      case "gender":
        return (
          <>
            <QuestionHeading title="성별을 선택해 주세요" sub="하나만 선택해 주세요" />
            <ChipWrap>
              {["남", "여"].map((value) => (
                <Chip key={value} selected={draft.gender === value} onClick={() => { patchDraft("gender", value); scheduleNext(); }}>{value}</Chip>
              ))}
            </ChipWrap>
          </>
        );
      case "phones":
        return (
          <>
            <QuestionHeading title="연락처를 입력해 주세요" sub="숫자만 누르면 하이픈(-)은 자동으로 들어가요" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="학생 연락처"><input aria-label="학생 연락처" type="tel" inputMode="numeric" autoComplete="tel" className={inputClass} value={draft.student_phone} onChange={(event) => patchDraft("student_phone", formatPhone(event.target.value))} placeholder="010-0000-0000" maxLength={13} /></Field>
              <Field label="학부모 연락처"><input aria-label="학부모 연락처" type="tel" inputMode="numeric" className={inputClass} value={draft.parent_phone} onChange={(event) => patchDraft("parent_phone", formatPhone(event.target.value))} placeholder="010-0000-0000" maxLength={13} /></Field>
            </div>
          </>
        );
      case "subjects":
        return (
          <>
            <QuestionHeading title={<>레슨 받고 싶거나<br />관심 있는 과목은 무엇인가요?</>} sub="여러 개 선택할 수 있어요" />
            <ChipWrap>{SUBJECT_OPTIONS.map((subject) => <Chip key={subject} selected={draft.subjects.includes(subject)} onClick={() => selectSubject(subject)}>{subject}</Chip>)}</ChipWrap>
            {(["기타", "피아노", "트럼펫", "플루트"] as SubjectDetailKey[]).map((subject) => draft.subjects.includes(subject) ? (
              <SubBlock key={subject}>
                <p className="mb-2.5 text-[0.95rem] font-bold text-[#4a453d]">{subject === "기타" ? "🎸" : subject === "피아노" ? "🎹" : subject === "트럼펫" ? "🎺" : "🪈"} {subject} — 어떤 종류인가요? (여러 개 가능)</p>
                <ChipWrap>{(subject === "기타" ? GUITAR_DETAILS : STYLE_DETAILS).map((item) => <Chip compact key={item} selected={details[subject].includes(item)} onClick={() => setDetails((previous) => ({ ...previous, [subject]: toggleValue(previous[subject], item) }))}>{item}</Chip>)}</ChipWrap>
              </SubBlock>
            ) : null)}
          </>
        );
      case "vocal":
        return (
          <>
            <QuestionHeading title={<>보컬에서 가장 어려움을 느끼고<br />도움받고 싶은 부분은?</>} sub="여러 개 선택할 수 있어요" />
            <ChipWrap>{VOCAL_DIFFICULTIES.map((item) => <Chip key={item} selected={draft.vocal_difficulties.includes(item)} onClick={() => patchDraft("vocal_difficulties", toggleValue(draft.vocal_difficulties, item))}>{item}</Chip>)}</ChipWrap>
          </>
        );
      case "instrument":
        return (
          <>
            <QuestionHeading title="악기를 소지하고 계시나요?" sub="하나만 선택해 주세요" />
            <ChipWrap>{["소지하고 있음", "소지하고 있지 않음"].map((value) => <Chip key={value} selected={draft.has_instrument === value} onClick={() => { patchDraft("has_instrument", value); scheduleNext(); }}>{value === "소지하고 있음" ? "네, 소지하고 있어요" : "아니요, 없어요"}</Chip>)}</ChipWrap>
          </>
        );
      case "purpose":
        return (
          <>
            <QuestionHeading title={<>레슨을 받으시는<br />목적은 무엇인가요?</>} sub={<>하나만 선택해 주세요 · <b>프로 · 입시</b>를 선택하면 입시 상담으로 이어져요</>} />
            <ChipWrap>{PURPOSE_OPTIONS.map((value) => <Chip key={value} selected={draft.purpose === value} onClick={() => selectPurpose(value)}>{value === "프로·입시" ? "프로 · 입시 (대학, 예고, 예중)" : value === "개인앨범·유튜브 준비" ? "개인앨범 · 유튜브 준비" : value === "여가·자기계발" ? "여가 · 자기계발" : value}</Chip>)}</ChipWrap>
          </>
        );
      case "ipsi-info":
        return (
          <>
            <QuestionHeading title={<>📚 입시 상담 카드로 이동했어요<br />학교 정보를 알려주세요</>} sub="해당하는 항목만 입력해도 괜찮아요" />
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="학교 (학년)"><input aria-label="학교와 학년" className={inputClass} value={draft.school} onChange={(event) => patchDraft("school", event.target.value)} placeholder="예: 망포고 2학년" /></Field>
              <Field label="거주 지역"><input aria-label="거주 지역" className={inputClass} value={draft.region} onChange={(event) => patchDraft("region", event.target.value)} placeholder="예: 수원 영통구" /></Field>
            </div>
            <Field className="mt-4" label="재학 상태"><ChipWrap>{["재학", "휴학", "졸업"].map((value) => <Chip compact key={value} selected={draft.school_status === value} onClick={() => patchDraft("school_status", value)}>{value}</Chip>)}</ChipWrap></Field>
          </>
        );
      case "ipsi-type":
        return (
          <>
            <QuestionHeading title={<>생각 중인 입시 유형은<br />무엇인가요?</>} sub="하나를 선택하고, 시기를 알면 함께 적어 주세요" />
            <ChipWrap>{["수시&정시", "편입", "재수"].map((value) => <Chip key={value} selected={draft.ipsi_type === value} onClick={() => patchDraft("ipsi_type", value)}>{value === "수시&정시" ? "수시 & 정시" : value}</Chip>)}</ChipWrap>
            <Field className="mt-4" label="입시 기간 (예정 시기)"><input aria-label="입시 기간" className={inputClass} value={draft.ipsi_period} onChange={(event) => patchDraft("ipsi_period", event.target.value)} placeholder="예: 2027학년도, 내년 수시" /></Field>
          </>
        );
      case "ipsi-target":
        return (
          <>
            <QuestionHeading title="목표로 하는 학교가 있나요?" sub="아직 없어도 괜찮아요 — 입시 설명을 자세히 해드려요" />
            <ChipWrap>
              <Chip selected={targetKnown === true} onClick={() => setTargetKnown(true)}>있어요</Chip>
              <Chip selected={targetKnown === false} onClick={() => { setTargetKnown(false); patchDraft("target_school", ""); scheduleNext(); }}>잘 모르겠어요 (입시 설명 필요)</Chip>
            </ChipWrap>
            {targetKnown ? <SubBlock><Field label="목표 학교"><input aria-label="목표 학교" className={inputClass} value={draft.target_school} onChange={(event) => patchDraft("target_school", event.target.value)} placeholder="예: 서울예대, 호원대" /></Field></SubBlock> : null}
          </>
        );
      case "experience":
        return (
          <>
            <QuestionHeading title={<>노래(악기)를 배우거나<br />학원을 다닌 적 있으신가요?</>} />
            <ChipWrap>
              <Chip selected={draft.lesson_experience.hasExperience === true} onClick={() => patchDraft("lesson_experience", { ...draft.lesson_experience, hasExperience: true })}>있어요</Chip>
              <Chip selected={draft.lesson_experience.hasExperience === false} onClick={() => { patchDraft("lesson_experience", { hasExperience: false, subjects: "", period: "" }); scheduleNext(); }}>없어요</Chip>
            </ChipWrap>
            {draft.lesson_experience.hasExperience ? (
              <SubBlock><div className="grid gap-3 sm:grid-cols-2">
                <Field label="배운 과목"><input aria-label="배운 과목" className={inputClass} value={draft.lesson_experience.subjects} onChange={(event) => patchDraft("lesson_experience", { ...draft.lesson_experience, subjects: event.target.value })} placeholder="예: 보컬" /></Field>
                <Field label="레슨 기간"><input aria-label="레슨 기간" className={inputClass} value={draft.lesson_experience.period} onChange={(event) => patchDraft("lesson_experience", { ...draft.lesson_experience, period: event.target.value })} placeholder="예: 6개월" /></Field>
              </div></SubBlock>
            ) : null}
          </>
        );
      case "ipsi-consult":
        return (
          <>
            <QuestionHeading title={<>상담받고 싶은 내용을<br />알려주세요</>} sub="자세히 적어 주시면 더 깊은 상담이 가능해요" />
            <textarea aria-label="상담받고 싶은 내용" className={`${inputClass} min-h-[120px] resize-none leading-relaxed`} value={draft.consult_content} onChange={(event) => patchDraft("consult_content", event.target.value)} placeholder="편하게 적어 주세요" />
            <p className="mt-2 text-[0.8rem] text-[#a09a8e]">💡 키보드의 마이크 버튼을 누르면 말로 입력할 수 있어요</p>
          </>
        );
      case "genre":
        return (
          <>
            <QuestionHeading title={<>레슨 받고 싶은 곡이나<br />관심 장르가 있나요?</>} />
            <ChipWrap>
              <Chip selected={genreKnown === true} onClick={() => setGenreKnown(true)}>있어요</Chip>
              <Chip selected={genreKnown === false} onClick={() => { setGenreKnown(false); patchDraft("genre_song", ""); scheduleNext(); }}>없어요</Chip>
            </ChipWrap>
            {genreKnown ? <SubBlock><Field label="장르 및 곡 이름"><input aria-label="관심 장르 및 곡 이름" className={inputClass} value={draft.genre_song} onChange={(event) => patchDraft("genre_song", event.target.value)} placeholder="예: 발라드, 아이유 - 밤편지" /></Field></SubBlock> : null}
          </>
        );
      case "question":
        return (
          <>
            <QuestionHeading title={<>평소 궁금했던 점이나<br />질문하고 싶은 부분이 있나요?</>} sub="없으면 바로 다음으로 넘어가도 돼요" />
            <textarea aria-label="궁금한 점" className={`${inputClass} min-h-[120px] resize-none leading-relaxed`} value={draft.question} onChange={(event) => patchDraft("question", event.target.value)} placeholder="편하게 적어 주세요" />
            <p className="mt-2 text-[0.8rem] text-[#a09a8e]">💡 키보드의 마이크 버튼을 누르면 말로 입력할 수 있어요</p>
          </>
        );
      case "source":
        return (
          <>
            <QuestionHeading title={<>라 실용음악학원을<br />어떻게 알고 오셨나요?</>} />
            <ChipWrap>{REFERRAL_OPTIONS.map((value) => <Chip key={value} selected={draft.referral_source === value} onClick={() => { patchDraft("referral_source", value); scheduleNext(value === "지인추천"); }}>{value === "페이스북/인스타" ? "페이스북 · 인스타" : value === "지인추천" ? "지인 추천" : value}</Chip>)}</ChipWrap>
            {draft.referral_source === "지인추천" ? <SubBlock><Field label="추천인 이름 (영수증 포토 리뷰 남기면 다음 달 할인!)"><input aria-label="추천인 이름" className={inputClass} value={draft.referral_name} onChange={(event) => patchDraft("referral_name", event.target.value)} placeholder="추천해 주신 분 이름" /></Field></SubBlock> : null}
          </>
        );
      case "schedule":
        return (
          <>
            <QuestionHeading title={<>레슨 가능한 스케줄을<br />알려주세요</>} sub="순위별로 요일과 시간대를 눌러 주세요 (1순위만 해도 OK)" />
            <div className="space-y-5">
              {draft.schedule_preferences.map((preference) => (
                <div key={preference.rank}>
                  <p className="mb-2 text-[0.95rem] font-bold"><span className="text-[#e8a23d]">{preference.rank}순위</span></p>
                  <ChipWrap className="mb-2">{DAYS.map((day) => <Chip compact key={day} selected={preference.days.includes(day)} onClick={() => updateSchedule(preference.rank, { days: toggleValue(preference.days, day) })}>{day}</Chip>)}</ChipWrap>
                  <ChipWrap>{TIME_SLOTS.map((timeSlot) => <Chip compact key={timeSlot} selected={preference.timeSlot === timeSlot} onClick={() => updateSchedule(preference.rank, { timeSlot })}>{timeSlot}</Chip>)}</ChipWrap>
                </div>
              ))}
            </div>
            <Field className="mt-5" label="시작 가능한 날 / 주"><input aria-label="시작 가능한 날 또는 주" className={inputClass} value={draft.start_available} onChange={(event) => patchDraft("start_available", event.target.value)} placeholder="예: 다음 주부터, 8월 둘째 주" /></Field>
          </>
        );
      case "etc":
        return (
          <>
            <QuestionHeading title={<>마지막이에요!<br />기타 참고사항이 있다면 알려주세요</>} sub="없으면 바로 완료를 눌러 주세요" />
            <textarea aria-label="기타 참고사항" className={`${inputClass} min-h-[120px] resize-none leading-relaxed`} value={draft.etc_memo} onChange={(event) => patchDraft("etc_memo", event.target.value)} placeholder="자유롭게 적어 주세요" />
          </>
        );
      case "summary": {
        const rows = summaryRows();
        return (
          <>
            <div className="pb-5 pt-1 text-center">
              <div className="text-5xl" aria-hidden="true">🎉</div>
              <QuestionHeading title="작성 완료! 내용을 확인해 주세요" sub="빠진 내용이 있으면 이전 버튼으로 돌아가 수정할 수 있어요" />
            </div>
            <dl className="grid grid-cols-[100px_1fr] gap-x-3.5 gap-y-3 text-[0.95rem] sm:grid-cols-[118px_1fr]">
              {rows.map(([label, value]) => (
                value ? <div className="contents" key={label}><dt className="font-bold text-[#6b6459]">{label}</dt><dd className="whitespace-pre-line break-words leading-[1.45]">{value}</dd></div> : null
              ))}
            </dl>
          </>
        );
      }
    }
  }

  function summaryRows(): [string, string][] {
    const schedule = draft.schedule_preferences
      .filter((item) => item.days.length || item.timeSlot)
      .map((item) => `${item.rank}순위: ${item.days.join(",") || "?"}요일 / ${item.timeSlot || "?"}`)
      .join("\n");
    const experience = draft.lesson_experience.hasExperience === true
      ? `있음 — ${draft.lesson_experience.subjects || "?"} / ${draft.lesson_experience.period || "?"}`
      : draft.lesson_experience.hasExperience === false ? "없음" : "";
    const rows: [string, string][] = [
      ["카드 종류", isIpsi ? "📚 입시 상담 카드" : "일반 상담 카드"],
      ["이름", draft.name],
      ["생년월일", chosenBirthDate ? `${chosenBirthDate.replaceAll("-", ".")} ${age === null ? "" : `(만 ${age}세)`}` : ""],
      ["성별", draft.gender],
      ["학생 연락처", draft.student_phone],
      ["학부모 연락처", draft.parent_phone],
      ["관심 과목", detailSubjects(draft.subjects, details).join(", ")],
      ["보컬 고민", draft.vocal_difficulties.join(", ")],
      ["악기 소지", draft.has_instrument],
      ["레슨 목적", draft.purpose],
    ];
    if (isIpsi) {
      rows.push(
        ["학교", [draft.school, draft.school_status].filter(Boolean).join(" · ")],
        ["거주 지역", draft.region],
        ["입시 유형", [draft.ipsi_type, draft.ipsi_period].filter(Boolean).join(" / ")],
        ["목표 학교", targetKnown === false ? "잘 모른다" : draft.target_school],
        ["상담 내용", draft.consult_content],
      );
    }
    rows.push(["레슨 경험", experience]);
    if (!isIpsi) {
      rows.push(
        ["관심 곡·장르", genreKnown === false ? "없음" : draft.genre_song],
        ["궁금한 점", draft.question],
      );
    }
    rows.push(
      ["알게 된 경로", draft.referral_source === "지인추천" ? `지인추천 (${draft.referral_name || "?"})` : draft.referral_source],
      ["가능 스케줄", schedule],
      ["시작 가능", draft.start_available],
      ["기타", draft.etc_memo],
    );
    return rows;
  }
}

function TopBar({ isIpsi, label = "학생 작성용" }: { isIpsi: boolean; label?: string }) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 bg-[#2b2723] px-4 py-3.5 text-white sm:gap-3 sm:px-[22px]">
      <h1 className="min-w-0 flex-1 text-[0.95rem] font-bold leading-tight tracking-[-0.01em] sm:text-[1.05rem]">라 실용음악학원 · 상담 카드</h1>
      <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5 sm:gap-2">
        {isIpsi ? <span className="whitespace-nowrap rounded-full bg-[#6ba4d8] px-2.5 py-1 text-xs font-bold text-white">입시 상담</span> : null}
        <span className="whitespace-nowrap rounded-full bg-[#e8a23d] px-2.5 py-1 text-xs font-bold text-[#2b2723]">{label}</span>
      </div>
    </div>
  );
}
