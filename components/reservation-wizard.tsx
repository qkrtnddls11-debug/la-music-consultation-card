"use client";

import { useEffect, useRef, useState } from "react";
import { BirthDateFields } from "@/components/birth-date-fields";
import { birthDateFromParts, EMPTY_BIRTH_DATE } from "@/lib/birth-date";
import {
  DAYS,
  DEFAULT_BRANCH,
  EMPTY_RESERVATION_SCHEDULE,
  GUITAR_DETAILS,
  STYLE_DETAILS,
  SUBJECT_OPTIONS,
  TIME_SLOTS,
  type ReservationInput,
  type ReservationSchedulePreference,
  type ReservationSource,
} from "@/lib/types";

type Step = "name" | "phone" | "gender" | "birth" | "subjects" | "lesson" | "schedule";
type DetailSubject = "기타" | "피아노" | "트럼펫" | "플루트";
const STEPS: Step[] = ["name", "phone", "gender", "birth", "subjects", "lesson", "schedule"];
const LABELS: Record<Step, string> = { name: "성함", phone: "전화번호", gender: "성별", birth: "생년월일", subjects: "희망 과목", lesson: "레슨 구분", schedule: "희망 시간대" };
const EMPTY_DETAILS: Record<DetailSubject, string[]> = { 기타: [], 피아노: [], 트럼펫: [], 플루트: [] };

function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length === 10) return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

