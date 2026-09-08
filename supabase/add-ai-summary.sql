-- 상담 카드 AI 요약 (2026-09-08)
-- 학생이 상담 카드를 제출하면 CRM 통로(OpenAI)로 요약을 만들어 저장하고, 관리자 화면 맨 위에 「AI 한눈에 보기」로 보여준다.
-- 실행: 상담 앱 Supabase → SQL Editor → Run

alter table public.consultations add column if not exists ai_summary text;
comment on column public.consultations.ai_summary is '제출 직후 AI가 만든 상담 카드 요약. 관리자가 「다시 만들기」로 갱신할 수 있다';

-- 링크(익명) 제출도 요약을 붙이려면 서버가 정한 id 로 저장해야 한다. 태블릿·링크 계정에 id 칸 입력만 추가로 허용한다.
grant insert (id) on table public.consultations to anon;
