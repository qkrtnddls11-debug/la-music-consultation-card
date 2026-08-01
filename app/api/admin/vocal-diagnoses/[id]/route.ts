import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import { normalizeVocalDiagnosis, vocalDiagnosisDatabasePayload } from "@/lib/vocal-diagnosis-validation";
import type { VocalDiagnosisInput } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const { data, error } = await createAdminSupabase()
      .from("vocal_diagnoses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("vocal diagnosis query failed", { code: error.code, message: error.message });
      return Response.json({ error: "진단서를 불러오지 못했습니다." }, { status: 502 });
    }
    if (!data) return Response.json({ error: "진단서를 찾지 못했습니다." }, { status: 404 });
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("vocal diagnosis detail route failed", error);
    return Response.json({ error: "진단서를 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as Partial<VocalDiagnosisInput>;
    const supabase = createAdminSupabase();
    const { data: existing, error: existingError } = await supabase
      .from("vocal_diagnoses")
      .select("*")
      .eq("id", id)
      .maybeSingle();

    if (existingError) {
      console.error("vocal diagnosis pre-update query failed", { code: existingError.code, message: existingError.message });
      return Response.json({ error: "진단서를 확인하지 못했습니다." }, { status: 502 });
    }
    if (!existing) return Response.json({ error: "진단서를 찾지 못했습니다." }, { status: 404 });

    const normalized = normalizeVocalDiagnosis({
      ...existing,
      ...body,
      consultation_id: existing.consultation_id,
      student_name: existing.consultation_id ? existing.student_name : body.student_name ?? existing.student_name,
    });
    if ("error" in normalized) {
      return Response.json({ error: normalized.error }, { status: 400 });
    }

    const { consultation_id: _consultationId, ...updates } = vocalDiagnosisDatabasePayload(normalized.data);
    void _consultationId;
    const { data, error } = await supabase
      .from("vocal_diagnoses")
      .update(updates)
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      console.error("vocal diagnosis update failed", { code: error.code, message: error.message });
      return Response.json({ error: "진단서를 저장하지 못했습니다." }, { status: 502 });
    }

    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("vocal diagnosis update route failed", error);
    return Response.json({ error: "진단서를 저장하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
