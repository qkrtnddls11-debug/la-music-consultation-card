# 라 실용음악학원 상담 카드

태블릿 학생 입력 화면과 비밀번호 보호 관리자 화면을 제공하는 독립 Next.js 앱입니다.

## 경로

- `/` — 관리자 로그인 화면으로 이동
- `/admin` — 관리자 상담 목록 및 등록 상태 관리
- `/consult` — 관리자 화면의 `새 상담 시작` 버튼으로 여는 상담 카드

## 로컬 실행

1. `.env.example`을 `.env.local`로 복사하고 새 Supabase 프로젝트의 값만 입력합니다.
2. `supabase/schema.sql`을 새 Supabase 프로젝트의 SQL Editor에서 실행합니다.
3. `pnpm install`
4. `pnpm dev`

상세한 비개발자용 설치·배포 순서는 `SETUP.md`에 정리되어 있습니다.

## 보안 구조

- 학생 입력은 `POST /api/consultations`만 사용합니다.
- Publishable/anon 역할은 DB에서 `INSERT` 열 권한만 가지며 SELECT/UPDATE/DELETE 권한과 정책이 없습니다.
- 관리자 조회/수정은 HttpOnly 세션 인증 뒤 서버 전용 Secret key로만 수행합니다.
- `SUPABASE_SECRET_KEY`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`에는 절대 `NEXT_PUBLIC_` 접두사를 붙이지 않습니다.
