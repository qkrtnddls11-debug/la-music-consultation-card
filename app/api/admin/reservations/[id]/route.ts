import { hasAdminSession } from "@/lib/admin-auth";
import { validReservationId } from "@/lib/reservation-validation";
import { createAdminSupabase } from "@/lib/supabase-server";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { id } = await params;
    if (!validReservationId(id)) return Response.json({ error: "예약 번호가 올바르지 않습니다." }, { status: 400 });
    const { data, error } = await createAdminSupabase().from("reservations").select("*").eq("id", id).maybeSingle();
    if (error) return Response.json({ error: "예약을 불러오지 못했습니다." }, { status: 502 });
    if (!data) return Response.json({ error: "예약을 찾지 못했습니다." }, { status: 404 });
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("reservation detail route failed", error);
    return Response.json({ error: "예약을 불러오는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { id } = await params;
    if (!validReservationId(id)) return Response.json({ error: "예약 번호가 올바르지 않습니다." }, { status: 400 });
    const body = await request.json() as { confirmed_at?: string | null };
    const confirmedAt = typeof body.confirmed_at === "string" && body.confirmed_at ? new Date(body.confirmed_at) : null;
    if (confirmedAt && Number.isNaN(confirmedAt.getTime())) return Response.json({ error: "확정 일시가 올바르지 않습니다." }, { status: 400 });

    const supabase = createAdminSupabase();
    const { data: existing } = await supabase.from("reservations").select("status").eq("id", id).maybeSingle();
    if (!existing) return Response.json({ error: "예약을 찾지 못했습니다." }, { status: 404 });
    const status = existing.status === "상담완료" ? "상담완료" : confirmedAt ? "확정" : "대기";
    const { data, error } = await supabase.from("reservations").update({ confirmed_at: confirmedAt?.toISOString() ?? null, status }).eq("id", id).select("*").single();
    if (error) return Response.json({ error: "확정 일시를 저장하지 못했습니다." }, { status: 502 });
    return Response.json(data, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("reservation update route failed", error);
    return Response.json({ error: "예약을 수정하는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const { id } = await params;
    if (!validReservationId(id)) return Response.json({ error: "예약 번호가 올바르지 않습니다." }, { status: 400 });

    const { data, error } = await createAdminSupabase()
      .from("reservations")
      .delete()
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      console.error("reservation delete failed", { code: error.code, message: error.message });
      return Response.json({ error: "예약을 삭제하지 못했습니다." }, { status: 502 });
    }
    if (!data) return Response.json({ error: "예약을 찾지 못했습니다." }, { status: 404 });
    return Response.json({ ok: true }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("reservation delete route failed", error);
    return Response.json({ error: "예약 삭제 중 오류가 발생했습니다." }, { status: 500 });
  }
}
