import { normalizeReservation } from "@/lib/reservation-validation";
import { createAnonymousSupabase } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const normalized = normalizeReservation(await request.json());
    if (!normalized.data) return Response.json({ error: normalized.error }, { status: 400 });

    const anonymous = createAnonymousSupabase();
    let { error } = await anonymous.from("reservations").insert(normalized.data);
    if (error && /learning_goal/.test(error.message)) {
      // learning_goal 칸·권한 SQL 을 아직 안 돌린 경우: 그 칸만 빼고 저장한다
      console.error("reservation insert without learning_goal (run add-learning-goal.sql)", { code: error.code, message: error.message });
      const { learning_goal: _dropped, ...withoutGoal } = normalized.data;
      void _dropped;
      ({ error } = await anonymous.from("reservations").insert(withoutGoal));
    }
    if (error) {
      console.error("reservation insert failed", { code: error.code, message: error.message });
      return Response.json({ error: "예약 정보를 저장하지 못했습니다. 잠시 후 다시 눌러 주세요." }, { status: 502 });
    }
    return Response.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("reservation route failed", error);
    return Response.json({ error: "예약 저장 설정을 확인해 주세요." }, { status: 500 });
  }
}
