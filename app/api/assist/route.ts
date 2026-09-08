import { hasAdminSession } from "@/lib/admin-auth";
import { DEFAULT_BRANCH } from "@/lib/types";

// 체험수업 배정 도우미. 답은 CRM이 계산한다.
// 강사 가능 시간·빈 강의실 규칙을 여기서 또 계산하면 두 화면의 답이 갈리기 때문에,
// 질문만 그대로 넘기고 결과를 받아 보여준다.
// 필요한 환경변수: CRM_BASE_URL, CONSULT_ASSIST_SECRET (CRM 쪽과 같은 값)
export async function POST(request: Request) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });

    const base = (process.env.CRM_BASE_URL || "").replace(/\/+$/, "");
    const secret = (process.env.CONSULT_ASSIST_SECRET || "").trim();
    if (!base || !secret) {
      return Response.json({ error: "CRM_BASE_URL 또는 CONSULT_ASSIST_SECRET 환경변수가 없습니다." }, { status: 503 });
    }

    const body = await request.json().catch(() => ({}));
    const payload = {
      branch: String(body.branch || "").trim() || DEFAULT_BRANCH,
      question: String(body.question || "").slice(0, 500),
      date: String(body.date || ""),
      subject: String(body.subject || ""),
      fromTime: String(body.fromTime || ""),
      toTime: String(body.toTime || ""),
      today: new Date().toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" }),
      // 관리자 메모 정리: 메모와 학생 기본 정보만 넘긴다 (연락처는 보내지 않는다)
      ...(body.task === "tidy_memo" ? {
        task: "tidy_memo",
        memo: String(body.memo || "").slice(0, 4000),
        student: {
          name: String(body.student?.name || "").slice(0, 40),
          subjects: Array.isArray(body.student?.subjects) ? body.student.subjects.map(String).slice(0, 8) : [],
          cardType: String(body.student?.cardType || "").slice(0, 10),
          purpose: String(body.student?.purpose || "").slice(0, 100)
        }
      } : {})
    };

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
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
        return Response.json({ error: "CRM에 물어보지 못했습니다. 잠시 후 다시 시도해주세요." }, { status: 502 });
      }
      return Response.json(await response.json(), { headers: { "Cache-Control": "private, no-store" } });
    } finally {
      clearTimeout(timer);
    }
  } catch (error) {
    console.error("assist route failed", error);
    return Response.json({ error: "도우미를 부르는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
