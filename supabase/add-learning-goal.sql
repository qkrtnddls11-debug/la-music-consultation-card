-- 예약 링크에서 「배우고 싶은 것」 받기 (2026-09-08)
-- 이름·전화·과목·시간만 받던 예약 폼에, 학생이 무엇을 왜 배우고 싶은지 한 줄이라도 적는 칸을 추가한다.
-- 상담 카드 AI 요약과 CRM 상담 카드 메모가 이 내용을 재료로 쓴다.
-- 실행: 상담 앱 Supabase → SQL Editor → Run

alter table public.reservations add column if not exists learning_goal text;
comment on column public.reservations.learning_goal is '예약 때 학생이 적은 배우고 싶은 것(고른 문구 + 직접 쓴 글)';
grant insert (learning_goal) on table public.reservations to anon;
