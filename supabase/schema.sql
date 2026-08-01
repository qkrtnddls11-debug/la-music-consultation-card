-- 라 실용음악학원 상담 카드 전용 Supabase 프로젝트에서만 실행하세요.
-- 기존 CRM 프로젝트에서는 절대 실행하지 마세요.

create extension if not exists pgcrypto;

create type public.consultation_card_type as enum ('일반', '입시');
create type public.consultation_status as enum ('상담', '등록');

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  card_type public.consultation_card_type not null,
  submission_source text not null default 'tablet' check (submission_source in ('tablet', 'link')),
  name text not null check (char_length(name) between 1 and 80),
  birth_date date,
  student_phone text not null default '',
  parent_phone text not null default '',
  subjects text[] not null default '{}',
  vocal_difficulties text[] not null default '{}',
  has_instrument text not null default '',
  purpose text not null,

  school text not null default '',
  school_status text not null default '' check (school_status in ('', '재학', '휴학', '졸업')),
  region text not null default '',
  gender text not null default '' check (gender in ('', '남', '여')),
  ipsi_type text not null default '' check (ipsi_type in ('', '수시&정시', '편입', '재수')),
  ipsi_period text not null default '',
  target_school text not null default '',
  consult_content text not null default '',

  genre_song text not null default '',
  question text not null default '',
  lesson_experience jsonb not null default '{"hasExperience": null, "subjects": "", "period": ""}'::jsonb,
  referral_source text not null default '',
  referral_name text not null default '',
  schedule_preferences jsonb not null default '[]'::jsonb,
  start_available text not null default '',
  etc_memo text not null default '',
  status public.consultation_status not null default '상담',

  constraint lesson_experience_is_object check (jsonb_typeof(lesson_experience) = 'object'),
  constraint schedule_preferences_is_array check (jsonb_typeof(schedule_preferences) = 'array'),
  constraint card_type_matches_purpose check (
    (purpose = '프로·입시' and card_type = '입시') or
    (purpose <> '프로·입시' and card_type = '일반')
  )
);

create index consultations_created_at_idx on public.consultations (created_at desc);
create index consultations_card_type_idx on public.consultations (card_type);
create index consultations_status_idx on public.consultations (status);

alter table public.consultations enable row level security;

-- 학생 태블릿 역할(anon)은 INSERT만 가능합니다.
-- status는 열 권한에서도 제외하여 학생이 '등록'으로 넣을 수 없습니다.
revoke all on table public.consultations from anon, authenticated;
grant usage on type public.consultation_card_type to anon;
grant usage on type public.consultation_status to anon;
grant insert (
  card_type, submission_source, name, birth_date, student_phone, parent_phone, subjects,
  vocal_difficulties, has_instrument, purpose, school, school_status,
  region, gender, ipsi_type, ipsi_period, target_school, consult_content,
  genre_song, question, lesson_experience, referral_source, referral_name,
  schedule_preferences, start_available, etc_memo
) on table public.consultations to anon;

create policy "anonymous tablets can insert consultations"
on public.consultations
for insert
to anon
with check (status = '상담');

-- Secret key/service role은 인증된 관리자 API에서만 사용합니다.
grant all on table public.consultations to service_role;

comment on table public.consultations is
  '라 실용음악학원 상담 카드 — 기존 CRM과 완전히 분리된 데이터';
