-- 라 실용음악학원 상담 카드 전용 Supabase 프로젝트에서만 실행하세요.
-- 기존 CRM Supabase 프로젝트에서는 절대 실행하지 마세요.

create table if not exists public.vocal_diagnoses (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  consultation_id uuid unique references public.consultations(id) on delete set null,
  student_name text not null check (char_length(student_name) between 1 and 80),
  confirmation_notes text not null default '',
  pitch_level text check (pitch_level in ('상', '중상', '중', '중하', '하')),
  pitch_memo text not null default '',
  rhythm_level text check (rhythm_level in ('상', '중상', '중', '중하', '하')),
  rhythm_memo text not null default '',
  breath_level text check (breath_level in ('상', '중상', '중', '중하', '하')),
  breath_memo text not null default '',
  breath_exercise_seconds integer check (breath_exercise_seconds between 0 and 999),
  phonation_level text check (phonation_level in ('상', '중상', '중', '중하', '하')),
  phonation_memo text not null default '',
  chest_low_note text not null default '',
  chest_high_note text not null default '',
  falsetto_low_note text not null default '',
  falsetto_high_note text not null default '',
  performance_level text check (performance_level in ('상', '중상', '중', '중하', '하')),
  performance_memo text not null default '',
  other_notes text not null default '',
  lesson_direction text not null default ''
);

create index if not exists vocal_diagnoses_created_at_idx on public.vocal_diagnoses (created_at desc);
create index if not exists vocal_diagnoses_updated_at_idx on public.vocal_diagnoses (updated_at desc);

create or replace function public.touch_vocal_diagnosis_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists vocal_diagnoses_touch_updated_at on public.vocal_diagnoses;
create trigger vocal_diagnoses_touch_updated_at
before update on public.vocal_diagnoses
for each row execute function public.touch_vocal_diagnosis_updated_at();

alter table public.vocal_diagnoses enable row level security;
revoke all on table public.vocal_diagnoses from anon, authenticated;
grant all on table public.vocal_diagnoses to service_role;

comment on table public.vocal_diagnoses is
  '라 실용음악학원 보컬 첫수업 진단서 — 관리자 전용';
