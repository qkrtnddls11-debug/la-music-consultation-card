import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase-server";

const BUCKET = "consent-signatures";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    }
    const { id } = await params;
    const supabase = createAdminSupabase();
    const { data, error } = await supabase.from("consents").select("*").eq("id", id).maybeSingle();
    if (error) {
      console.error("consent detail query failed", { code: error.code, message: error.message });
      return Response.json({ error: "동의서를 불러오지 못했습니다." }, { status: 502 });
    }
    if (!data) return Response.json({ error: "동의서를 찾지 못했습니다." }, { status: 404 });

    const [trace, signature] = await Promise.all([
      supabase.storage.from(BUCKET).createSignedUrl(data.name_trace_path, 600),
      supabase.storage.from(BUCKET).createSignedUrl(data.signature_path, 600),
    ]);
    if (trace.error || signature.error) {
      return Response.json({ error: "서명 이미지를 불러오지 못했습니다." }, { status: 502 });
    }
    return Response.json({
      ...data,
      name_trace_url: trace.data.signedUrl,
      signature_url: signature.data.signedUrl,
    }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("consent detail route failed", error);
    return Response.json({ error: "동의서를 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
