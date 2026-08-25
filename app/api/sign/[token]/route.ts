import { createConsent } from "@/lib/consent-service";
import { hashConsentRequestToken, validConsentRequestToken } from "@/lib/consent-request-token";
import { createAdminSupabase } from "@/lib/supabase-server";

async function activeRequest(token: string) {
  if (!validConsentRequestToken(token)) return { error: "유효하지 않은 서명 링크입니다.", status: 404 } as const;
  const { data, error } = await createAdminSupabase().from("consent_requests").select("id,consultation_id,expires_at,completed_at,revoked_at").eq("token_hash", hashConsentRequestToken(token)).maybeSingle();
  if (error || !data) return { error: "유효하지 않은 서명 링크입니다.", status: 404 } as const;
  if (data.completed_at || data.revoked_at) return { error: "이미 완료되었거나 재발급되어 사용할 수 없는 링크입니다.", status: 410 } as const;
  if (new Date(data.expires_at).getTime() <= Date.now()) return { error: "서명 링크의 24시간 유효기간이 지났습니다. 학원에 재발급을 요청해 주세요.", status: 410 } as const;
  return { data } as const;
}

export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const requestResult = await activeRequest(token);
    if ("error" in requestResult) return Response.json({ error: requestResult.error }, { status: requestResult.status });
    const { data, error } = await createAdminSupabase().from("consultations").select("id,name,birth_date,student_phone,parent_phone,branch_name,school,gender").eq("id", requestResult.data.consultation_id).maybeSingle();
    if (error || !data) return Response.json({ error: "연결된 상담 카드를 찾지 못했습니다." }, { status: 404 });
    return Response.json({ consultation: data, expires_at: requestResult.data.expires_at }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("public consent request lookup failed", error);
    return Response.json({ error: "서명 링크를 확인하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const requestResult = await activeRequest(token);
    if ("error" in requestResult) return Response.json({ error: requestResult.error }, { status: requestResult.status });
    const result = await createConsent(await request.json() as Record<string, unknown>, requestResult.data.consultation_id, requestResult.data.id);
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.data, { status: result.status, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("public consent submission failed", error);
    return Response.json({ error: "동의서를 저장하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
