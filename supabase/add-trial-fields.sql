-- 예약 카드에서 체험수업 강사·연습실까지 배정할 수 있게 컬럼 추가
alter table public.reservations add column if not exists trial_teacher text;
alter table public.reservations add column if not exists trial_room text;

-- CRM이 채워 넣는 강사·연습실 선택지 (관리자 화면 전용, 익명 접근 정책 없음)
create table if not exists public.crm_schedule_options (
  branch_name text primary key,
  teachers text[] not null default '{}',
  rooms text[] not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.crm_schedule_options enable row level security;
