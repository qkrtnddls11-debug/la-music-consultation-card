import { loadBranchRulesDocument } from "@/lib/branch-config";
import { DEFAULT_BRANCH } from "@/lib/types";

// 동의서 화면에서 지점 규칙 문서를 불러온다 (서명 링크는 로그인 없이 열리므로 공개 조회)
export async function GET(request: Request) {
  const branch = new URL(request.url).searchParams.get("branch")?.trim() || DEFAULT_BRANCH;
  const document = await loadBranchRulesDocument(branch);
  return Response.json(document, { headers: { "Cache-Control": "no-store" } });
}
