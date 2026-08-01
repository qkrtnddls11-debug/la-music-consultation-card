import { hasAdminSession } from "@/lib/admin-auth";
import { createConsent } from "@/lib/consent-service";
import { createAdminSupabase } from "@/lib/supabase-server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function clean(value: unknown, limit = 160) {
  return typeof value === "string" ? value.trim().slice(0, limit) : "";
}

export async function GET() {
  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    const { data, error } = await createAdminSupabase()
      .from("consents")
      .select("id,created_at,consultation_id,signer_name,signer_role,rules_agreed,required_info_agreed,unique_identifier_consent,optional_info_consent,marketing_consent,is_minor,guardian_name,guardian_phone,guardian_relationship,agreed_at")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) {
      console.error("consents query failed", { code: error.code, message: error.message });
      return Response.json({ error: "동의서 목록을 불러오지 못했습니다." }, { status: 502 });
    }
    return Response.json(data ?? [], { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("consents route failed", error);
    return Response.json({ error: "동의서 저장소 설정을 확인해 주세요." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = await request.json() as Record<string, unknown>;
    const consultationId = clean(body.consultation_id, 40);
    if (!UUID_PATTERN.test(consultationId)) {
      return Response.json({ error: "상담 연결 정보가 올바르지 않습니다." }, { status: 400 });
    }
    const result = await createConsent(body, consultationId);
    if ("error" in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result.data, { status: result.status, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("consent create route failed", error);
    return Response.json({ error: "동의서를 저장하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
