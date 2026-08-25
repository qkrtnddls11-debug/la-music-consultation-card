import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import { DEFAULT_BRANCH } from "@/lib/types";

const BUCKET = "branch-documents";
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"]
]);

// 지점별 학원규칙 동의서 파일 업로드 / 삭제 (서명 절차는 시스템 고정, 문서만 교체된다)
export async function POST(request: Request) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const form = await request.formData();
    const branch = String(form.get("branch") || "").trim() || DEFAULT_BRANCH;
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "파일을 선택해 주세요." }, { status: 400 });
    const extension = ALLOWED.get(file.type);
    if (!extension) return Response.json({ error: "PDF 또는 이미지(PNG·JPG) 파일만 올릴 수 있습니다." }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: "파일 용량은 10MB까지 가능합니다." }, { status: 400 });

    const supabase = createAdminSupabase();
    const { data: existing } = await supabase.from("branch_settings").select("rules_document_path").eq("branch_name", branch).maybeSingle();

    const path = `${encodeURIComponent(branch)}/rules-${Date.now()}.${extension}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType: file.type, cacheControl: "0", upsert: false });
    if (uploadError) {
      console.error("branch document upload failed", uploadError.message);
      return Response.json({ error: "파일을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요." }, { status: 502 });
    }

    const updatedAt = new Date().toISOString();
    const { error: saveError } = await supabase.from("branch_settings").upsert({
      branch_name: branch,
      rules_document_path: path,
      rules_document_name: file.name.slice(0, 200),
      rules_document_type: file.type,
      rules_document_updated_at: updatedAt,
      updated_at: updatedAt
    }, { onConflict: "branch_name" });
    if (saveError) {
      await supabase.storage.from(BUCKET).remove([path]);
      console.error("branch document save failed", saveError.message);
      return Response.json({ error: "파일 정보를 저장하지 못했습니다." }, { status: 502 });
    }

    // 이전 파일은 정리 (실패해도 새 파일 사용에는 지장 없음)
    const previousPath = (existing as { rules_document_path?: string | null } | null)?.rules_document_path;
    if (previousPath && previousPath !== path) await supabase.storage.from(BUCKET).remove([previousPath]).catch(() => undefined);

    return Response.json({ ok: true, name: file.name, updatedAt });
  } catch (error) {
    console.error("branch document route failed", error);
    return Response.json({ error: "파일을 올리는 중 오류가 발생했습니다." }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });
    const branch = new URL(request.url).searchParams.get("branch")?.trim() || DEFAULT_BRANCH;
    const supabase = createAdminSupabase();
    const { data } = await supabase.from("branch_settings").select("rules_document_path").eq("branch_name", branch).maybeSingle();
    const path = (data as { rules_document_path?: string | null } | null)?.rules_document_path;

    const { error } = await supabase.from("branch_settings").upsert({
      branch_name: branch,
      rules_document_path: null,
      rules_document_name: null,
      rules_document_type: null,
      rules_document_updated_at: null,
      updated_at: new Date().toISOString()
    }, { onConflict: "branch_name" });
    if (error) return Response.json({ error: "기본판으로 되돌리지 못했습니다." }, { status: 502 });
    if (path) await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined);
    return Response.json({ ok: true });
  } catch (error) {
    console.error("branch document delete failed", error);
    return Response.json({ error: "되돌리는 중 오류가 발생했습니다." }, { status: 500 });
  }
}
