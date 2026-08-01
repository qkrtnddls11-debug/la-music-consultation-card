"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ConsentDetailModal } from "@/components/consent-detail-modal";
import { ConsultationLinkDialog } from "@/components/consultation-link-dialog";
import { RegistrationConsentFlow } from "@/components/registration-consent-flow";
import { SignatureLinkDialog } from "@/components/signature-link-dialog";
import { VocalDiagnosisEditor } from "@/components/vocal-diagnosis-editor";
import type {
  ConsentRecord,
  ConsentRequestRecord,
  ConsultationRecord,
  ConsultationStatus,
  LessonExperience,
  SchedulePreference,
  ReservationRecord,
  VocalDiagnosisRecord,
} from "@/lib/types";

type AuthState = "checking" | "signed-out" | "signed-in";
type CardFilter = "전체" | "일반" | "입시";
type AdminView = "consultations" | "reservations" | "diagnoses";
type DeleteTarget = "consultation" | "reservation" | "diagnosis";
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

function seoulDay(value: Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
}

function datetimeLocalValue(value: string | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(value));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}

function reservationScheduleLabel(item: ReservationRecord["schedule_preferences"][number]) {
  const days = item.days?.length ? item.days.join(", ") : item.day || "요일 미입력";
  const time = item.timeSlot || item.timeText || "시간 미입력";
  return `${days} · ${time}`;
}

function ReservationConfirmEditor({ record, busy, onSave }: { record: ReservationRecord; busy: boolean; onSave: (value: string) => void }) {
  const initial = datetimeLocalValue(record.confirmed_at);
  const [datePart = "", timePart = ""] = initial.split("T");
  const [initialYear = "", initialMonth = "", initialDay = ""] = datePart.split("-");
  const [initialHour = "", initialMinute = ""] = timePart.split(":");
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [day, setDay] = useState(initialDay);
  const [hour, setHour] = useState(initialHour);
  const [minute, setMinute] = useState(initialMinute);
  const [currentYear] = useState(() => new Date().getFullYear());
  const yearOptions = [...new Set([initialYear, String(currentYear), String(currentYear + 1)].filter(Boolean))].sort();
  const value = year && month && day && hour && minute ? `${year}-${month}-${day}T${hour}:${minute}` : "";
  const unchanged = value === initial;
  const selectClass = "min-h-12 min-w-0 rounded-xl border-[1.5px] border-[#d8d2c8] bg-white px-2 text-sm font-bold focus:border-[#e8a23d] focus:outline-none disabled:bg-[#eee9e0]";
  const disabled = busy || record.status === "상담완료";
  return <div><p className="text-sm font-extrabold text-[#6b6459]">상담 확정 일시</p><div className="mt-1.5 grid grid-cols-3 gap-1.5"><select aria-label="확정 연도" value={year} onChange={(event) => setYear(event.target.value)} disabled={disabled} className={selectClass}><option value="">년</option>{yearOptions.map((item) => <option key={item} value={item}>{item}년</option>)}</select><select aria-label="확정 월" value={month} onChange={(event) => setMonth(event.target.value)} disabled={disabled} className={selectClass}><option value="">월</option>{Array.from({ length: 12 }, (_, index) => String(index + 1).padStart(2, "0")).map((item) => <option key={item} value={item}>{Number(item)}월</option>)}</select><select aria-label="확정 일" value={day} onChange={(event) => setDay(event.target.value)} disabled={disabled} className={selectClass}><option value="">일</option>{Array.from({ length: 31 }, (_, index) => String(index + 1).padStart(2, "0")).map((item) => <option key={item} value={item}>{Number(item)}일</option>)}</select></div><div className="mt-1.5 grid grid-cols-[1fr_auto_1fr] items-center gap-1.5"><select aria-label="확정 시" value={hour} onChange={(event) => setHour(event.target.value)} disabled={disabled} className={selectClass}><option value="">시</option>{Array.from({ length: 15 }, (_, index) => String(index + 9).padStart(2, "0")).map((item) => <option key={item} value={item}>{Number(item)}시</option>)}</select><span className="font-black text-[#8a8378]">:</span><select aria-label="확정 분" value={minute} onChange={(event) => setMinute(event.target.value)} disabled={disabled} className={selectClass}><option value="">분</option>{["00", "10", "20", "30", "40", "50"].map((item) => <option key={item} value={item}>{item}분</option>)}</select></div><button type="button" disabled={busy || !value || unchanged || record.status === "상담완료"} onClick={() => onSave(value)} className="mt-2 min-h-12 w-full rounded-xl bg-[#e8a23d] px-4 text-sm font-black text-[#2b2723] disabled:bg-[#eee9e0] disabled:text-[#9a9389]">{busy ? "저장 중…" : "확정 일시 저장"}</button>{record.confirmed_at && record.status !== "상담완료" ? <button type="button" disabled={busy} onClick={() => onSave("")} className="mt-1.5 min-h-12 w-full rounded-xl bg-[#eee9e0] text-sm font-bold text-[#6b6459]">확정 취소</button> : null}</div>;
}