function toggle(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function ageOf(value: string, today: Date | null) {
  if (!value || !today) return null;
  const [year, month, day] = value.split("-").map(Number);
  let age = today.getFullYear() - year;
  if (today.getMonth() + 1 < month || (today.getMonth() + 1 === month && today.getDate() < day)) age -= 1;
  return age;
}

function Chip({ selected, onClick, children, compact = false }: { selected: boolean; onClick: () => void; children: React.ReactNode; compact?: boolean }) {
  return <button type="button" aria-pressed={selected} onClick={onClick} className={`inline-flex min-h-12 max-w-full items-center justify-center whitespace-normal break-keep rounded-[14px] border-[1.5px] px-4 py-3 text-center font-bold leading-snug active:scale-[0.99] ${compact ? "text-sm" : "text-base"} ${selected ? "border-[#2b2723] bg-[#2b2723] text-white" : "border-[#d8d2c8] bg-[#faf9f6] text-[#3a362f]"}`}>{selected ? <span className="mr-1.5 text-[#e8a23d]">✓</span> : null}{children}</button>;
}

const inputClass = "min-h-14 w-full min-w-0 rounded-xl border-[1.5px] border-[#d8d2c8] bg-[#faf9f6] px-4 py-3 text-base focus:border-[#e8a23d] focus:bg-white focus:outline-none";

export function ReservationWizard({ source, branchName }: { source: ReservationSource; branchName?: string }) {
  const [step, setStep] = useState<Step>("name");
  const [draft, setDraft] = useState<ReservationInput>({ name: "", phone: "", gender: "", birth_date: "", subjects: [], lesson_type: "", schedule_preferences: EMPTY_RESERVATION_SCHEDULE.map((item) => ({ ...item, days: [...item.days] })), schedule_note: "", source, branch_name: branchName || DEFAULT_BRANCH });
  const [details, setDetails] = useState<Record<DetailSubject, string[]>>({ ...EMPTY_DETAILS });
  const [birth, setBirth] = useState(() => ({ ...EMPTY_BIRTH_DATE }));
  const [today] = useState<Date>(() => new Date());
  const [warning, setWarning] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const autoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextRef = useRef<() => void>(() => undefined);
  const stepIndex = STEPS.indexOf(step);
  const chosenBirth = birthDateFromParts(birth, today);
  const age = ageOf(chosenBirth, today);

  useEffect(() => () => { if (autoTimer.current) clearTimeout(autoTimer.current); }, []);
  function patch<K extends keyof ReservationInput>(key: K, value: ReservationInput[K]) { setDraft((current) => ({ ...current, [key]: value })); }
  function scheduleNext() { if (autoTimer.current) clearTimeout(autoTimer.current); autoTimer.current = setTimeout(() => nextRef.current(), 350); }
  function detailSubjects() { return draft.subjects.map((subject) => subject in details && details[subject as DetailSubject].length ? `${subject}(${details[subject as DetailSubject].join(",")})` : subject); }
  function validate(current: Step) {
    if (current === "name" && !draft.name.trim()) return "성함을 입력해 주세요";
    if (current === "phone" && ![10, 11].includes(draft.phone.replace(/\D/g, "").length)) return "전화번호를 10~11자리로 입력해 주세요";
    if (current === "gender" && !draft.gender) return "성별을 선택해 주세요";
    if (current === "birth" && (!birth.year || !birth.month || !birth.day)) return "생년월일의 연도, 월, 일을 모두 입력해 주세요";
    if (current === "birth" && !chosenBirth) return "올바른 생년월일을 입력해 주세요";
    if (current === "subjects" && draft.subjects.length === 0) return "메인 과목을 선택해 주세요";
    if (current === "lesson" && !draft.lesson_type) return "입시 또는 취미를 선택해 주세요";
    if (current === "schedule" && (!draft.schedule_preferences[0]?.days.length || !draft.schedule_preferences[0]?.timeSlot)) return "1순위 요일과 시간대를 선택해 주세요";
    if (current === "schedule" && draft.schedule_preferences.some((item) => (item.days.length || item.timeSlot) && (!item.days.length || !item.timeSlot))) return "선택한 순위는 요일과 시간대를 모두 골라 주세요";
    return "";
  }
  function goNext() { const message = validate(step); if (message) return setWarning(message); setWarning(""); if (stepIndex < STEPS.length - 1) setStep(STEPS[stepIndex + 1]); }
  useEffect(() => { nextRef.current = goNext; });
  function goBack() { setWarning(""); if (stepIndex > 0) setStep(STEPS[stepIndex - 1]); }
  function updateSchedule(rank: 1 | 2 | 3, update: Partial<ReservationSchedulePreference>) { patch("schedule_preferences", draft.schedule_preferences.map((item) => item.rank === rank ? { ...item, ...update } : item)); }
  // 메인은 하나만: 배정과 체험수업은 메인 과목 기준으로 잡힌다. 서브는 상담 참고용.
  function selectMainSubject(subject: string) {
    const previousMain = draft.subjects[0];
    if (previousMain === subject) return;
    const subs = draft.subjects.slice(1).filter((item) => item !== subject);
    patch("subjects", [subject, ...subs]);
    if (previousMain && previousMain in details) setDetails((current) => ({ ...current, [previousMain]: [] }));
  }
  function toggleSubSubject(subject: string) {
    if (subject === draft.subjects[0]) return;
    const subs = toggle(draft.subjects.slice(1), subject);
    patch("subjects", [draft.subjects[0], ...subs]);
    if (!subs.includes(subject) && subject in details) setDetails((current) => ({ ...current, [subject]: [] }));
  }

  async function submit() {
    const message = validate("schedule"); if (message) return setWarning(message);
    setSubmitting(true); setSubmitError("");
    try {
      const response = await fetch("/api/reservations", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...draft, birth_date: chosenBirth, subjects: detailSubjects() }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "예약 정보를 저장하지 못했습니다.");
      setSubmitted(true);
      if (source === "crm") {
        // 직접 입력(전화 접수)은 저장 후 관리자 예약 목록으로 자동 복귀
        window.setTimeout(() => {
          window.location.assign(`/admin?tab=reservations${branchName ? `&branch=${encodeURIComponent(branchName)}` : ""}`);
        }, 1500);
      }
    } catch (error) { setSubmitError(error instanceof Error ? error.message : "예약 정보를 저장하지 못했습니다."); }
    finally { setSubmitting(false); }
  }

  if (submitted) return <main className="flex min-h-dvh items-center justify-center bg-[#f4f2ee] p-4"><section className="w-full max-w-[620px] rounded-[22px] bg-white px-6 py-12 text-center shadow-sm"><div className="mx-auto flex size-20 items-center justify-center rounded-full bg-[#e8a23d] text-4xl font-black">✓</div><h1 className="mt-6 text-2xl font-black">{source === "crm" ? "예약이 접수되었습니다" : "예약 정보가 접수되었습니다"}</h1><p className="mt-4 break-keep text-base font-semibold leading-7 text-[#6b6459]">{source === "crm" ? "잠시 후 관리자 예약 목록으로 돌아갑니다." : <>확인 후 빠르게 일정을 잡아드릴게요.<br />선생님 스케줄에 따라 조정될 수 있는 점 양해 부탁드립니다.</>}</p></section></main>;

  return <main className="flex min-h-dvh max-h-dvh flex-col overflow-hidden bg-[#f4f2ee]">
    <header className="shrink-0 bg-[#2b2723] px-4 py-3.5 text-white"><div className="mx-auto flex max-w-[680px] items-center justify-between"><h1 className="font-extrabold">라 실용음악학원 · 상담 예약</h1><span className="rounded-full bg-[#e8a23d] px-2.5 py-1 text-xs font-black text-[#2b2723]">모바일 예약</span></div></header>
    <div className="shrink-0 bg-[#2b2723] px-4 pb-3"><div className="mx-auto max-w-[680px]"><div className="mb-1.5 flex justify-between text-xs text-[#b5aea3]"><span>{LABELS[step]}</span><span>{stepIndex + 1} / {STEPS.length}</span></div><div className="h-1.5 overflow-hidden rounded-full bg-[#4a453d]"><div className="h-full rounded-full bg-[#e8a23d] transition-[width]" style={{ width: `${(stepIndex / (STEPS.length - 1)) * 100}%` }} /></div></div></div>
    <div className="flex flex-1 justify-center overflow-y-auto px-3.5 py-4 sm:px-5 sm:py-6"><section key={step} className="animate-card-in h-fit w-full max-w-[680px] rounded-[18px] bg-white px-4 py-6 shadow-sm sm:px-8 sm:py-8">
      {renderStep()}
      {warning ? <p className="mt-3 text-sm font-bold text-red-700" role="alert">{warning}</p> : null}
      <nav className="mt-7 flex gap-2.5">{stepIndex > 0 ? <button type="button" onClick={goBack} className="min-h-14 flex-1 rounded-[14px] bg-[#eee9e0] font-extrabold">← 이전</button> : null}{step === "schedule" ? <button type="button" disabled={submitting} onClick={() => void submit()} className="min-h-14 flex-[2.2] rounded-[14px] bg-[#2b2723] px-4 font-black text-white disabled:opacity-60">{submitting ? "접수 중…" : "예약 접수하기 ✓"}</button> : <button type="button" onClick={goNext} className="min-h-14 flex-[2.2] rounded-[14px] bg-[#e8a23d] px-4 font-black text-[#2b2723]">다음 →</button>}</nav>
      {submitError ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{submitError}</p> : null}
    </section></div>
  </main>;

  function heading(title: React.ReactNode, sub?: React.ReactNode) { return <header><h2 className="break-keep text-[1.28rem] font-black leading-[1.4]">{title}</h2><p className="mb-6 mt-1.5 break-keep text-sm leading-6 text-[#8a8378]">{sub}</p></header>; }
  function renderStep() {
    if (step === "name") return <>{heading("성함을 알려주세요", "예약 확인에 사용할 이름이에요")}<input autoFocus autoComplete="name" aria-label="성함" className={inputClass} value={draft.name} onChange={(event) => patch("name", event.target.value)} placeholder="성함 입력" /></>;
    if (step === "phone") return <>{heading("전화번호를 입력해 주세요", "세부 일정 조율을 위해 연락드릴 수 있어요")}<input autoFocus type="tel" inputMode="numeric" autoComplete="tel" aria-label="전화번호" className={inputClass} value={draft.phone} onChange={(event) => patch("phone", formatPhone(event.target.value))} placeholder="010-0000-0000" maxLength={13} /></>;
    if (step === "gender") return <>{heading("성별을 선택해 주세요", "하나만 선택해 주세요")}<div className="flex flex-wrap gap-2.5">{["남", "여"].map((value) => <Chip key={value} selected={draft.gender === value} onClick={() => { patch("gender", value); scheduleNext(); }}>{value}</Chip>)}</div></>;
    if (step === "birth") return <>{heading("생년월일을 알려주세요", age === null ? "연도는 숫자로 입력하고 월·일은 목록에서 골라주세요" : <><strong className="text-[#4a453d]">만 {age}세</strong>로 계산되었어요</>)}<BirthDateFields value={birth} onChange={setBirth} inputClassName={inputClass} autoFocus /></>;
    if (step === "subjects") return <>{heading("메인 과목을 하나 선택해 주세요", "체험수업은 메인 과목으로 진행돼요")}<div className="flex flex-wrap gap-2.5">{SUBJECT_OPTIONS.map((subject) => <Chip key={subject} selected={draft.subjects[0] === subject} onClick={() => selectMainSubject(subject)}>{subject}</Chip>)}</div>{draft.subjects.length > 0 ? <div className="mt-4 rounded-[14px] bg-[#f7f4ee] p-4"><p className="mb-1 font-bold">서브 과목 <span className="font-semibold text-[#9a9389]">(선택사항 · 여러 개 가능)</span></p><p className="mb-2.5 text-sm text-[#9a9389]">관심 있는 과목이 더 있으면 골라 주세요. 상담 때 함께 안내해 드려요.</p><div className="flex flex-wrap gap-2">{SUBJECT_OPTIONS.filter((subject) => subject !== draft.subjects[0]).map((subject) => <Chip compact key={subject} selected={draft.subjects.slice(1).includes(subject)} onClick={() => toggleSubSubject(subject)}>{subject}</Chip>)}</div></div> : null}{(["기타", "피아노", "트럼펫", "플루트"] as DetailSubject[]).map((subject) => draft.subjects.includes(subject) ? <div key={subject} className="mt-4 rounded-[14px] bg-[#f7f4ee] p-4"><p className="mb-2.5 font-bold">{subject} 세부 종류</p><div className="flex flex-wrap gap-2">{(subject === "기타" ? GUITAR_DETAILS : STYLE_DETAILS).map((value) => <Chip compact key={value} selected={details[subject].includes(value)} onClick={() => setDetails((current) => ({ ...current, [subject]: toggle(current[subject], value) }))}>{value}</Chip>)}</div></div> : null)}</>;
    if (step === "lesson") return <>{heading("상담 목적을 선택해 주세요", "하나만 선택해 주세요")}<div className="flex flex-wrap gap-2.5">{["입시", "취미"].map((value) => <Chip key={value} selected={draft.lesson_type === value} onClick={() => { patch("lesson_type", value as "입시" | "취미"); scheduleNext(); }}>{value}</Chip>)}</div></>;
    return <>{heading("체험수업 가능한 시간대를 알려주세요", "순위별로 요일과 시간대를 눌러 주세요. 1순위만 작성해도 괜찮아요")}<div className="space-y-5">{draft.schedule_preferences.map((item) => <div key={item.rank} className="rounded-[16px] bg-[#f7f4ee] p-4"><p className="mb-3 font-black text-[#b76e08]">{item.rank}순위</p><div className="flex flex-wrap gap-2">{DAYS.map((day) => <Chip compact key={day} selected={item.days.includes(day)} onClick={() => updateSchedule(item.rank, { days: toggle(item.days, day) })}>{day}</Chip>)}</div><div className="mt-3 flex flex-wrap gap-2">{TIME_SLOTS.map((timeSlot) => <Chip compact key={timeSlot} selected={item.timeSlot === timeSlot} onClick={() => updateSchedule(item.rank, { timeSlot })}>{timeSlot}</Chip>)}</div></div>)}</div><label htmlFor="reservation-schedule-note" className="mt-6 block text-sm font-black text-[#4a453d]">스케줄 참고사항 <span className="font-semibold text-[#9a9389]">(선택)</span></label><textarea id="reservation-schedule-note" aria-label="스케줄 참고사항" className={`${inputClass} mt-2 min-h-[110px] resize-none leading-relaxed`} value={draft.schedule_note} onChange={(event) => patch("schedule_note", event.target.value)} placeholder="예: 평일은 6시 이후 가능, 토요일은 시간 조정 가능" maxLength={500} /></>;
  }
}
