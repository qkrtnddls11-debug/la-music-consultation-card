"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DIAGNOSIS_LEVELS,
  EMPTY_VOCAL_DIAGNOSIS,
  type ConsultationRecord,
  type DiagnosisLevel,
  type LessonExperience,
  type VocalDiagnosisRecord,
} from "@/lib/types";

type SaveState = "idle" | "waiting" | "saving" | "saved" | "error";
type RangeMode = "chest" | "falsetto";
type RangeEndpoint = "low" | "high";

const WHITE_KEY_WIDTH = 46;
const BLACK_KEY_WIDTH = 30;
const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

type PianoNote = {
  midi: number;
  name: string;
  isBlack: boolean;
  left: number;
};

function buildPiano() {
  const notes: PianoNote[] = [];
  let whiteCount = 0;
  for (let midi = 36; midi <= 84; midi += 1) {
    const pitch = NOTE_NAMES[midi % 12];
    const octave = Math.floor(midi / 12) - 1;
    const isBlack = pitch.includes("#");
    const left = isBlack
      ? whiteCount * WHITE_KEY_WIDTH - BLACK_KEY_WIDTH / 2
      : whiteCount * WHITE_KEY_WIDTH;
    notes.push({ midi, name: `${pitch}${octave}`, isBlack, left });
    if (!isBlack) whiteCount += 1;
  }
  return { notes, width: whiteCount * WHITE_KEY_WIDTH };
}

const PIANO = buildPiano();
const NOTE_MIDI = new Map(PIANO.notes.map((note) => [note.name, note.midi]));

function formatDate(value: string) {
  if (!value) return "새 진단서";
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(value));
}

function safeLesson(value: unknown): LessonExperience {
  if (!value || typeof value !== "object") return { hasExperience: null, subjects: "", period: "" };
  const lesson = value as Partial<LessonExperience>;
  return {
    hasExperience: typeof lesson.hasExperience === "boolean" ? lesson.hasExperience : null,
    subjects: typeof lesson.subjects === "string" ? lesson.subjects : "",
    period: typeof lesson.period === "string" ? lesson.period : "",
  };
}

