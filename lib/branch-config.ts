import "server-only";

import { createAdminSupabase } from "@/lib/supabase-server";
import { DEFAULT_BRANCH, SUBJECT_OPTIONS } from "@/lib/types";

// 지점별 과목 목록은 CRM 지점관리에 저장된 값을 그대로 쓴다.
// (CRM이 crm_schedule_options.subjects 에 주기적으로 채워 넣는다)
export async function loadBranchSubjects(branch = DEFAULT_BRANCH): Promise<string[]> {
  try {
    const { data, error } = await createAdminSupabase()
      .from("crm_schedule_options")
      .select("subjects")
      .eq("branch_name", branch)
      .maybeSingle();
    if (error || !Array.isArray(data?.subjects) || data.subjects.length === 0) {
      return [...SUBJECT_OPTIONS];
    }
    return data.subjects.map(String).filter(Boolean);
  } catch {
    return [...SUBJECT_OPTIONS];
  }
}

export const DEFAULT_LINK_MESSAGE = `원활한 상담 진행을 위해 아래 링크에서 상담 예약 정보를 작성해 주시면 감사하겠습니다^^

{{링크}}

작성해 주시면 확인 후 빠르게 일정 잡아드릴게요!
최대한 맞춰드리려고 하지만, 선생님 스케줄에 따라 조정이 필요할 수도 있는 점 양해 부탁드립니다. 감사합니다!`;

export type BranchRulesDocument = {
  hasCustom: boolean;
  url: string | null;
  name: string | null;
  type: string | null;
  version: string;
};

// 지점이 올린 학원규칙 문서. 없으면 기본판(코드에 들어 있는 우리 규칙)을 쓴다.
export async function loadBranchRulesDocument(branch = DEFAULT_BRANCH): Promise<BranchRulesDocument> {
  const fallback: BranchRulesDocument = { hasCustom: false, url: null, name: null, type: null, version: "기본판 2024-04-01" };
  try {
    const supabase = createAdminSupabase();
    // 기록은 DB 테이블 없이 저장소의 meta.json에 있다 (branch-documents 라우트와 같은 규칙).
    const folder = `b-${Buffer.from(branch, "utf8").toString("hex").slice(0, 40)}`;
    const { data: metaFile, error: metaError } = await supabase.storage.from("branch-documents").download(`${folder}/meta.json`);
    if (metaError || !metaFile) return fallback;
    const meta = JSON.parse(await metaFile.text()) as { path?: string; name?: string; type?: string; updatedAt?: string };
    if (!meta.path) return fallback;

    const { data: signed, error: signedError } = await supabase.storage.from("branch-documents").createSignedUrl(meta.path, 60 * 60);
    if (signedError || !signed?.signedUrl) return fallback;
    return {
      hasCustom: true,
      url: signed.signedUrl,
      name: meta.name || "학원규칙 동의서",
      type: meta.type || "application/pdf",
      version: `업로드판 ${(meta.updatedAt || "").slice(0, 10)}`.trim()
    };
  } catch {
    return fallback;
  }
}
