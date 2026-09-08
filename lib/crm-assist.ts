import "server-only";

import type { ConsultationInput } from "@/lib/types";

// CRM 의 AI 통로(/api/consult-assist)를 서버에서 부른다. 상담앱에는 AI 키가 없고, 키는 CRM 에만 둔다.
// 필요한 환경변수: CRM_BASE_URL, CONSULT_ASSIST_SECRET (CRM 쪽과 같은 값)
export async function callCrmAssist<T = Record<string, unknown>>(payload: Record<string, unknown>, timeoutMs = 30000): Promise<T | null> {
  const base = (process.env.CRM_BASE_URL || "").replace(/\/+$/, "");
  const secret = (process.env.CONSULT_ASSIST_SECRET || "").trim();
  if (!base || !secret) {
    console.error("crm assist skipped: CRM_BASE_URL or CONSULT_ASSIST_SECRET missing");
    return null;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${base}/api/consult-assist`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-consult-assist-key": secret },
      body: JSON.stringify(payload),
      signal: controller.signal,
      cache: "no-store"
    });
    if (!response.ok) {
      console.error("crm assist failed", response.status);
      return null;
    }
    return await response.json() as T;
  } catch (error) {
    console.error("crm assist error", error instanceof Error ? error.message : error);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// 상담 카드를 AI 에게 보낼 글로 바꾼다. 연락처는 보내지 않는다.
export type ReservationExtras = { learning_goal?: string | null; schedule_note?: string | null };

export function consultationCardText(data: ConsultationInput, reservation?: ReservationExtras | null): string {
  const lesson = data.lesson_experience || { hasExperience: null, subjects: "", period: "" };
  const schedule = (data.schedule_preferences || [])
    .map((item) => {
      const extra = item as { timeSlot?: string; timeText?: string };
      const parts = [(item.days || []).join(","), extra.timeSlot || "", extra.timeText || ""].filter(Boolean);
      return parts.length > 0 ? `${item.rank}순위 ${parts.join(" ")}` : "";
    })
    .filter(Boolean)
    .join(" / ");
  const rows: Array<[string, string]> = [
    ["이름", data.name],
    // 예약 링크에서 학생이 직접 적은 니즈. 상담 카드보다 먼저, 가장 중요한 재료다.
    ["배우고 싶은 것(예약 때 학생이 적음)", (reservation?.learning_goal || "").trim()],
    ["예약 참고사항", (reservation?.schedule_note || "").trim()],
    ["상담 종류", data.card_type],
    ["접수 방법", data.submission_source === "link" ? "링크(집에서 직접 작성)" : "현장 태블릿"],
    ["성별", data.gender],
    ["생년월일", data.birth_date || ""],
    ["관심 과목", (data.subjects || []).join(", ")],
    ["레슨 목적", data.purpose],
    ["보컬 고민", (data.vocal_difficulties || []).join(", ")],
    ["악기 고민", (data.instrument_difficulties || []).join(", ")],
    ["악기 소지", data.has_instrument],
    ["학교", [data.school, data.school_status].filter(Boolean).join(" · ")],
    ["거주 지역", data.region],
    ["입시 유형", [data.ipsi_type, data.ipsi_period].filter(Boolean).join(" / ")],
    ["목표 학교", data.target_school],
    ["상담 내용", data.consult_content],
    ["레슨 경험", lesson.hasExperience === true ? `있음 — ${lesson.subjects || "?"} / ${lesson.period || "?"}` : lesson.hasExperience === false ? "없음" : ""],
    ["관심 곡·장르", data.genre_song],
    ["궁금한 점", data.question],
    ["유입 경로", data.referral_source === "지인추천" ? `지인추천 (${data.referral_name || "?"})` : data.referral_source],
    ["가능 스케줄", schedule],
    ["시작 가능", data.start_available],
    ["기타 참고", data.etc_memo]
  ];
  return rows.filter(([, value]) => (value || "").trim() !== "").map(([label, value]) => `${label}: ${value}`).join("\n");
}

// 제출된 카드의 요약을 받는다. 실패하면 null (제출 자체는 막지 않는다).
export async function requestConsultationSummary(data: ConsultationInput, reservation?: ReservationExtras | null): Promise<string | null> {
  const result = await callCrmAssist<{ ok?: boolean; text?: string; reason?: string }>({
    branch: data.branch_name,
    task: "summarize_card",
    card: consultationCardText(data, reservation)
  });
  if (!result?.ok || !result.text) {
    if (result?.reason) console.error("consultation summary refused", result.reason);
    return null;
  }
  return result.text.trim().slice(0, 2000) || null;
}