export function AdminDashboard({ initialView = "consultations" }: { initialView?: AdminView }) {
  const [auth, setAuth] = useState<AuthState>("checking");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  const [records, setRecords] = useState<ConsultationRecord[]>([]);
  const [reservations, setReservations] = useState<ReservationRecord[]>([]);
  const [diagnoses, setDiagnoses] = useState<VocalDiagnosisRecord[]>([]);
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [consentRequests, setConsentRequests] = useState<ConsentRequestRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [diagnosesLoading, setDiagnosesLoading] = useState(false);
  const [reservationsLoading, setReservationsLoading] = useState(false);
  const [consentsLoading, setConsentsLoading] = useState(false);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [search, setSearch] = useState("");
  const [cardFilter, setCardFilter] = useState<CardFilter>("전체");
  const [view, setView] = useState<AdminView>(initialView);
  const [renderedAt] = useState(() => Date.now());
  const [selected, setSelected] = useState<ConsultationRecord | null>(null);
  const [updatingId, setUpdatingId] = useState("");
  const [deletingKey, setDeletingKey] = useState("");
  const [diagnosisBusyId, setDiagnosisBusyId] = useState("");
  const [diagnosisEditor, setDiagnosisEditor] = useState<DiagnosisEditorState | null>(null);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [registrationRecord, setRegistrationRecord] = useState<ConsultationRecord | null>(null);
  const [consentViewer, setConsentViewer] = useState<{ consentId: string; consultation: ConsultationRecord } | null>(null);
  const [signatureRecord, setSignatureRecord] = useState<ConsultationRecord | null>(null);

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

  const loadReservations = useCallback(async () => {
    setReservationsLoading(true);
    try {
      const response = await fetch("/api/admin/reservations", { cache: "no-store" });
      if (response.status === 401) { setAuth("signed-out"); setReservations([]); return; }
      const result = await response.json() as ReservationRecord[] | { error?: string };
      if (!response.ok || !Array.isArray(result)) throw new Error(!Array.isArray(result) && result.error ? result.error : "예약 목록을 불러오지 못했습니다.");
      setReservations(result);
    } catch (error) { setLoadError(error instanceof Error ? error.message : "예약 목록을 불러오지 못했습니다."); }
    finally { setReservationsLoading(false); }
  }, []);

  const loadConsents = useCallback(async () => {
    setConsentsLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/admin/consents", { cache: "no-store" });
      if (response.status === 401) {
        setAuth("signed-out");
        setConsents([]);
        return;
      }
      const result = (await response.json()) as ConsentRecord[] | { error?: string };
      if (!response.ok || !Array.isArray(result)) {
        throw new Error(!Array.isArray(result) && result.error ? result.error : "동의서 목록을 불러오지 못했습니다.");
      }
      setConsents(result);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "동의서 목록을 불러오지 못했습니다.");
    } finally {
      setConsentsLoading(false);
    }
  }, []);

  const loadConsentRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const response = await fetch("/api/admin/consent-requests", { cache: "no-store" });
      if (response.status === 401) { setAuth("signed-out"); setConsentRequests([]); return; }
      const result = await response.json() as ConsentRequestRecord[] | { error?: string };
      if (!response.ok || !Array.isArray(result)) throw new Error(!Array.isArray(result) && result.error ? result.error : "서명 요청 상태를 불러오지 못했습니다.");
      setConsentRequests(result);
    } catch (error) { setLoadError(error instanceof Error ? error.message : "서명 요청 상태를 불러오지 못했습니다."); }
    finally { setRequestsLoading(false); }
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function checkSession() {
      try {
        const response = await fetch("/api/admin/session", { cache: "no-store" });
        if (cancelled) return;
        if (response.ok) {
          setAuth("signed-in");
          await Promise.all([loadConsultations(), loadReservations(), loadDiagnoses(), loadConsents(), loadConsentRequests()]);
        } else {
          setAuth("signed-out");
        }
      } catch {
        if (!cancelled) setAuth("signed-out");
      }
    }
    void checkSession();
    return () => { cancelled = true; };
  }, [loadConsultations, loadConsentRequests, loadConsents, loadDiagnoses, loadReservations]);

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

  const filteredReservations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("ko-KR");
    const queryDigits = digits(query);
    const today = seoulDay(new Date());
    return reservations.filter((item) => !query || item.name.toLocaleLowerCase("ko-KR").includes(query) || (queryDigits && digits(item.phone).includes(queryDigits))).sort((a, b) => {
      const aToday = a.confirmed_at && seoulDay(new Date(a.confirmed_at)) === today ? 1 : 0;
      const bToday = b.confirmed_at && seoulDay(new Date(b.confirmed_at)) === today ? 1 : 0;
      return bToday - aToday || new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
  }, [reservations, search]);

  const diagnosisByConsultation = useMemo(() => new Map(
    diagnoses.flatMap((diagnosis) => diagnosis.consultation_id ? [[diagnosis.consultation_id, diagnosis] as const] : []),
  ), [diagnoses]);

  const consentByConsultation = useMemo(() => new Map(
    consents.map((consent) => [consent.consultation_id, consent] as const),
  ), [consents]);

  const latestRequestByConsultation = useMemo(() => {
    const map = new Map<string, ConsentRequestRecord>();
    for (const request of consentRequests) if (!map.has(request.consultation_id)) map.set(request.consultation_id, request);
    return map;
  }, [consentRequests]);

  const reservationById = useMemo(() => new Map(reservations.map((item) => [item.id, item] as const)), [reservations]);
  const consultationByReservation = useMemo(() => new Map(records.flatMap((item) => item.reservation_id ? [[item.reservation_id, item] as const] : [])), [records]);

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
      await Promise.all([loadConsultations(), loadReservations(), loadDiagnoses(), loadConsents(), loadConsentRequests()]);
    } catch (error) {
      setLoginError(error instanceof Error ? error.message : "로그인하지 못했습니다.");
    } finally {
      setLoginBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    setRecords([]);
    setReservations([]);
    setDiagnoses([]);
    setConsents([]);
    setConsentRequests([]);
    setSelected(null);
    setDiagnosisEditor(null);
    setRegistrationRecord(null);
    setConsentViewer(null);
    setSignatureRecord(null);
    setAuth("signed-out");
  }

  async function updateReservationTime(record: ReservationRecord, value: string) {
    setUpdatingId(record.id); setLoadError("");
    try {
      const response = await fetch(`/api/admin/reservations/${record.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmed_at: value ? new Date(value).toISOString() : null }) });
      const result = await response.json() as ReservationRecord | { error?: string };
      if (!response.ok || !("id" in result)) throw new Error("error" in result && result.error ? result.error : "확정 일시를 저장하지 못했습니다.");
      setReservations((current) => current.map((item) => item.id === result.id ? result : item));
    } catch (error) { setLoadError(error instanceof Error ? error.message : "확정 일시를 저장하지 못했습니다."); }
    finally { setUpdatingId(""); }
  }

  async function deleteRecord(target: DeleteTarget, id: string, name: string) {
    const label = target === "consultation" ? "상담 기록" : target === "reservation" ? "상담 예약" : "보컬 진단서";
    const linkedNotice = target === "consultation"
      ? "\n연결된 동의서·서명 요청도 함께 삭제됩니다. 보컬 진단서는 남고 상담 연결만 해제됩니다."
      : target === "reservation"
        ? "\n이미 작성된 상담 기록은 삭제되지 않고 예약 연결만 해제됩니다."
        : "";
    if (!window.confirm(`${name}님의 ${label}을 삭제할까요?${linkedNotice}\n\n삭제 후에는 되돌릴 수 없습니다.`)) return;

    const endpoint = target === "consultation"
      ? `/api/admin/consultations/${id}`
      : target === "reservation"
        ? `/api/admin/reservations/${id}`
        : `/api/admin/vocal-diagnoses/${id}`;
    const key = `${target}:${id}`;
    setDeletingKey(key);
    setLoadError("");
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || `${label}을 삭제하지 못했습니다.`);

      if (target === "reservation") {
        setReservations((current) => current.filter((item) => item.id !== id));
        setRecords((current) => current.map((item) => item.reservation_id === id ? { ...item, reservation_id: null } : item));
        setSelected((current) => current?.reservation_id === id ? { ...current, reservation_id: null } : current);
      } else if (target === "consultation") {
        const deleted = records.find((item) => item.id === id);
        setRecords((current) => current.filter((item) => item.id !== id));
        setDiagnoses((current) => current.map((item) => item.consultation_id === id ? { ...item, consultation_id: null } : item));
        setConsents((current) => current.filter((item) => item.consultation_id !== id));
        setConsentRequests((current) => current.filter((item) => item.consultation_id !== id));
        if (deleted?.reservation_id) {
          setReservations((current) => current.map((item) => item.id === deleted.reservation_id
            ? { ...item, status: item.confirmed_at ? "확정" : "대기" }
            : item));
        }
        setSelected((current) => current?.id === id ? null : current);
        setRegistrationRecord((current) => current?.id === id ? null : current);
        setSignatureRecord((current) => current?.id === id ? null : current);
        setConsentViewer((current) => current?.consultation.id === id ? null : current);
      } else {
        setDiagnoses((current) => current.filter((item) => item.id !== id));
        setDiagnosisEditor((current) => current?.diagnosis?.id === id ? null : current);
      }
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : `${label}을 삭제하지 못했습니다.`);
    } finally {
      setDeletingKey("");
    }
  }

  const storeConsentRequest = useCallback((request: ConsentRequestRecord) => {
    setConsentRequests((current) => [request, ...current.filter((item) => item.id !== request.id)]);
  }, []);

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
    if (status === "등록" && !consentByConsultation.has(record.id)) {
      setSelected(null);
      setRegistrationRecord(record);
      return;
    }
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

  function completeRegistration(consent: ConsentRecord) {
    setConsents((current) => current.some((item) => item.id === consent.id)
      ? current.map((item) => item.id === consent.id ? consent : item)
      : [consent, ...current]);
    setRecords((current) => current.map((item) => item.id === consent.consultation_id ? { ...item, status: "등록" } : item));
    setSelected((current) => current?.id === consent.consultation_id ? { ...current, status: "등록" } : current);
    setRegistrationRecord(null);
    const consultation = records.find((item) => item.id === consent.consultation_id);
    if (consultation) setConsentViewer({ consentId: consent.id, consultation: { ...consultation, status: "등록" } });
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
          <div><h1 className="text-base font-extrabold sm:text-lg">라 실용음악학원 · 상담 관리</h1><p className="mt-0.5 text-xs text-[#b5aea3]">예약 {reservations.length}건 · 상담 {records.length}건 · 동의서 {consents.length}건 · 보컬 진단서 {diagnoses.length}건</p></div>
          <div className="flex flex-wrap gap-2">
            <Link href="/consult" className="flex min-h-12 items-center rounded-xl bg-[#e8a23d] px-3.5 text-sm font-extrabold text-[#2b2723]">새 상담 시작</Link>
            <button type="button" onClick={() => setDiagnosisEditor({ diagnosis: null, consultation: null })} className="min-h-12 rounded-xl bg-violet-100 px-3.5 text-sm font-extrabold text-violet-900">새 진단서</button>
            <button type="button" onClick={() => setLinkDialogOpen(true)} className="min-h-12 rounded-xl bg-white px-3.5 text-sm font-extrabold text-[#2b2723]">상담 링크 보내기</button>
            <button type="button" onClick={logout} className="min-h-12 rounded-xl border border-[#6b6459] px-3.5 text-sm font-bold">로그아웃</button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl p-4 sm:p-6">
        <div className="mb-4 grid grid-cols-3 gap-2 rounded-[16px] bg-[#ded8cf] p-2" aria-label="관리 화면 선택">
          <button type="button" aria-pressed={view === "reservations"} onClick={() => setView("reservations")} className={`min-h-12 rounded-xl text-sm font-extrabold sm:text-base ${view === "reservations" ? "bg-white text-[#b76e08] shadow-sm" : "text-[#6b6459]"}`}>상담 예약 ({reservations.length})</button>
          <button type="button" aria-pressed={view === "consultations"} onClick={() => setView("consultations")} className={`min-h-12 rounded-xl text-sm font-extrabold sm:text-base ${view === "consultations" ? "bg-white text-[#2b2723] shadow-sm" : "text-[#6b6459]"}`}>상담 목록</button>
          <button type="button" aria-pressed={view === "diagnoses"} onClick={() => setView("diagnoses")} className={`min-h-12 rounded-xl text-sm font-extrabold sm:text-base ${view === "diagnoses" ? "bg-white text-violet-800 shadow-sm" : "text-[#6b6459]"}`}>보컬 진단서 ({diagnoses.length})</button>
        </div>

        <section className="rounded-[18px] bg-white p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] sm:p-5">
          <div className={`grid gap-3 ${view === "consultations" ? "sm:grid-cols-[1fr_auto_auto]" : "sm:grid-cols-[1fr_auto]"}`}>
            <div>
              <label htmlFor="admin-search" className="sr-only">{view === "diagnoses" ? "진단서 학생 이름 검색" : "이름 또는 전화번호 검색"}</label>
              <input id="admin-search" type="search" value={search} onChange={(event) => setSearch(event.target.value)} className="min-h-12 w-full rounded-xl border-[1.5px] border-[#d8d2c8] bg-[#faf9f6] px-4 focus:border-[#e8a23d] focus:bg-white focus:outline-none" placeholder={view === "diagnoses" ? "진단서 학생 이름 검색" : "이름 또는 전화번호 뒷자리 검색"} />
            </div>
            {view === "consultations" ? (
              <div className="flex gap-2" aria-label="카드 종류 필터">
                {(["전체", "일반", "입시"] as CardFilter[]).map((filter) => (
                  <button key={filter} type="button" aria-pressed={cardFilter === filter} onClick={() => setCardFilter(filter)} className={`min-h-12 rounded-xl px-4 text-sm font-bold ${cardFilter === filter ? "bg-[#2b2723] text-white" : "bg-[#eee9e0] text-[#4a453d]"}`}>{filter}</button>
                ))}
              </div>
            ) : null}
            <button type="button" onClick={() => void Promise.all([loadConsultations(), loadReservations(), loadDiagnoses(), loadConsents(), loadConsentRequests()])} disabled={loading || reservationsLoading || diagnosesLoading || consentsLoading || requestsLoading} className="min-h-12 rounded-xl bg-[#e8a23d] px-4 text-sm font-extrabold text-[#2b2723] disabled:opacity-60">{loading || reservationsLoading || diagnosesLoading || consentsLoading || requestsLoading ? "불러오는 중…" : "새로고침"}</button>
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
                    <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${consentByConsultation.has(record.id) ? "bg-emerald-100 text-emerald-800" : latestRequestByConsultation.get(record.id) && !latestRequestByConsultation.get(record.id)?.revoked_at && new Date(latestRequestByConsultation.get(record.id)!.expires_at).getTime() > renderedAt ? "bg-violet-100 text-violet-800" : "bg-[#eee9e0] text-[#6b6459]"}`}>{consentByConsultation.has(record.id) ? "서명 완료" : latestRequestByConsultation.get(record.id) && !latestRequestByConsultation.get(record.id)?.revoked_at && new Date(latestRequestByConsultation.get(record.id)!.expires_at).getTime() > renderedAt ? "서명 대기 중" : "서명 미요청"}</span>
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
                  {consentByConsultation.has(record.id) ? (
                    <button type="button" onClick={() => setConsentViewer({ consentId: consentByConsultation.get(record.id)!.id, consultation: record })} className="min-h-12 rounded-xl bg-emerald-100 px-4 text-sm font-extrabold text-emerald-900">동의서 보기</button>
                  ) : null}
                  <button type="button" onClick={() => setSelected(record)} className="min-h-12 rounded-xl bg-[#eee9e0] px-4 text-sm font-bold text-[#4a453d]">상세 보기</button>
                  <button type="button" disabled={updatingId === record.id} onClick={() => void updateStatus(record, record.status === "상담" || !consentByConsultation.has(record.id) ? "등록" : "상담")} className={`min-h-12 rounded-xl px-4 text-sm font-extrabold disabled:opacity-50 ${record.status === "상담" || !consentByConsultation.has(record.id) ? "bg-[#e8a23d] text-[#2b2723]" : "bg-[#2b2723] text-white"}`}>{record.status === "상담" ? "등록으로 변경" : consentByConsultation.has(record.id) ? "상담으로 변경" : "동의서 받기"}</button>
                  <button type="button" disabled={deletingKey === `consultation:${record.id}`} onClick={() => void deleteRecord("consultation", record.id, record.name)} className="min-h-12 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 disabled:opacity-50">{deletingKey === `consultation:${record.id}` ? "삭제 중…" : "삭제"}</button>
                </div>
              </div>
            </article>
          ))}
        </section> : view === "reservations" ? (
          <section className="mt-4 space-y-3" aria-label="상담 예약 목록">
            {!reservationsLoading && filteredReservations.length === 0 ? <div className="rounded-[18px] bg-white p-10 text-center text-[#8a8378]">조건에 맞는 상담 예약이 없습니다.</div> : null}
            {filteredReservations.map((reservation) => {
              const linked = consultationByReservation.get(reservation.id);
              const todayConfirmed = reservation.confirmed_at && seoulDay(new Date(reservation.confirmed_at)) === seoulDay(new Date());
              return <article key={reservation.id} className={`rounded-[18px] p-4 shadow-[0_2px_10px_rgba(0,0,0,0.05)] sm:p-5 ${todayConfirmed ? "border-2 border-[#e8a23d] bg-amber-50" : "bg-white"}`}>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-[230px] flex-1">
                    <div className="flex flex-wrap items-center gap-2"><h2 className="text-xl font-black">{reservation.name}</h2>{todayConfirmed ? <span className="rounded-full bg-[#e8a23d] px-2.5 py-1 text-xs font-black text-[#2b2723]">오늘 상담</span> : null}<span className={`rounded-full px-2.5 py-1 text-xs font-bold ${reservation.status === "상담완료" ? "bg-emerald-100 text-emerald-800" : reservation.status === "확정" ? "bg-sky-100 text-sky-800" : "bg-amber-100 text-amber-800"}`}>{reservation.status}</span><span className="rounded-full bg-[#eee9e0] px-2.5 py-1 text-xs font-bold text-[#5a5349]">{reservation.source === "link" ? "링크" : reservation.source === "tablet" ? "현장" : "기타"}</span></div>
                    <p className="mt-2 text-sm font-semibold text-[#4a453d]">{reservation.phone} · {reservation.gender} · {reservation.birth_date}</p>
                    <p className="mt-1 text-sm text-[#6b6459]">{reservation.lesson_type} · {reservation.subjects.join(", ")}</p>
                    <div className="mt-3 rounded-xl bg-white/80 p-3 text-sm leading-6 text-[#5f584e]">{reservation.schedule_preferences.map((item) => item.days?.length || item.day || item.timeSlot || item.timeText ? <p key={item.rank}><strong>{item.rank}순위</strong> · {reservationScheduleLabel(item)}</p> : null)}{reservation.schedule_note ? <p className="mt-2 border-t border-[#ded8cf] pt-2"><strong>참고</strong> · {reservation.schedule_note}</p> : null}</div>
                    <p className="mt-2 text-xs text-[#9a9389]">접수 {formatCreatedAt(reservation.created_at)}</p>
                  </div>
                  <div className="w-full max-w-sm space-y-3 sm:w-[310px]">
                    <ReservationConfirmEditor key={reservation.confirmed_at ?? "empty"} record={reservation} busy={updatingId === reservation.id} onSave={(value) => void updateReservationTime(reservation, value)} />
                    {linked ? <button type="button" onClick={() => { setView("consultations"); setSelected(linked); }} className="min-h-12 w-full rounded-xl bg-emerald-100 px-4 text-sm font-black text-emerald-900">완료된 상담 보기</button> : <Link href={`/consult?reservation_id=${reservation.id}`} className="flex min-h-12 w-full items-center justify-center rounded-xl bg-[#2b2723] px-4 text-sm font-black text-white">상담 시작 →</Link>}
                    <button type="button" disabled={deletingKey === `reservation:${reservation.id}`} onClick={() => void deleteRecord("reservation", reservation.id, reservation.name)} className="min-h-12 w-full rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 disabled:opacity-50">{deletingKey === `reservation:${reservation.id}` ? "삭제 중…" : "예약 삭제"}</button>
                  </div>
                </div>
              </article>;
            })}
          </section>
        ) : (
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
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => setDiagnosisEditor({ diagnosis, consultation })} className="min-h-12 rounded-xl bg-violet-100 px-4 text-sm font-extrabold text-violet-900">진단서 보기</button>
                      <button type="button" disabled={deletingKey === `diagnosis:${diagnosis.id}`} onClick={() => void deleteRecord("diagnosis", diagnosis.id, diagnosis.student_name)} className="min-h-12 rounded-xl border border-red-200 bg-red-50 px-4 text-sm font-extrabold text-red-700 disabled:opacity-50">{deletingKey === `diagnosis:${diagnosis.id}` ? "삭제 중…" : "삭제"}</button>
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
        )}
      </div>

      {selected ? <ConsultationDetail record={selected} reservation={selected.reservation_id ? reservationById.get(selected.reservation_id) : undefined} diagnosis={diagnosisByConsultation.get(selected.id)} consent={consentByConsultation.get(selected.id)} consentRequest={latestRequestByConsultation.get(selected.id)} diagnosisBusy={diagnosisBusyId === selected.id} busy={updatingId === selected.id || deletingKey === `consultation:${selected.id}`} onClose={() => setSelected(null)} onDiagnosis={() => { const consultation = selected; setSelected(null); void openDiagnosis(consultation); }} onConsent={() => { const consent = consentByConsultation.get(selected.id); if (consent) setConsentViewer({ consentId: consent.id, consultation: selected }); }} onSignatureLink={() => { setSignatureRecord(selected); setSelected(null); }} onRecordUpdate={(record) => { setRecords((current) => current.map((item) => item.id === record.id ? record : item)); setSelected(record); }} onStatus={(status) => void updateStatus(selected, status)} onDelete={() => void deleteRecord("consultation", selected.id, selected.name)} /> : null}
      {linkDialogOpen ? <ConsultationLinkDialog onClose={() => setLinkDialogOpen(false)} /> : null}
      {diagnosisEditor ? <VocalDiagnosisEditor initialDiagnosis={diagnosisEditor.diagnosis} consultation={diagnosisEditor.consultation} onClose={() => setDiagnosisEditor(null)} onSaved={upsertDiagnosis} /> : null}
      {registrationRecord ? <RegistrationConsentFlow consultation={registrationRecord} onClose={() => setRegistrationRecord(null)} onComplete={completeRegistration} /> : null}
      {consentViewer ? <ConsentDetailModal consentId={consentViewer.consentId} consultation={consentViewer.consultation} onClose={() => setConsentViewer(null)} /> : null}
      {signatureRecord ? <SignatureLinkDialog consultation={signatureRecord} onClose={() => setSignatureRecord(null)} onCreated={storeConsentRequest} /> : null}
    </main>
  );
}