function Section({ number, title, description, children }: {
  number: number;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[18px] border border-[#e7e1d7] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:p-6">
      <header className="mb-5 flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#2b2723] text-sm font-extrabold text-white">{number}</span>
        <div>
          <h3 className="text-xl font-extrabold tracking-tight">{title}</h3>
          {description ? <p className="mt-1 text-sm leading-relaxed text-[#7d756a]">{description}</p> : null}
        </div>
      </header>
      {children}
    </section>
  );
}

function MemoField({ label, value, onChange, placeholder, rows = 3 }: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  rows?: number;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-[#5f584e]">{label}</span>
      <textarea
        value={value}
        rows={rows}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="min-h-[96px] w-full resize-y rounded-[14px] border-[1.5px] border-[#d8d2c8] bg-[#faf9f6] px-4 py-3.5 text-base leading-relaxed placeholder:text-[#aaa399] focus:border-[#e8a23d] focus:bg-white focus:outline-none"
      />
    </label>
  );
}

function LevelChips({ label, value, onChange }: {
  label: string;
  value: DiagnosisLevel;
  onChange: (value: DiagnosisLevel) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-bold text-[#5f584e]">{label}</legend>
      <div className="grid grid-cols-5 gap-2">
        {DIAGNOSIS_LEVELS.map((level) => (
          <button
            key={level}
            type="button"
            aria-pressed={value === level}
            onClick={() => onChange(value === level ? "" : level)}
            className={`min-h-12 rounded-xl px-2 text-sm font-extrabold transition active:scale-[0.98] sm:text-base ${
              value === level ? "bg-[#2b2723] text-white" : "border border-[#d8d2c8] bg-[#f7f4ee] text-[#5f584e]"
            }`}
          >
            {level}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

function EvaluationBlock({ title, hint, level, memo, onLevel, onMemo, memoFirst = false }: {
  title: string;
  hint?: string;
  level: DiagnosisLevel;
  memo: string;
  onLevel: (value: DiagnosisLevel) => void;
  onMemo: (value: string) => void;
  memoFirst?: boolean;
}) {
  const chips = <LevelChips label={`${title} 평가${memoFirst ? " (선택)" : ""}`} value={level} onChange={onLevel} />;
  const memoField = <MemoField label={`${title} 메모`} value={memo} onChange={onMemo} placeholder={hint || `${title} 상태와 특징을 기록해 주세요`} />;
  return (
    <div className="rounded-[16px] bg-[#f7f4ee] p-4 sm:p-5">
      <h4 className="mb-4 text-lg font-extrabold">{title}</h4>
      <div className="space-y-4">{memoFirst ? <>{memoField}{chips}</> : <>{chips}{memoField}</>}</div>
    </div>
  );
}

function rangeText(low: string, high: string) {
  if (!low && !high) return "미입력";
  if (low && !high) return `${low} ~ 최고음 선택 중`;
  return `${low || "?"} ~ ${high}`;
}

export function VocalDiagnosisEditor({
  initialDiagnosis,
  consultation,
  onClose,
  onSaved,
}: {
  initialDiagnosis: VocalDiagnosisRecord | null;
  consultation: ConsultationRecord | null;
  onClose: () => void;
  onSaved: (record: VocalDiagnosisRecord) => void;
}) {
  const [draft, setDraft] = useState<VocalDiagnosisRecord>(() => ({
    ...EMPTY_VOCAL_DIAGNOSIS,
    consultation_id: consultation?.id ?? null,
    student_name: consultation?.name ?? "",
    ...initialDiagnosis,
    pitch_level: initialDiagnosis?.pitch_level ?? "",
    rhythm_level: initialDiagnosis?.rhythm_level ?? "",
    breath_level: initialDiagnosis?.breath_level ?? "",
    phonation_level: initialDiagnosis?.phonation_level ?? "",
    performance_level: initialDiagnosis?.performance_level ?? "",
    id: initialDiagnosis?.id ?? "",
    created_at: initialDiagnosis?.created_at ?? "",
    updated_at: initialDiagnosis?.updated_at ?? "",
  }));
  const [saveState, setSaveState] = useState<SaveState>(initialDiagnosis ? "saved" : "idle");
  const [saveError, setSaveError] = useState("");
  const [revision, setRevision] = useState(0);
  const [rangeMode, setRangeMode] = useState<RangeMode>("chest");
  const [rangeEndpoint, setRangeEndpoint] = useState<RangeEndpoint>("low");
  const [closeBusy, setCloseBusy] = useState(false);
  const draftRef = useRef(draft);
  const idRef = useRef(draft.id);
  const revisionRef = useRef(0);
  const savedRevisionRef = useRef(0);
  const saveQueueRef = useRef<Promise<unknown>>(Promise.resolve());
  const closeRef = useRef<() => void>(() => undefined);

  useEffect(() => {
    draftRef.current = draft;
    idRef.current = draft.id;
  }, [draft]);

  const updateFields = useCallback((updates: Partial<VocalDiagnosisRecord>) => {
    setDraft((current) => {
      const next = { ...current, ...updates };
      draftRef.current = next;
      return next;
    });
    revisionRef.current += 1;
    setRevision(revisionRef.current);
    setSaveError("");
    setSaveState("waiting");
  }, []);

  const performSave = useCallback(async (snapshot: VocalDiagnosisRecord, targetRevision: number) => {
    if (!snapshot.student_name.trim()) {
      setSaveState("idle");
      return null;
    }

    setSaveState("saving");
    setSaveError("");
    const existingId = idRef.current;
    const response = await fetch(existingId ? `/api/admin/vocal-diagnoses/${existingId}` : "/api/admin/vocal-diagnoses", {
      method: existingId ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      keepalive: true,
      body: JSON.stringify({ ...snapshot, id: undefined, created_at: undefined, updated_at: undefined }),
    });
    const result = (await response.json()) as VocalDiagnosisRecord | { error?: string };
    if (!response.ok || !("id" in result)) {
      const message = "error" in result && result.error ? result.error : "진단서를 저장하지 못했습니다.";
      setSaveError(message);
      setSaveState("error");
      throw new Error(message);
    }

    idRef.current = result.id;
    savedRevisionRef.current = Math.max(savedRevisionRef.current, targetRevision);
    setDraft((current) => {
      const next = { ...current, id: result.id, created_at: result.created_at, updated_at: result.updated_at };
      draftRef.current = next;
      return next;
    });
    onSaved(result);
    setSaveState(targetRevision === revisionRef.current ? "saved" : "waiting");
    return result;
  }, [onSaved]);

  const enqueueSave = useCallback((snapshot: VocalDiagnosisRecord, targetRevision: number) => {
    const run = saveQueueRef.current.then(() => performSave(snapshot, targetRevision));
    saveQueueRef.current = run.catch(() => undefined);
    return run;
  }, [performSave]);

  useEffect(() => {
    if (revision === 0 || revision <= savedRevisionRef.current || !draft.student_name.trim()) return;
    const timer = window.setTimeout(() => {
      void enqueueSave(draftRef.current, revisionRef.current).catch(() => undefined);
    }, 650);
    return () => window.clearTimeout(timer);
  }, [draft.student_name, enqueueSave, revision]);

  useEffect(() => {
    function saveBeforePause() {
      if (draftRef.current.student_name.trim() && revisionRef.current > savedRevisionRef.current) {
        void enqueueSave(draftRef.current, revisionRef.current).catch(() => undefined);
      }
    }
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") saveBeforePause();
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("pagehide", saveBeforePause);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("pagehide", saveBeforePause);
    };
  }, [enqueueSave]);

  const handleClose = useCallback(async () => {
    if (closeBusy) return;
    if (draftRef.current.student_name.trim() && revisionRef.current > savedRevisionRef.current) {
      setCloseBusy(true);
      try {
        await enqueueSave(draftRef.current, revisionRef.current);
      } catch {
        setCloseBusy(false);
        return;
      }
    }
    onClose();
  }, [closeBusy, enqueueSave, onClose]);

  useEffect(() => {
    closeRef.current = () => { void handleClose(); };
  }, [handleClose]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") closeRef.current();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, []);

  const consultationFacts = useMemo(() => {
    if (!consultation) return [] as [string, string][];
    const lesson = safeLesson(consultation.lesson_experience);
    const lessonText = lesson.hasExperience === true
      ? `있음 · ${lesson.subjects || "과목 미입력"} · ${lesson.period || "기간 미입력"}`
      : lesson.hasExperience === false ? "없음" : "미입력";
    return [
      ["관심 곡·장르", consultation.genre_song || "미입력"],
      ["궁금한 점", consultation.question || "미입력"],
      ["레슨 경험", lessonText],
      ["보컬 고민", consultation.vocal_difficulties.join(", ") || "미입력"],
    ] as [string, string][];
  }, [consultation]);

  function selectRangeMode(mode: RangeMode) {
    setRangeMode(mode);
    const low = mode === "chest" ? draft.chest_low_note : draft.falsetto_low_note;
    const high = mode === "chest" ? draft.chest_high_note : draft.falsetto_high_note;
    setRangeEndpoint(!low ? "low" : !high ? "high" : "low");
  }

  function selectNote(note: PianoNote) {
    const lowField = rangeMode === "chest" ? "chest_low_note" : "falsetto_low_note";
    const highField = rangeMode === "chest" ? "chest_high_note" : "falsetto_high_note";
    const low = draft[lowField];
    const high = draft[highField];

    if (rangeEndpoint === "low") {
      const nextHigh = high && NOTE_MIDI.get(high)! < note.midi ? "" : high;
      updateFields({ [lowField]: note.name, [highField]: nextHigh });
      setRangeEndpoint("high");
      return;
    }
    if (!low || NOTE_MIDI.get(low)! > note.midi) {
      updateFields({ [lowField]: note.name, [highField]: "" });
      setRangeEndpoint("high");
      return;
    }
    updateFields({ [highField]: note.name });
  }

  function noteColor(note: PianoNote) {
    const chestLow = NOTE_MIDI.get(draft.chest_low_note);
    const chestHigh = NOTE_MIDI.get(draft.chest_high_note);
    const falsettoLow = NOTE_MIDI.get(draft.falsetto_low_note);
    const falsettoHigh = NOTE_MIDI.get(draft.falsetto_high_note);
    const chestEndpoint = note.name === draft.chest_low_note || note.name === draft.chest_high_note;
    const falsettoEndpoint = note.name === draft.falsetto_low_note || note.name === draft.falsetto_high_note;
    if (chestEndpoint) return { background: "#e8a23d", color: "#211c15" };
    if (falsettoEndpoint) return { background: "#8b5cf6", color: "white" };
    if (chestLow !== undefined && chestHigh !== undefined && note.midi > chestLow && note.midi < chestHigh) {
      return { background: note.isBlack ? "#b97718" : "#f8ddb5", color: note.isBlack ? "white" : "#211c15" };
    }
    if (falsettoLow !== undefined && falsettoHigh !== undefined && note.midi > falsettoLow && note.midi < falsettoHigh) {
      return { background: note.isBlack ? "#6d3fd1" : "#ddd6fe", color: note.isBlack ? "white" : "#211c15" };
    }
    return { background: note.isBlack ? "#27231f" : "white", color: note.isBlack ? "white" : "#433d35" };
  }

  const statusText = saveState === "saving" ? "저장 중…"
    : saveState === "waiting" ? "자동 저장 대기…"
      : saveState === "saved" ? "✓ 자동 저장됨"
        : saveState === "error" ? "저장 실패"
          : draft.student_name ? "입력하면 자동 저장됩니다" : "이름을 입력하면 자동 저장 시작";

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#f4f2ee]" role="dialog" aria-modal="true" aria-labelledby="vocal-diagnosis-title">
      <header className="sticky top-0 z-30 border-b border-[#443e37] bg-[#2b2723] px-4 py-3.5 text-white shadow-md sm:px-6">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="vocal-diagnosis-title" className="truncate text-lg font-extrabold sm:text-xl">보컬 첫수업 진단서</h2>
            <p className={`mt-0.5 text-xs font-bold ${saveState === "error" ? "text-red-300" : saveState === "saved" ? "text-emerald-300" : "text-[#c8c0b5]"}`}>{statusText}</p>
          </div>
          <div className="flex shrink-0 gap-2">
            <button
              type="button"
              onClick={() => void enqueueSave(draftRef.current, revisionRef.current).catch(() => undefined)}
              disabled={!draft.student_name.trim() || saveState === "saving"}
              className="min-h-12 rounded-xl bg-[#e8a23d] px-4 text-sm font-extrabold text-[#2b2723] disabled:opacity-50"
            >
              지금 저장
            </button>
            <button type="button" onClick={() => void handleClose()} disabled={closeBusy} className="min-h-12 rounded-xl border border-[#6b6459] px-4 text-sm font-bold disabled:opacity-50">{closeBusy ? "저장 중…" : "닫기"}</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-4 p-4 pb-12 sm:p-6 sm:pb-16">
        {saveError ? <p className="rounded-xl bg-red-50 p-4 text-sm font-bold text-red-700" role="alert">{saveError}</p> : null}

        <section className="rounded-[18px] bg-white p-5 shadow-[0_2px_8px_rgba(0,0,0,0.04)] sm:p-6">
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <label>
              <span className="mb-2 block text-sm font-bold text-[#5f584e]">학생 이름</span>
              <input
                value={draft.student_name}
                readOnly={Boolean(draft.consultation_id)}
                onChange={(event) => updateFields({ student_name: event.target.value })}
                placeholder="학생 이름 입력"
                autoFocus={!draft.student_name}
                className="min-h-14 w-full rounded-[14px] border-[1.5px] border-[#d8d2c8] bg-[#faf9f6] px-4 text-lg font-bold focus:border-[#e8a23d] focus:bg-white focus:outline-none read-only:bg-[#eee9e0]"
              />
            </label>
            <div className="rounded-xl bg-[#f7f4ee] px-4 py-3 text-sm text-[#6b6459]">
              <span className="font-bold">작성일</span> · {formatDate(draft.created_at)}
            </div>
          </div>
        </section>

        <Section number={1} title="확인사항" description="수업 전에 학생의 상담 내용과 특징을 확인합니다.">
          {consultation ? (
            <div className="mb-5 rounded-[16px] border border-[#ead3aa] bg-[#fff8e9] p-4 sm:p-5">
              <p className="mb-3 text-sm font-extrabold text-[#8a5a16]">상담 카드에서 자동으로 불러온 내용</p>
              <dl className="grid grid-cols-[108px_1fr] gap-x-3 gap-y-2.5 text-sm sm:grid-cols-[128px_1fr]">
                {consultationFacts.map(([label, value]) => (
                  <div key={label} className="contents">
                    <dt className="font-bold text-[#7d756a]">{label}</dt>
                    <dd className="break-words leading-relaxed">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          ) : (
            <p className="mb-5 rounded-[14px] bg-[#f7f4ee] p-4 text-sm text-[#7d756a]">상담 카드와 연결하지 않고 직접 작성하는 진단서입니다.</p>
          )}
          <MemoField label="추가 확인 메모" value={draft.confirmation_notes} onChange={(value) => updateFields({ confirmation_notes: value })} placeholder="수업 전에 확인할 내용이나 학생 특징을 적어 주세요" rows={4} />
        </Section>

        <Section number={2} title="기본기" description="음감, 박자감, 호흡, 발성의 현재 상태를 빠르게 기록합니다.">
          <div className="grid gap-4 lg:grid-cols-2">
            <EvaluationBlock title="음감" level={draft.pitch_level} memo={draft.pitch_memo} onLevel={(value) => updateFields({ pitch_level: value })} onMemo={(value) => updateFields({ pitch_memo: value })} />
            <EvaluationBlock title="박자감" level={draft.rhythm_level} memo={draft.rhythm_memo} onLevel={(value) => updateFields({ rhythm_level: value })} onMemo={(value) => updateFields({ rhythm_memo: value })} />
            <div className="rounded-[16px] bg-[#f7f4ee] p-4 sm:p-5">
              <h4 className="mb-4 text-lg font-extrabold">호흡</h4>
              <div className="space-y-4">
                <LevelChips label="호흡의 전반적 상태" value={draft.breath_level} onChange={(value) => updateFields({ breath_level: value })} />
                <MemoField label="호흡 메모" value={draft.breath_memo} onChange={(value) => updateFields({ breath_memo: value })} placeholder="호흡의 전반적 상태를 기록해 주세요" />
                <label className="block">
                  <span className="mb-2 block text-sm font-bold text-[#5f584e]">호흡 연습 길이</span>
                  <span className="flex items-center gap-2">
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={999}
                      value={draft.breath_exercise_seconds ?? ""}
                      onChange={(event) => updateFields({ breath_exercise_seconds: event.target.value === "" ? null : Math.min(999, Math.max(0, Number(event.target.value))) })}
                      className="min-h-14 w-36 rounded-[14px] border-[1.5px] border-[#d8d2c8] bg-white px-4 text-lg font-bold focus:border-[#e8a23d] focus:outline-none"
                    />
                    <span className="font-bold text-[#6b6459]">초</span>
                  </span>
                </label>
              </div>
            </div>
            <EvaluationBlock title="발성" hint="발성의 현재 상태 및 습관을 기록해 주세요" level={draft.phonation_level} memo={draft.phonation_memo} onLevel={(value) => updateFields({ phonation_level: value })} onMemo={(value) => updateFields({ phonation_memo: value })} memoFirst />
          </div>
        </Section>

        <Section number={3} title="음역대" description="진성 또는 가성을 고르고, 최저음과 최고음 순서로 건반을 눌러 주세요.">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-[#eee9e0] p-2">
              <button type="button" aria-pressed={rangeMode === "chest"} onClick={() => selectRangeMode("chest")} className={`min-h-12 rounded-xl text-base font-extrabold ${rangeMode === "chest" ? "bg-[#e8a23d] text-[#2b2723] shadow-sm" : "text-[#6b6459]"}`}>진성</button>
              <button type="button" aria-pressed={rangeMode === "falsetto"} onClick={() => selectRangeMode("falsetto")} className={`min-h-12 rounded-xl text-base font-extrabold ${rangeMode === "falsetto" ? "bg-violet-600 text-white shadow-sm" : "text-[#6b6459]"}`}>가성</button>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-[14px] bg-[#eee9e0] p-2">
              <button type="button" aria-pressed={rangeEndpoint === "low"} onClick={() => setRangeEndpoint("low")} className={`min-h-12 rounded-xl text-sm font-extrabold ${rangeEndpoint === "low" ? "bg-white text-[#2b2723] shadow-sm" : "text-[#6b6459]"}`}>최저음 선택</button>
              <button type="button" aria-pressed={rangeEndpoint === "high"} onClick={() => setRangeEndpoint("high")} className={`min-h-12 rounded-xl text-sm font-extrabold ${rangeEndpoint === "high" ? "bg-white text-[#2b2723] shadow-sm" : "text-[#6b6459]"}`}>최고음 선택</button>
            </div>
          </div>

          <p className="mt-3 rounded-xl bg-[#f7f4ee] px-4 py-3 text-center text-sm font-bold text-[#6b6459]" aria-live="polite">
            현재 입력: <span className={rangeMode === "chest" ? "text-[#a8660a]" : "text-violet-700"}>{rangeMode === "chest" ? "진성" : "가성"} {rangeEndpoint === "low" ? "최저음" : "최고음"}</span>
          </p>

          <div className="mt-4 overflow-x-auto rounded-[16px] border border-[#cfc7bb] bg-[#ded8cf] p-3 pb-4 overscroll-x-contain" aria-label="C2부터 C6까지 피아노 건반">
            <div className="relative h-[184px]" style={{ width: PIANO.width }}>
              {PIANO.notes.filter((note) => !note.isBlack).map((note) => {
                const color = noteColor(note);
                const selected = note.name === draft.chest_low_note || note.name === draft.chest_high_note || note.name === draft.falsetto_low_note || note.name === draft.falsetto_high_note;
                return (
                  <button
                    key={note.name}
                    type="button"
                    aria-label={`${note.name} 음 선택`}
                    aria-pressed={selected}
                    onClick={() => selectNote(note)}
                    className="absolute bottom-0 h-[180px] border border-[#a9a197] text-xs font-extrabold active:brightness-90"
                    style={{ left: note.left, width: WHITE_KEY_WIDTH, backgroundColor: color.background, color: color.color }}
                  >
                    <span className="absolute inset-x-0 bottom-2">{note.name.startsWith("C") || selected ? note.name : ""}</span>
                    {note.name === "C4" ? <span className="absolute inset-x-1 bottom-8 rounded bg-[#2b2723] px-1 py-0.5 text-[10px] text-white">가운데 도</span> : null}
                  </button>
                );
              })}
              {PIANO.notes.filter((note) => note.isBlack).map((note) => {
                const color = noteColor(note);
                const selected = note.name === draft.chest_low_note || note.name === draft.chest_high_note || note.name === draft.falsetto_low_note || note.name === draft.falsetto_high_note;
                return (
                  <button
                    key={note.name}
                    type="button"
                    aria-label={`${note.name} 음 선택`}
                    aria-pressed={selected}
                    onClick={() => selectNote(note)}
                    className="absolute top-0 z-10 h-[112px] rounded-b-md border border-[#161310] text-[10px] font-extrabold shadow-sm active:brightness-110"
                    style={{ left: note.left, width: BLACK_KEY_WIDTH, backgroundColor: color.background, color: color.color }}
                  >
                    {selected ? <span className="absolute inset-x-0 bottom-2 -rotate-90">{note.name}</span> : null}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <p className="rounded-[14px] bg-[#fff4df] p-4 text-base font-extrabold text-[#8a5a16]">진성: {rangeText(draft.chest_low_note, draft.chest_high_note)}</p>
            <p className="rounded-[14px] bg-violet-50 p-4 text-base font-extrabold text-violet-800">가성: {rangeText(draft.falsetto_low_note, draft.falsetto_high_note)}</p>
          </div>
        </Section>

        <Section number={4} title="퍼포먼스" description="자세, 다이나믹, 전달력 등을 확인합니다.">
          <div className="space-y-4">
            <LevelChips label="퍼포먼스 평가" value={draft.performance_level} onChange={(value) => updateFields({ performance_level: value })} />
            <MemoField label="퍼포먼스 메모" value={draft.performance_memo} onChange={(value) => updateFields({ performance_memo: value })} placeholder="자세, 다이나믹, 전달력 등을 기록해 주세요" rows={4} />
          </div>
        </Section>

        <Section number={5} title="기타" description="발음, 소리, 톤, 음량 등 추가로 확인한 내용을 기록합니다.">
          <MemoField label="기타 메모" value={draft.other_notes} onChange={(value) => updateFields({ other_notes: value })} placeholder="발음, 소리, 톤, 음량 등을 기록해 주세요" rows={5} />
        </Section>

        <Section number={6} title="수업 방향성" description="진단을 바탕으로 학생과 앞으로의 수업 방향을 함께 정합니다.">
          <MemoField label="앞으로의 수업 방향" value={draft.lesson_direction} onChange={(value) => updateFields({ lesson_direction: value })} placeholder="중점적으로 연습할 내용과 수업 방향을 적어 주세요" rows={6} />
          <p className="mt-4 rounded-[14px] bg-[#fff8e9] p-4 text-sm font-bold leading-relaxed text-[#8a5a16]">앞으로 수업이 진행됨에 따라 방향은 언제든 함께 조정할 수 있습니다.</p>
        </Section>
      </main>
    </div>
  );
}
