-- 라 실용음악학원 상담 카드 전용 Supabase 프로젝트에서만 실행하세요.
-- 기존 CRM Supabase 프로젝트에서는 절대 실행하지 마세요.

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 1 and 80),
  phone text not null default '',
  gender text not null check (gender in ('남', '여')),
  birth_date date not null,
  subjects text[] not null default '{}',
  lesson_type text not null check (lesson_type in ('입시', '취미')),
  schedule_preferences jsonb not null default '[]'::jsonb check (jsonb_typeof(schedule_preferences) = 'array'),
  status text not null default '대기' check (status in ('대기', '확정', '상담완료')),
  confirmed_at timestamptz,
  source text not null default 'link' check (source in ('link', 'tablet', 'crm'))
);

create index if not exists reservations_created_at_idx on public.reservations (created_at desc);
create index if not exists reservations_status_idx on public.reservations (status);
create index if not exists reservations_confirmed_at_idx on public.reservations (confirmed_at);

alter table public.reservations enable row level security;
revoke all on table public.reservations from anon, authenticated;
grant insert (name, phone, gender, birth_date, subjects, lesson_type, schedule_preferences, source)
on table public.reservations to anon;
grant all on table public.reservations to service_role;

drop policy if exists "anonymous can insert reservations" on public.reservations;
create policy "anonymous can insert reservations"
on public.reservations for insert to anon
with check (status = '대기' and confirmed_at is null);

alter table public.consultations
  add column if not exists reservation_id uuid references public.reservations(id) on delete set null,
  add column if not exists admin_memo text not null default '';

create unique index if not exists consultations_reservation_id_unique
on public.consultations (reservation_id) where reservation_id is not null;

grant insert (admin_memo) on table public.consultations to anon;

create table if not exists public.consent_requests (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  token_hash text not null unique check (char_length(token_hash) = 64),
  expires_at timestamptz not null,
  completed_at timestamptz,
  revoked_at timestamptz
);

create index if not exists consent_requests_consultation_idx on public.consent_requests (consultation_id, created_at desc);
create index if not exists consent_requests_expires_at_idx on public.consent_requests (expires_at);

alter table public.consent_requests enable row level security;
revoke all on table public.consent_requests from anon, authenticated;
grant all on table public.consent_requests to service_role;

alter table public.consents
  add column if not exists consent_request_id uuid unique references public.consent_requests(id) on delete set null;

comment on table public.reservations is '라 실용음악학원 상담 예약 — 상담 카드와 분리된 접수 데이터';
comment on column public.reservations.source is '접수 경로 표시용 값이며 외부 시스템과 연결하지 않음';
comment on table public.consent_requests is '24시간 일회용 등록 동의서 서명 링크';