function ConsultationDetail({
  record,
  reservation,
  diagnosis,
  consent,
  consentRequest,
  diagnosisBusy,
  busy,
  onClose,
  onDiagnosis,
  onConsent,
  onSignatureLink,
  onRecordUpdate,
  onStatus,
  onDelete,
}: {
  record: ConsultationRecord;
  reservation?: ReservationRecord;
  diagnosis?: VocalDiagnosisRecord;
  consent?: ConsentRecord;
  consentRequest?: ConsentRequestRecord;
  diagnosisBusy: boolean;
  busy: boolean;
  onClose: () => void;
  onDiagnosis: () => void;
  onConsent: () => void;
  onSignatureLink: () => void;
  onRecordUpdate: (record: ConsultationRecord) => void;
  onStatus: (status: ConsultationStatus) => void;
  onDelete: () => void;
}) {
  const [memo, setMemo] = useState(record.admin_memo || "");
  const [memoBusy, setMemoBusy] = useState(false);
  const [memoMessage, setMemoMessage] = useState("");
  const [renderedAt] = useState(() => Date.now());
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

  async function saveMemo() {
    setMemoBusy(true); setMemoMessage("");
    try {
      const response = await fetch(`/api/admin/consultations/${record.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ admin_memo: memo }) });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || "관리자 메모를 저장하지 못했습니다.");
      onRecordUpdate({ ...record, admin_memo: memo }); setMemoMessage("저장되었습니다");
    } catch (error) { setMemoMessage(error instanceof Error ? error.message : "관리자 메모를 저장하지 못했습니다."); }
    finally { setMemoBusy(false); }
  }

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
          <section className="mb-5 rounded-[16px] border border-[#ded8cf] bg-[#f7f4ee] p-4"><h3 className="font-black">학생 흐름 연결</h3><div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-extrabold"><div className={`rounded-xl p-3 ${reservation ? "bg-sky-100 text-sky-900" : "bg-white text-[#8a8378]"}`}>예약<br />{reservation ? reservation.status : "없음(바로 방문)"}</div><div className={`rounded-xl p-3 ${diagnosis ? "bg-violet-100 text-violet-900" : "bg-white text-[#8a8378]"}`}>보컬 진단서<br />{record.subjects.includes("보컬") ? diagnosis ? "작성됨" : "미작성" : "해당 없음"}</div><div className={`rounded-xl p-3 ${consent ? "bg-emerald-100 text-emerald-900" : consentRequest && !consentRequest.revoked_at && new Date(consentRequest.expires_at).getTime() > renderedAt ? "bg-amber-100 text-amber-900" : "bg-white text-[#8a8378]"}`}>등록 동의서<br />{consent ? "완료" : consentRequest && !consentRequest.revoked_at && new Date(consentRequest.expires_at).getTime() > renderedAt ? "서명 대기 중" : "미요청"}</div></div>{reservation ? <div className="mt-3 text-sm leading-6 text-[#5f584e]"><p><strong>예약 접수:</strong> {formatCreatedAt(reservation.created_at)} · {reservation.lesson_type} · {reservation.source === "link" ? "링크" : "현장"}</p><p><strong>확정 일시:</strong> {reservation.confirmed_at ? formatCreatedAt(reservation.confirmed_at) : "미정"}</p><p><strong>예약 희망 시간:</strong> {reservation.schedule_preferences.filter((item) => item.days?.length || item.day || item.timeSlot || item.timeText).map((item) => `${item.rank}순위 ${reservationScheduleLabel(item)}`).join(" / ")}</p>{reservation.schedule_note ? <p><strong>예약 참고사항:</strong> {reservation.schedule_note}</p> : null}</div> : null}</section>
          {record.subjects.includes("보컬") ? (
            <button type="button" disabled={diagnosisBusy} onClick={onDiagnosis} className="mb-4 min-h-14 w-full rounded-[14px] bg-violet-100 px-5 text-base font-extrabold text-violet-900 disabled:opacity-50">
              {diagnosisBusy ? "진단서 여는 중…" : diagnosis ? "보컬 진단서 보기·수정" : "보컬 진단서 작성"}
            </button>
          ) : null}
          {consent ? (
            <button type="button" onClick={onConsent} className="mb-4 min-h-14 w-full rounded-[14px] bg-emerald-100 px-5 text-base font-extrabold text-emerald-900">등록 동의서 보기 · 인쇄</button>
          ) : null}
          {!consent ? <button type="button" onClick={onSignatureLink} className="mb-4 min-h-14 w-full rounded-[14px] bg-sky-100 px-5 text-base font-extrabold text-sky-900">{consentRequest && !consentRequest.revoked_at && new Date(consentRequest.expires_at).getTime() > renderedAt ? "서명 링크 재발급 · QR" : "서명 링크 만들기 · QR"}</button> : null}
          <div className="mb-6 flex gap-2 rounded-[14px] bg-[#f7f4ee] p-2">
            <button type="button" disabled={busy} onClick={() => onStatus("상담")} className={`min-h-12 flex-1 rounded-xl text-sm font-extrabold ${record.status === "상담" ? "bg-white text-amber-800 shadow-sm" : "text-[#6b6459]"}`}>상담만 함</button>
            <button type="button" disabled={busy} onClick={() => onStatus("등록")} className={`min-h-12 flex-1 rounded-xl text-sm font-extrabold ${record.status === "등록" ? "bg-[#2b2723] text-white shadow-sm" : "text-[#6b6459]"}`}>{record.status === "등록" && !consent ? "동의서 받기" : "등록함"}</button>
          </div>
          <dl className="grid grid-cols-[105px_1fr] gap-x-4 gap-y-3 text-[0.95rem] sm:grid-cols-[128px_1fr]">
            {rows.map(([label, value]) => value ? <div key={label} className="contents"><dt className="font-bold text-[#6b6459]">{label}</dt><dd className="whitespace-pre-line break-words leading-relaxed">{value}</dd></div> : null)}
          </dl>
          <section className="mt-6 rounded-[16px] bg-[#2b2723] p-4 text-white"><label htmlFor="detail-admin-memo" className="font-black">관리자 메모</label><textarea id="detail-admin-memo" value={memo} onChange={(event) => setMemo(event.target.value)} className="mt-2 min-h-[150px] w-full resize-y rounded-xl bg-white p-3 text-[#2b2723] focus:outline-none" placeholder="상담 중 기록한 관리자 메모" /><div className="mt-3 flex items-center gap-3"><button type="button" disabled={memoBusy || memo === (record.admin_memo || "")} onClick={() => void saveMemo()} className="min-h-12 rounded-xl bg-[#e8a23d] px-5 font-black text-[#2b2723] disabled:opacity-50">{memoBusy ? "저장 중…" : "메모 저장"}</button>{memoMessage ? <p className="text-sm font-bold text-[#f4cf91]">{memoMessage}</p> : null}</div></section>
          <button type="button" disabled={busy} onClick={onDelete} className="mt-5 min-h-12 w-full rounded-xl border border-red-200 bg-red-50 px-5 text-sm font-extrabold text-red-700 disabled:opacity-50">{busy ? "처리 중…" : "이 상담 기록 삭제"}</button>
        </div>
      </section>
    </div>
  );
}
