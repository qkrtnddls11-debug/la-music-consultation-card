-- 이미 운영 중인 라 실용음악학원 상담 카드 전용 프로젝트에서 한 번만 실행합니다.
-- 기존 CRM Supabase 프로젝트에서는 절대 실행하지 마세요.

alter table public.consultations
  add column if not exists instrument_difficulties text[] not null default '{}';

grant insert (instrument_difficulties) on table public.consultations to anon;

comment on column public.consultations.instrument_difficulties is
  '악기 과목에서 어렵거나 도움받고 싶은 부분(복수 선택)';
