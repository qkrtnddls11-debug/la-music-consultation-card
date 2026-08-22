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
