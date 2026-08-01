"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ConsultationLinkDialog } from "@/components/consultation-link-dialog";
import { VocalDiagnosisEditor } from "@/components/vocal-diagnosis-editor";
import type {
  ConsultationRecord,
  ConsultationStatus,
  LessonExperience,
  SchedulePreference,
  VocalDiagnosisRecord,
} from "@/lib/types";

type AuthState = "checking" | "signed-out" | "signed-in";
type CardFilter = "전체" | "일반" | "입시";
type AdminView = "consultations" | "diagnoses";
type DiagnosisEditorState = {
  diagnosis: VocalDiagnosisRecord | null;
  consultation: ConsultationRecord | null;
};

function digits(value: string) {
  return value.replace(/\D/g, "");
}

function formatCreatedAt(value: string) {
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

function safeSchedule(value: unknown): SchedulePreference[] {
  return Array.isArray(value) ? value as SchedulePreference[] : [];
}

function rangeLabel(low: string, high: string) {
  return low || high ? `${low || "?"} ~ ${high || "?"}` : "미입력";
}

export function AdminDashboard() {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [records, setRecords] = useState<ConsultationRecord[]>([]);
  const [diagnoses, setDiagnoses] = useState<VocalDiagnosisRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [diagnosesLoading, setDiagnosesLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [cardFilter, setCardFilter] = useState<CardFilter>("전체");
  const [view, setView] = useState<AdminView>("consultations");
  const [selected, setSelected] = useState<ConsultationRecord | null>(null);
  const [updatingId, setUpdatingId] = useState("");
  const [diagnosisBusyId, setDiagnosisBusyId] = useState("");
  const [diagnosisEditor, setDiagnosisEditor] = useState<DiagnosisEditorState | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);

  const loadConsultations = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/admin/consultations", { cache: "no-store" });
      if (response.status === 401) {
        setAuth("signed-out");
        setRecords([]);
        return;
      }
      const result = (await response.json()) as ConsultationRecord[] | { error?: string };
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(!Array.isArray(result) && result.error ? result.error : "목록을 불러오지 못했습니다.");
      }
      setRecords(result);
      setAuth("signed-in");
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDiagnoses = useCallback(async () => {
    setDiagnosesLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/admin/vocal-diagnoses", { cache: "no-store" });
      if (response.status === 401) {
        setAuth("signed-out");
        setDiagnoses([]);
        return;
      }
      const result = (await response.json()) as VocalDiagnosisRecord[] | { error?: string };
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(!Array.isArray(result) && result.error ? result.error : "진단서 목록을 불러오지 못했습니다.");
      }
      setDiagnoses(result);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "진단서 목록을 불러오지 못했습니다.");
    } finally {
      setDiagnosesLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (cancelled) return;
        if (response.ok) {
          setAuth("signed-in");
          await Promise.all([loadConsultations(), loadDiagnoses()]);
        } else {
          setAuth("signed-out");
        }
      } catch {
        if (!cancelled) setAuth("signed-out");
      }
    }
    void checkSession();
    return () => { cancelled = true; };
  }, [loadConsultations, loadDiagnoses]);

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ko-KR");
    const queryDigits = digits(query);
    return records.filter((record) => {
      if (cardFilter !== "전체" && record.card_type !== cardFilter) return false;
      if (!query) return true;
      return record.name.toLocaleLowerCase("ko-KR").includes(query)
        || (queryDigits.length > 0 && (
          digits(record.student_phone).includes(queryDigits)
          || digits(record.parent_phone).includes(queryDigits)
        ));
    });
  }, [cardFilter, records, search]);

  const filteredDiagnoses = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ko-KR");
    if (!query) return diagnoses;
    return diagnoses.filter((diagnosis) => diagnosis.student_name.toLocaleLowerCase("ko-KR").includes(query));
  }, [diagnoses, search]);

  const diagnosisByConsultation = useMemo(() => new Map(
    diagnoses.flatMap((diagnosis) => diagnosis.consultation_id ? [[diagnosis.consultation_id, diagnosis] as const] : []),
  ), [diagnoses]);

  async function login(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoginBusy(true);
    setLoginError("");
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "로그인하지 못했습니다.");
      setPassword("");
      setAuth("signed-in");
      await Promise.all([loadConsultations(), loadDiagnoses()]);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "로그인하지 못했습니다.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setRecords([]);
    setDiagnoses([]);
    setSelected(null);
    setDiagnosisEditor(null);
    setAuth("signed-out");
  }

  const upsertDiagnosis = useCallback((record: VocalDiagnosisRecord) => {
    setDiagnoses((current) => {
      const found = current.some((item) => item.id === record.id);
      return found
        ? current.map((item) => item.id === record.id ? record : item)
        : [record, ...current];
    });
  }, []);

  async function openDiagnosis(consultation: ConsultationRecord) {
    const existing = diagnosisByConsultation.get(consultation.id);
    if (existing) {
      setDiagnosisEditor({ diagnosis: existing, consultation });
      return;
    }
    if (diagnosisBusyId) return;
    setDiagnosisBusyId(consultation.id);
    setLoadError("");
    try {
      const response = await fetch("/api/admin/vocal-diagnoses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ consultation_id: consultation.id }),
      });
      const result = (await response.json()) as VocalDiagnosisRecord | { error?: string };
      if (!response.ok || !("id" in result)) {
        throw new Error("error" in result && result.error ? result.error : "진단서를 만들지 못했습니다.");
      }
      upsertDiagnosis(result);
      setDiagnosisEditor({ diagnosis: result, consultation });
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "진단서를 만들지 못했습니다.");
    } finally {
      setDiagnosisBusyId("");
    }
  }

  async function updateStatus(record: ConsultationRecord, status: ConsultationStatus) {
    if (record.status === status || updatingId) return;
    setUpdatingId(record.id);
    setLoadError("");
    try {
      const response = await fetch(`/api/admin/consultations/${record.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const result = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(result.error || "상태를 바꾸지 못했습니다.");
      setRecords((current) => current.map((item) => item.id === record.id ? { ...item, status } : item));
      setSelected((current) => current?.id === record.id ? { ...current, status } : current);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "상태를 바꾸지 못했습니다.");
    } finally {
      setUpdatingId("");
    }
  }

  if (auth === "checking") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f4f2ee] p-6">
        <p className="font-semibold text-[#6b6459]">관리자 세션을 확인하고 있어요…</p>
      </main>
    );
  }

  if (auth === "signed-out") {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-[#f4f2ee] p-5">
        <section className="w-full max-w-md rounded-[20px] bg-white p-7 shadow-[0_2px_14px_rgba(0,0,0,0.08)] sm:p-9">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#2b2723] text-2xl text-white" aria-hidden="true">♬</div>
          <h1 className="mt-5 text-center text-2xl font-extrabold tracking-tight">상담 관리</h1>
          <p className="mt-2 text-center text-sm text-[#8a8378]">관리자 비밀번호를 입력해 주세요</p>
          <form onSubmit={login} className="mt-6">
            <label htmlFor="admin-password" className="mb-2 block text-sm font-bold text-[#6b6459]">비밀번호</label>
            <input id="admin-password" type="password" autoComplete="current-password" autoFocus required value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-14 w-full rounded-xl border-[1.5px] border-[#d8d2c8] bg-[#faf9f6] px-4 text-lg focus:border-[#e8a23d] focus:bg-white focus:outline-none" />
            {loginError ? <p className="mt-3 text-sm font-semibold text-red-700" role="alert">{loginError}</p> : null}
            <button type="submit" disabled={loginBusy} className="mt-5 min-h-14 w-full rounded-[14px] bg-[#e8a23d] px-5 text-lg font-extrabold text-[#2b2723] shadow-[0_4px_14px_rgba(232,162,61,0.3)] disabled:opacity-60">
              {loginBusy ? "확인 중…" : "관리자 화면 열기"}
            </button>
          </form>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-dvh bg-[#f4f2ee]">
      <header className="sticky top-0 z-20 bg-[#2b2723] px-5 py-4 text-white shadow-sm">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 sm:gap-4">
          <div><h1 className="text-base font-extrabold sm:text-lg">라 실용음악학원 · 상담 관리</h1><p className="mt-0.5 text-xs text-[#b5aea3]">상담 {records.length}건 · 보컬 진단서 {diagnoses.length}건</p></div>
          <div className="flex flex-wrap gap-2">
            <Link href="/consult" className="flex min-h-12 items-center rounded-xl bg-[#e8a23d] px-3.5 text-sm font-extrabold text-[#2b2723]">새 상담 시작</Link>
            <button type="button" onClick={() => setDiagnosisEditor({ diagnosis: null, consultation: null })} className="min-h-12 rounded-xl bg-violet-100 px-3.5 text-sm font-extrabold text-violet-900">새 진단서</button>
            <button type="button" onClick={() => setLinkDialogOpen(true)} className="min-h-12 rounded-xl bg-white px-3.5 text-sm font-extrabold text-[#2b2723]">상담 링크 보내기</button>
            <button type="button" onClick={logout} className="min-h-12 rounded-xl border border-[#6b6459] px-3.5 text-sm font-bold">로그아웃</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="mb-4 grid grid-cols-2 gap-2 rounded-[16px] bg-[#ded8cf] p-2" aria-label="관리 화면 선택">
          <button type="button" aria-pressed={view === "consultations"} onClick={() => setView("consultations")} className={`min-h-12 rounded-xl text-sm font-extrabold sm:text-base ${view === "consultations" ? "bg-white text-[#2b2723] shadow-sm" : "text-[#6b6459]"}`}>상담 목록</button>
          <button type="button" aria-pressed={view === "diagnoses"} onClick={() => setView("diagnoses")} className={`min-h-12 rounded-xl text-sm font-extrabold sm:text-base ${view === "diagnoses" ? "bg-white text-violet-800 shadow-sm" : "text-[#6b6459]"}`}>보컬 진단서 ({diagnoses.length})</button>
        </div>

        <section className="rounded-[18px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] sm:p-5">
          <div className={`grid gap-3 ${view === "consultations" ? "sm:grid-cols-[1fr_auto_auto]" : "sm:grid-cols-[1fr_auto]"}`}>
            <div>
              <label htmlFor="admin-search" className="sr-only">{view === "consultations" ? "이름 또는 전화번호 검색" : "진단서 학생 이름 검색"}</label>
              <input id="admin-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-12 w-full rounded-xl border-[1.5px] border-[#d8d2c8] bg-[#faf9f6] px-4 focus:border-[#e8a23d] focus:bg-white focus:outline-none" placeholder={view === "consultations" ? "이름 또는 전화번호 뒷자리 검색" : "진단서 학생 이름 검색"} />
            </div>
            {view === "consultations" ? (
              <div className="flex gap-2" aria-label="카드 종류 필터">
                {(["전체", "일반", "입시"] as CardFilter[]).map((filter) => (
                  <button key={filter} type="button" aria-pressed={cardFilter === filter} onClick={() => setCardFilter(filter)} className={`min-h-12 rounded-xl px-4 text-sm font-bold ${cardFilter === filter ? "bg-[#2b2723] text-white" : "bg-[#eee9e0] text-[#4a453d]"}`}>{filter}</button>
                ))}
              </div>
            ) : null}
            <button type="button" onClick={() => void Promise.all([loadConsultations(), loadDiagnoses()])} disabled={loading || diagnosesLoading} className="min-h-12 rounded-xl bg-[#e8a23d] px-4 text-sm font-extrabold text-[#2b2723] disabled:opacity-60">{loading || diagnosesLoading ? "불러오는 중…" : "새로고침"}</button>
          </div>
        </section>

        {loadError ? <p className="mt-4 rounded-xl bg-red-50 p-4 text-sm font-semibold text-red-700" role="alert">{loadError}</p> : null}

        {view === "consultations" ? <section className="mt-4 space-y-3" aria-label="상담 목록">
          {!loading && filtered.length === 0 ? (
            <div className="rounded-[18px] bg-white p-10 text-center text-[#8a8378]">조건에 맞는 상담 카드가 없습니다.</div>
          ) : null}
          {filtered.map((record) => (
            <article key={record.id} className="rounded-[18px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <button type="button" onClick={() => setSelected(record)} className="min-h-12 flex-1 text-left">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-extrabold">{record.name}</h2>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${record.card_type === "입시" ? "bg-[#dcecf9] text-[#2f6d9f]" : "bg-[#eee9e0] text-[#5a5349]"}`}>{record.card_type}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${record.submission_source === "link" ? "bg-violet-100 text-violet-800" : "bg-sky-100 text-sky-800"}`}>{record.submission_source === "link" ? "링크 접수" : "현장"}</span>
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${record.status === "등록" ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>{record.status === "등록" ? "등록함" : "상담만 함"}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-[#6b6459]">{record.student_phone || record.parent_phone || "연락처 없음"} · {record.subjects.join(", ") || "과목 미입력"}</p>
                  <p className="mt-1 text-xs text-[#9a9389]">{formatCreatedAt(record.created_at)}</p>
                </button>
                <div className="flex flex-wrap gap-2">
                  {record.subjects.includes("보컬") ? (
                    <button type="button" disabled={diagnosisBusyId === record.id} onClick={() => void openDiagnosis(record)} className="min-h-12 rounded-xl bg-violet-100 px-4 text-sm font-extrabold text-violet-900 disabled:opacity-50">
                      {diagnosisBusyId === record.id ? "여는 중…" : diagnosisByConsultation.has(record.id) ? "진단서 보기" : "진단서 작성"}
                    </button>
                  ) : null}
                  <button type="button" onClick={() => setSelected(record)} className="min-h-12 rounded-xl bg-[#eee9e0] px-4 text-sm font-bold text-[#4a453d]">상세 보기</button>
                  <button type="button" disabled={updatingId === record.id} onClick={() => void updateStatus(record, record.status === "상담" ? "등록" : "상담")} className={`min-h-12 rounded-xl px-4 text-sm font-extrabold disabled:opacity-50 ${record.status === "상담" ? "bg-[#e8a23d] text-[#2b2723]" : "bg-[#2b2723] text-white"}`}>{record.status === "상담" ? "등록으로 변경" : "상담으로 변경"}</button>
                </div>
              </div>
            </article>
          ))}
        </section> : (
          <section className="mt-4 space-y-3" aria-label="보컬 진단서 목록">
            {!diagnosesLoading && filteredDiagnoses.length === 0 ? (
              <div className="rounded-[18px] bg-white p-10 text-center text-[#8a8378]">
                <p>작성된 보컬 진단서가 없습니다.</p>
                <button type="button" onClick={() => setDiagnosisEditor({ diagnosis: null, consultation: null })} className="mt-4 min-h-12 rounded-xl bg-violet-100 px-5 text-sm font-extrabold text-violet-900">새 진단서 작성</button>
              </div>
            ) : null}
            {filteredDiagnoses.map((diagnosis) => {
              const consultation = diagnosis.consultation_id ? records.find((record) => record.id === diagnosis.consultation_id) ?? null : null;
              return (
                <article key={diagnosis.id} className="rounded-[18px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] sm:p-5">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button type="button" onClick={() => setDiagnosisEditor({ diagnosis, consultation })} className="min-h-12 flex-1 text-left">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-extrabold">{diagnosis.student_name}</h2>
                        <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${diagnosis.consultation_id ? "bg-amber-100 text-amber-800" : "bg-[#eee9e0] text-[#5a5349]"}`}>{diagnosis.consultation_id ? "상담 연결" : "직접 작성"}</span>
                      </div>
                      <p className="mt-1.5 text-sm font-semibold text-[#6b6459]">진성 {rangeLabel(diagnosis.chest_low_note, diagnosis.chest_high_note)} · 가성 {rangeLabel(diagnosis.falsetto_low_note, diagnosis.falsetto_high_note)}</p>
                      <p className="mt-1 text-xs text-[#9a9389]">작성 {formatCreatedAt(diagnosis.created_at)} · 수정 {formatCreatedAt(diagnosis.updated_at)}</p>
                    </button>
                    <button type="button" onClick={() => setDiagnosisEditor({ diagnosis, consultation })} className="min-h-12 rounded-xl bg-violet-100 px-4 text-sm font-extrabold text-violet-900">진단서 보기</button>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {selected ? <ConsultationDetail record={selected} diagnosis={diagnosisByConsultation.get(selected.id)} diagnosisBusy={diagnosisBusyId === selected.id} busy={updatingId === selected.id} onClose={() => setSelected(null)} onDiagnosis={() => { const consultation = selected; setSelected(null); void openDiagnosis(consultation); }} onStatus={(status) => void updateStatus(selected, status)} /> : null}
      {linkDialogOpen ? <ConsultationLinkDialog onClose={() => setLinkDialogOpen(false)} /> : null}
      {diagnosisEditor ? <VocalDiagnosisEditor initialDiagnosis={diagnosisEditor.diagnosis} consultation={diagnosisEditor.consultation} onClose={() => setDiagnosisEditor(null)} onSaved={upsertDiagnosis} /> : null}
    </main>
  );
}

