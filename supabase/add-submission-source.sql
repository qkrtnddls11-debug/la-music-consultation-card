-- 이미 운영 중인 라 실용음악학원 상담 카드 전용 프로젝트에서 한 번만 실행합니다.
-- 기존 CRM Supabase 프로젝트에서는 절대 실행하지 마세요.

alter table public.consultations
  add column if not exists submission_source text not null default 'tablet';

update public.consultations
set submission_source = 'tablet'
where submission_source not in ('tablet', 'link');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'consultations_submission_source_check'
      and conrelid = 'public.consultations'::regclass
  ) then
    alter table public.consultations
      add constraint consultations_submission_source_check
      check (submission_source in ('tablet', 'link'));
  end if;
end
$$;

grant insert (submission_source) on table public.consultations to anon;

comment on column public.consultations.submission_source is
  '상담 카드 접수 방식: tablet=현장 태블릿, link=원격 링크';
