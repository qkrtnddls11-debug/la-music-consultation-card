import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import type { ConsultationStatus } from "@/lib/types";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const body = (await request.json()) as { status?: ConsultationStatus; admin_memo?: string; assigned_teacher?: string | null };
    const hasStatus = body.status === "상담" || body.status === "등록";
    const hasMemo = typeof body.admin_memo === "string";
    const hasAssignedTeacher = typeof body.assigned_teacher === "string" || body.assigned_teacher === null;
    if (!hasStatus && !hasMemo && !hasAssignedTeacher) {
      return Response.json({ error: "상태값이 올바르지 않습니다." }, { status: 400 });
    }

    const supabase = createAdminSupabase();
    if (hasStatus && body.status === "등록") {
      const { data: consent, error: consentError } = await supabase
        .from("consents")
        .select("id")
        .eq("consultation_id", id)
        .maybeSingle();
      if (consentError) {
        return Response.json({ error: "동의서 완료 여부를 확인하지 못했습니다." }, { status: 502 });
      }
      if (!consent) {
        return Response.json({ error: "동의서와 전자서명을 먼저 완료해 주세요." }, { status: 409 });
      }
    }

    const updates: { status?: ConsultationStatus; admin_memo?: string; assigned_teacher?: string | null } = {};
    if (hasStatus) updates.status = body.status;
    if (hasMemo) updates.admin_memo = body.admin_memo!.trim().slice(0, 4000);
    if (hasAssignedTeacher) updates.assigned_teacher = typeof body.assigned_teacher === "string" && body.assigned_teacher.trim() ? body.assigned_teacher.trim().slice(0, 40) : null;
    const { error } = await supabase
      .from("consultations")
      .update(updates)
      .eq("id", id);

    if (error) {
      console.error("consultation status update failed", {
        code: error.code,
        message: error.message,
      });
      return Response.json({ error: "상태를 변경하지 못했습니다." }, { status: 502 });
    }

    return Response.json(
      { ok: true },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (error) {
    console.error("consultation status route failed", error);
    return Response.json({ error: "상태 변경 중 오류가 발생했습니다." }, { status: 500 });
  }
}

const SIGNATURE_BUCKET = "consent-signatures";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    if (!(await hasAdminSession())) {
      return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    }

    const { id } = await params;
    const supabase = createAdminSupabase();
    const { data: consultation, error: consultationError } = await supabase
      .from("consultations")
      .select("id,reservation_id")
      .eq("id", id)
      .maybeSingle();
    if (consultationError) return Response.json({ error: "상담 기록을 확인하지 못했습니다." }, { status: 502 });
    if (!consultation) return Response.json({ error: "상담 기록을 찾지 못했습니다." }, { status: 404 });

    const { data: consent, error: consentQueryError } = await supabase
      .from("consents")
      .select("id,name_trace_path,signature_path")
      .eq("consultation_id", id)
      .maybeSingle();
    if (consentQueryError) return Response.json({ error: "연결된 동의서를 확인하지 못했습니다." }, { status: 502 });

    if (consent) {
      const { error: consentDeleteError } = await supabase.from("consents").delete().eq("id", consent.id);
      if (consentDeleteError) return Response.json({ error: "연결된 동의서를 삭제하지 못했습니다." }, { status: 502 });
    }

    // 연결된 보컬 진단서도 함께 삭제한다 (상담 삭제 전에 실행해야 연결이 끊기기 전 찾을 수 있다)
    const { error: diagnosisDeleteError } = await supabase.from("vocal_diagnoses").delete().eq("consultation_id", id);
    if (diagnosisDeleteError) return Response.json({ error: "연결된 보컬 진단서를 삭제하지 못했습니다." }, { status: 502 });

    const { data: deleted, error: deleteError } = await supabase
      .from("consultations")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (deleteError) {
      console.error("consultation delete failed", { code: deleteError.code, message: deleteError.message });
      return Response.json({ error: "상담 기록을 삭제하지 못했습니다." }, { status: 502 });
    }
    if (!deleted) return Response.json({ error: "상담 기록을 찾지 못했습니다." }, { status: 404 });

    if (consent) {
      const paths = [consent.name_trace_path, consent.signature_path].filter(Boolean);
      if (paths.length > 0) {
        const { error: storageError } = await supabase.storage.from(SIGNATURE_BUCKET).remove(paths);
        if (storageError) console.error("consent signature cleanup failed", { message: storageError.message });
      }
    }

    if (consultation.reservation_id) {
      const { data: reservation } = await supabase
        .from("reservations")
        .select("confirmed_at")
        .eq("id", consultation.reservation_id)
        .maybeSingle();
      if (reservation) {
        await supabase
          .from("reservations")
          .update({ status: reservation.confirmed_at ? "확정" : "대기" })
          .eq("id", consultation.reservation_id);
      }
    }

    return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("consultation delete route failed", error);
    return Response.json({ error: "상담 기록 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