function ConsultationDetail({
  record,
  diagnosis,
  diagnosisBusy,
  busy,
  onClose,
  onDiagnosis,
  onStatus,
}: {
  record: ConsultationRecord;
  diagnosis?: VocalDiagnosisRecord;
  diagnosisBusy: boolean;
  busy: boolean;
  onClose: () => void;
  onDiagnosis: () => void;
  onStatus: (status: ConsultationStatus) => void;
}) {
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const lesson = safeLesson(record.lesson_experience);
  const schedule = safeSchedule(record.schedule_preferences)
    .filter((item) => item.days?.length || item.timeSlot)
    .map((item) => `${item.rank}순위: ${(item.days || []).join(",")}요일 / ${item.timeSlot || "?"}`)
    .join("\n");

  const rows: [string, string][] = [
    ["작성 일시", formatCreatedAt(record.created_at)],
    ["카드 종류", record.card_type],
    ["접수 방식", record.submission_source === "link" ? "링크(원격)" : "현장 태블릿"],
    ["이름", record.name],
    ["생년월일", record.birth_date || ""],
    ["성별", record.gender],
    ["학생 연락처", record.student_phone],
    ["학부모 연락처", record.parent_phone],
    ["관심 과목", record.subjects.join(", ")],
    ["보컬 고민", record.vocal_difficulties.join(", ")],
    ["악기 고민", record.instrument_difficulties.join(", ")],
    ["악기 소지", record.has_instrument],
    ["레슨 목적", record.purpose],
  ];
  if (record.card_type === "입시") {
    rows.push(
      ["학교", [record.school, record.school_status].filter(Boolean).join(" · ")],
      ["거주 지역", record.region],
      ["입시 유형", [record.ipsi_type, record.ipsi_period].filter(Boolean).join(" / ")],
      ["목표 학교", record.target_school],
      ["상담 내용", record.consult_content],
    );
  }
  rows.push([
    "레슨 경험",
    lesson.hasExperience === true ? `있음 — ${lesson.subjects || "?"} / ${lesson.period || "?"}` : lesson.hasExperience === false ? "없음" : "",
  ]);
  if (record.card_type === "일반") {
    rows.push(["관심 곡·장르", record.genre_song], ["궁금한 점", record.question]);
  }
  rows.push(
    ["유입 경로", record.referral_source === "지인추천" ? `지인추천 (${record.referral_name || "?"})` : record.referral_source],
    ["가능 스케줄", schedule],
    ["시작 가능", record.start_available],
    ["기타 참고", record.etc_memo],
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/45 p-0 sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="detail-title" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="max-h-[92dvh] w-full max-w-2xl overflow-y-auto rounded-t-[22px] bg-white shadow-2xl sm:rounded-[22px]">
        <header className="sticky top-0 flex items-center justify-between gap-4 border-b border-[#eee9e0] bg-white px-5 py-4 sm:px-6">
          <div><h2 id="detail-title" className="text-xl font-extrabold">{record.name} 상담 카드</h2><p className="mt-0.5 text-xs text-[#8a8378]">{record.card_type} · {formatCreatedAt(record.created_at)}</p></div>
          <button type="button" onClick={onClose} aria-label="상세 보기 닫기" className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[#eee9e0] text-xl font-bold">×</button>
        </header>
        <div className="p-5 sm:p-6">
          {record.subjects.includes("보컬") ? (
            <button type="button" disabled={diagnosisBusy} onClick={onDiagnosis} className="mb-4 min-h-14 w-full rounded-[14px] bg-violet-100 px-5 text-base font-extrabold text-violet-900 disabled:opacity-50">
              {diagnosisBusy ? "진단서 여는 중…" : diagnosis ? "보컬 진단서 보기·수정" : "보컬 진단서 작성"}
            </button>
          ) : null}
          <div className="mb-6 flex gap-2 rounded-[14px] bg-[#f7f4ee] p-2">
            <button type="button" disabled={busy} onClick={() => onStatus("상담")} className={`min-h-12 flex-1 rounded-xl text-sm font-extrabold ${record.status === "상담" ? "bg-white text-amber-800 shadow-sm" : "text-[#6b6459]"}`}>상담만 함</button>
            <button type="button" disabled={busy} onClick={() => onStatus("등록")} className={`min-h-12 flex-1 rounded-xl text-sm font-extrabold ${record.status === "등록" ? "bg-[#2b2723] text-white shadow-sm" : "text-[#6b6459]"}`}>등록함</button>
          </div>
          <dl className="grid grid-cols-[105px_1fr] gap-x-4 gap-y-3 text-[0.95rem] sm:grid-cols-[128px_1fr]">
            {rows.map(([label, value]) => value ? <div key={label} className="contents"><dt className="font-bold text-[#6b6459]">{label}</dt><dd className="whitespace-pre-line break-words leading-relaxed">{value}</dd></div> : null)}
          </dl>
        </div>
      </section>
    </div>
  );
}
