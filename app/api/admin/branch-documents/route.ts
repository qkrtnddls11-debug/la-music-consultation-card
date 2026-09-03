import { hasAdminSession } from "@/lib/admin-auth";
import { createAdminSupabase } from "@/lib/supabase-server";
import { DEFAULT_BRANCH } from "@/lib/types";

const BUCKET = "branch-documents";

// 저장소는 한글·공백이 든 경로(key)를 거부한다 ("Invalid key: 수원 망포점/…" 오류의 원인).
// 지점명을 영문 16진수 폴더명으로 바꿔 안전한 경로를 만든다.
function branchFolder(branch: string) {
  return `b-${Buffer.from(branch, "utf8").toString("hex").slice(0, 40)}`;
}
const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = new Map<string, string>([
  ["application/pdf", "pdf"],
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"]
]);

// 지점별 학원규칙 동의서 파일 업로드 / 삭제 (서명 절차는 시스템 고정, 문서만 교체된다)
// 업로드는 2단계: ① sign — 저장소 직행 업로드 주소 발급 ② commit — 업로드 완료 기록.
// 서버를 거쳐 파일을 받으면 Vercel 4.5MB 한도에 걸려 폰 사진·스캔 PDF가 실패한다 (2026-09-02 타지점 오류 원인).
export async function POST(request: Request) {
  try {
    if (!(await hasAdminSession())) return Response.json({ error: "인증이 필요합니다." }, { status: 401 });

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.json() as {
        action?: string; branch?: string; fileName?: string; fileType?: string; fileSize?: number; path?: string;
      };
      const branch = String(body.branch || "").trim() || DEFAULT_BRANCH;
      const supabase = createAdminSupabase();

      if (body.action === "sign") {
        const extension = ALLOWED.get(String(body.fileType || ""));
        if (!extension) {
          const isHeic = /heic|heif/i.test(String(body.fileType || "") + String(body.fileName || ""));
          return Response.json({
            error: isHeic
              ? "아이폰 HEIC 사진은 올릴 수 없습니다. 사진 공유 시 'JPEG로 보내기'를 선택하거나 PDF로 올려주세요."
              : "PDF 또는 이미지(PNG·JPG) 파일만 올릴 수 있습니다."
          }, { status: 400 });
        }
        if ((Number(body.fileSize) || 0) > MAX_BYTES) {
          return Response.json({ error: "파일 용량은 10MB까지 가능합니다." }, { status: 400 });
        }
        const path = `${branchFolder(branch)}/rules-${Date.now()}.${extension}`;
        let signResult = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
        if (signResult.error) {
          // 버킷이 아직 없으면 만들어서 한 번 더 시도한다 (최초 1회 자가 설치).
          await supabase.storage.createBucket(BUCKET, { public: false }).catch(() => undefined);
          signResult = await supabase.storage.from(BUCKET).createSignedUploadUrl(path);
        }
        if (signResult.error || !signResult.data?.token) {
          console.error("branch document sign failed", signResult.error?.message);
          return Response.json({ error: `업로드 주소를 만들지 못했습니다. (${signResult.error?.message || "원인 미상"})` }, { status: 502 });
        }
        // 공식 방식: 브라우저는 supabase-js uploadToSignedUrl(path, token, file)로 올린다.
        return Response.json({ ok: true, path, token: signResult.data.token });
      }

      if (body.action === "commit") {
        const path = String(body.path || "");
        if (!path.startsWith(`${branchFolder(branch)}/`)) {
          return Response.json({ error: "업로드 경로가 올바르지 않습니다." }, { status: 400 });
        }
        const { data: existing } = await supabase.from("branch_settings").select("rules_document_path").eq("branch_name", branch).maybeSingle();
        const updatedAt = new Date().toISOString();
        const { error: saveError } = await supabase.from("branch_settings").upsert({
          branch_name: branch,
          rules_document_path: path,
          rules_document_name: String(body.fileName || "규칙 문서").slice(0, 200),
          rules_document_type: String(body.fileType || ""),
          rules_document_updated_at: updatedAt,
          updated_at: updatedAt
        }, { onConflict: "branch_name" });
        if (saveError) {
          await supabase.storage.from(BUCKET).remove([path]).catch(() => undefined);
          console.error("branch document save failed", saveError.message);
          return Response.json({ error: "파일 정보를 저장하지 못했습니다." }, { status: 502 });
        }
        const previousPath = (existing as { rules_document_path?: string | null } | null)?.rules_document_path;
        if (previousPath && previousPath !== path) await supabase.storage.from(BUCKET).remove([previousPath]).catch(() => undefined);
        return Response.json({ ok: true, name: body.fileName || "규칙 문서", updatedAt });
      }

      return Response.json({ error: "지원하지 않는 요청입니다." }, { status: 400 });
    }

    // (구버전 화면 호환) 서버 경유 업로드 — 4.5MB 이하 파일만 도달 가능
    const form = await request.formData();
    const branch = String(form.get("branch") || "").trim() || DEFAULT_BRANCH;
    const file = form.get("file");
    if (!(file instanceof File)) return Response.json({ error: "파일을 선택해 주세요." }, { status: 400 });
    const extension = ALLOWED.get(file.type);
    if (!extension) return Response.json({ error: "PDF 또는 이미지(PNG·JPG) 파일만 올릴 수 있습니다." }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: "파일 용량은 10MB까지 가능합니다." }, { status: 400 });

    const supabase = createAdminSupabase();
    const { data: existing } = await supabase.from("branch_settings").select("rules_document_path").eq("branch_name", branch).maybeSingle();

    const path = `${branchFolder(branch)}/rules-${Date.now()}.${extension}`;
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
