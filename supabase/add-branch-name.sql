-- 지점별 데이터 구분: 모든 테이블에 branch_name 추가
-- 기존 데이터와 지점 미지정 데이터는 기본 지점(수원 망포점)으로 간주한다.

alter table public.reservations add column if not exists branch_name text;
alter table public.reservations alter column branch_name set default '수원 망포점';
update public.reservations set branch_name = '수원 망포점' where branch_name is null;

alter table public.consultations add column if not exists branch_name text;
alter table public.consultations alter column branch_name set default '수원 망포점';
update public.consultations set branch_name = '수원 망포점' where branch_name is null;

alter table public.consents add column if not exists branch_name text;
alter table public.consents alter column branch_name set default '수원 망포점';
update public.consents set branch_name = '수원 망포점' where branch_name is null;

alter table public.vocal_diagnoses alter column branch_name set default '수원 망포점';
update public.vocal_diagnoses set branch_name = '수원 망포점' where branch_name is null or branch_name = '';
