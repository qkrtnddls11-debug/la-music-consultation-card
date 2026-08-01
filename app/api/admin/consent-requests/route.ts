import { hasAdminSession } from "@/lib/admin-auth";
import { createConsentRequestToken, hashConsentRequestToken } from "@/lib/consent-request-token";
import { createAdminSupabase } from "@/lib/supabase-server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { data, error } = await createAdminSupabase().from("consent_requests").select("id,created_at,consultation_id,expires_at,completed_at,revoked_at").order("created_at", { ascending: false }).limit(1000);
    if (error) return Response.json({ error: "서명 요청 상태를 불러오지 못했습니다." }, { status: 502 });
    return Response.json(data ?? [], { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("consent requests list failed", error);
    return Response.json({ error: "서명 요청 저장소 설정을 확인해 주세요." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const body = await request.json() as { consultation_id?: string };
    const consultationId = typeof body.consultation_id === "string" ? body.consultation_id : "";
    if (!UUID_PATTERN.test(consultationId)) return Response.json({ error: "상담 연결 정보가 올바르지 않습니다." }, { status: 400 });
    const supabase = createAdminSupabase();
    const [{ data: consultation }, { data: consent }] = await Promise.all([
      supabase.from("consultations").select("id,name").eq("id", consultationId).maybeSingle(),
      supabase.from("consents").select("id").eq("consultation_id", consultationId).maybeSingle(),
    ]);
    if (!consultation) return Response.json({ error: "상담 카드를 찾지 못했습니다." }, { status: 404 });
    if (consent) return Response.json({ error: "이미 동의서가 완료되었습니다." }, { status: 409 });

    const now = new Date().toISOString();
    await supabase.from("consent_requests").update({ revoked_at: now }).eq("consultation_id", consultationId).is("completed_at", null).is("revoked_at", null);
    const token = createConsentRequestToken();
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const { data, error } = await supabase.from("consent_requests").insert({ consultation_id: consultationId, token_hash: hashConsentRequestToken(token), expires_at: expiresAt }).select("id,created_at,consultation_id,expires_at,completed_at,revoked_at").single();
    if (error || !data) return Response.json({ error: "서명 링크를 만들지 못했습니다." }, { status: 502 });
    return Response.json({ ...data, token }, { status: 201, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("consent request create failed", error);
    return Response.json({ error: "서명 링크를 만드는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
