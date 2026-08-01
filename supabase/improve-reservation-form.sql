-- 라 실용음악학원 상담 카드 전용 Supabase 프로젝트에서만 실행하세요.
-- 기존 CRM Supabase 프로젝트에서는 절대 실행하지 마세요.

alter table public.reservations
  add column if not exists schedule_note text not null default '';

grant insert (schedule_note) on table public.reservations to anon;

comment on column public.reservations.schedule_note is
  '체험수업 가능 시간대에 대한 자유 참고사항';
