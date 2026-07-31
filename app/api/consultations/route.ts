import { normalizeConsultation } from "@/lib/consultation-validation";
import { createAnonymousSupabase } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const validation = normalizeConsultation(await request.json());
    if (!validation.data) {
      return Response.json({ error: validation.error }, { status: 400 });
    }

    const { error } = await createAnonymousSupabase()
      .from("consultations")
      .insert(validation.data);

    if (error) {
      console.error("consultation insert failed", {
        code: error.code,
        message: error.message,
      });
      return Response.json(
        { error: "저장하지 못했습니다. 잠시 후 다시 눌러 주세요." },
        { status: 502 },
      );
    }

    return Response.json(
      { ok: true },
      { status: 201, headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    console.error("consultation route failed", error);
    return Response.json(
      { error: "저장 설정을 확인해 주세요." },
      { status: 500 },
    );
  }
}
