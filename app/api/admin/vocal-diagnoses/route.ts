import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import { normalizeVocalDiagnosis, vocalDiagnosisDatabasePayload } from "@/lib/vocal-diagnosis-validation";
import type { VocalDiagnosisInput } from "@/lib/types";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET() {
  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { data, error } = await createAdminSupabase()
      .from("vocal_diagnoses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("vocal diagnoses query failed", { code: error.code, message: error.message });
      return Response.json({ error: "진단서 목록을 불러오지 못했습니다." }, { status: 502 });
    }

    return Response.json(data ?? [], { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("vocal diagnoses route failed", error);
    return Response.json({ error: "진단서 저장소 설정을 확인해 주세요." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const body = (await request.json()) as Partial<VocalDiagnosisInput>;
    const supabase = createAdminSupabase();
    let consultationId: string | null = null;
    let studentName = body.student_name;
    let linkedBranchName: string | null = null;

    if (body.consultation_id) {
      if (!UUID_PATTERN.test(body.consultation_id)) {
        return Response.json({ error: "상담 연결 정보가 올바르지 않습니다." }, { status: 400 });
      }
      consultationId = body.consultation_id;

      const { data: consultation, error: consultationError } = await supabase
        .from("consultations")
        .select("id,name,subjects,branch_name")
        .eq("id", consultationId)
        .maybeSingle();

      if (consultationError || !consultation) {
        return Response.json({ error: "연결할 상담 카드를 찾지 못했습니다." }, { status: 404 });
      }
      if (!Array.isArray(consultation.subjects) || !consultation.subjects.includes("보컬")) {
        return Response.json({ error: "보컬 과목 상담만 진단서와 연결할 수 있습니다." }, { status: 400 });
      }

      const { data: existing, error: existingError } = await supabase
        .from("vocal_diagnoses")
        .select("*")
        .eq("consultation_id", consultationId)
        .maybeSingle();
      if (existingError) {
        console.error("existing vocal diagnosis query failed", { code: existingError.code, message: existingError.message });
        return Response.json({ error: "기존 진단서를 확인하지 못했습니다." }, { status: 502 });
      }
      if (existing) {
        return Response.json(existing, { headers: { "Cache-Control": "private, no-store" } });
      }
      studentName = consultation.name;
      linkedBranchName = (consultation as { branch_name?: string | null }).branch_name || null;
    }

    const normalized = normalizeVocalDiagnosis({ ...body, consultation_id: consultationId, student_name: studentName });
    if ("error" in normalized) {
      return Response.json({ error: normalized.error }, { status: 400 });
    }

    const { data, error } = await supabase
      .from("vocal_diagnoses")
      .insert({
        ...vocalDiagnosisDatabasePayload(normalized.data),
        ...(linkedBranchName ? { branch_name: linkedBranchName } : {})
      })
      .select("*")
      .single();

    if (error) {
      console.error("vocal diagnosis insert failed", { code: error.code, message: error.message });
      return Response.json({ error: "진단서를 만들지 못했습니다." }, { status: 502 });
    }

    return Response.json(data, {
      status: 201,
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (error) {
    console.error("vocal diagnosis create route failed", error);
    return Response.json({ error: "진단서를 만드는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
