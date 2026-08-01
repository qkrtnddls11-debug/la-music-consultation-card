-- 라 실용음악학원 상담 카드 전용 Supabase 프로젝트에서만 실행하세요.
-- 기존 CRM Supabase 프로젝트에서는 절대 실행하지 마세요.

create table if not exists public.consents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  consultation_id uuid not null unique references public.consultations(id) on delete restrict,
  signer_name text not null check (char_length(signer_name) between 1 and 80),
  signer_role text not null check (signer_role in ('본인', '법정대리인')),
  rules_agreed boolean not null check (rules_agreed),
  required_info_agreed boolean not null check (required_info_agreed),
  unique_identifier_consent text not null check (unique_identifier_consent in ('동의함', '동의하지 않음')),
  optional_info_consent text not null check (optional_info_consent in ('동의함', '동의하지 않음')),
  marketing_consent text not null check (marketing_consent in ('동의함', '동의하지 않음')),
  is_minor boolean not null,
  guardian_name text not null default '',
  guardian_phone text not null default '',
  guardian_relationship text not null default '',
  name_trace_path text not null,
  signature_path text not null,
  agreed_at timestamptz not null default now(),
  rules_document_version text not null default '2024-04-01',
  privacy_document_version text not null default 'source-pdf-2026-07-31',
  constraint guardian_fields_match_minor check (
    (is_minor and signer_role = '법정대리인' and guardian_name <> '' and guardian_phone <> '' and guardian_relationship <> '')
    or
    (not is_minor and signer_role = '본인' and guardian_name = '' and guardian_phone = '' and guardian_relationship = '')
  )
);

create index if not exists consents_created_at_idx on public.consents (created_at desc);

alter table public.consents enable row level security;
revoke all on table public.consents from anon, authenticated;
grant all on table public.consents to service_role;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('consent-signatures', 'consent-signatures', false, 2097152, array['image/png'])
on conflict (id) do update set
  public = false,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

comment on table public.consents is
  '라 실용음악학원 등록 동의서 및 전자서명 — 관리자 전용';
