-- 상담지 담당 강사 토스 (2026-08-28)
-- 체험수업 강사와 정규수업 강사가 다를 때, 관리자가 상담지를 정규 담당 강사에게 넘겨
-- 그 강사의 화면(강사 모드)에서도 이 상담지가 보이게 한다.
-- 실행: 상담 앱 Supabase → SQL Editor → Run

alter table public.consultations add column if not exists assigned_teacher text;
comment on column public.consultations.assigned_teacher is '상담지를 볼 담당 강사(토스 대상). 비어 있으면 체험 배정 강사만 본다';
