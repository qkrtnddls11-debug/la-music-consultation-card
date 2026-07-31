# 라 실용음악학원 상담 카드 — 설치·배포 안내

이 문서는 개발 경험이 없어도 그대로 따라 할 수 있도록 작성했습니다. 반드시 **새 Supabase → 새 GitHub → 새 Vercel** 순서로 진행하세요. 기존 CRM 프로젝트에는 어떤 SQL이나 환경변수도 넣지 않습니다.

## 지금 준비된 것

- 학생 상담 카드 `/`
- 비밀번호 보호 관리자 화면 `/admin`
- 새 DB 테이블 및 RLS SQL `supabase/schema.sql`
- Supabase Publishable/anon 역할의 INSERT 전용 저장 경로
- 서버 전용 Secret key를 사용하는 관리자 조회·상태 변경
- 로컬 타입검사, 린트, 프로덕션 빌드 완료
- 768×1024에서 일반·입시·관리자 전체 흐름 검증 완료

실제 Supabase 프로젝트 연결 검증만 아래 설정 후 남습니다. 프로젝트 키가 없는 현재 단계에서는 실제 클라우드 DB에 접근할 수 없기 때문입니다.

## 1. 새 Supabase 프로젝트 만들기

공식 안내: [Supabase Next.js 시작하기](https://supabase.com/docs/guides/getting-started/quickstarts/nextjs), [API 키 종류](https://supabase.com/docs/guides/getting-started/api-keys)

1. 브라우저에서 [database.new](https://database.new/)를 엽니다.
2. Supabase에 로그인하고 `New project`를 누릅니다.
3. 다음처럼 입력합니다.
   - Name: `ra-music-consultation-card`
   - Database Password: 비밀번호 관리자가 만든 강한 새 비밀번호
   - Region: 한국에서 가장 가까운 지역
4. `Create new project`를 누르고 준비가 끝날 때까지 기다립니다.
5. 프로젝트 이름과 주소가 기존 CRM Supabase와 다른지 한 번 더 확인합니다.

### 테이블과 보안 정책 만들기

1. 새 프로젝트 왼쪽 메뉴에서 `SQL Editor`를 누릅니다.
2. `New query`를 누릅니다.
3. 이 저장소의 `supabase/schema.sql` 파일을 열어 **처음부터 끝까지 전부** 복사합니다.
4. SQL Editor에 붙여넣고 `Run`을 한 번 누릅니다.
5. `Success`가 나오면 `Table Editor`에서 `consultations` 테이블이 생겼는지 확인합니다.

이 SQL은 학생 태블릿 역할인 `anon`에 필요한 열의 INSERT만 허용합니다. SELECT/UPDATE/DELETE 권한과 정책은 만들지 않습니다. Supabase도 public 스키마 테이블에는 RLS를 켜고 역할별 최소 권한을 부여하도록 안내합니다. [Supabase RLS 공식 문서](https://supabase.com/docs/guides/database/postgres/row-level-security)

> SQL은 새 프로젝트에서 한 번만 실행합니다. 기존 CRM Supabase에서는 실행하지 마세요.

### 프로젝트 주소와 키 복사하기

새 Supabase 프로젝트의 `Connect` 버튼 또는 `Settings → API Keys`에서 아래 값을 찾습니다.

| 앱 환경변수 이름 | Supabase에서 복사할 값 | 공개 가능 여부 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL | 공개 가능 |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key (`sb_publishable_...`) | 공개 가능 |
| `SUPABASE_SECRET_KEY` | Secret key (`sb_secret_...`) | 절대 공개 금지 |

구형 키 화면만 보이면 Publishable 대신 `anon`, Secret 대신 `service_role` 값을 같은 환경변수 이름에 넣어도 됩니다. Secret/service_role 키는 RLS를 우회하므로 GitHub, 메신저, 스크린샷에 절대 올리지 마세요.

## 2. 새 GitHub 저장소 만들기

공식 안내: [로컬 코드를 새 GitHub 저장소에 올리기](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github)

1. [github.com/new](https://github.com/new)를 엽니다.
2. Repository name에 `ra-music-consultation-card`를 입력합니다.
3. `Private`를 권장합니다.
4. `Add a README`, `.gitignore`, `license`는 모두 선택하지 않습니다. 로컬 프로젝트에 이미 있습니다.
5. `Create repository`를 누릅니다.
6. 생성된 저장소 주소를 복사합니다. 예: `https://github.com/내아이디/ra-music-consultation-card.git`
7. 이 프로젝트 터미널에서 아래 두 줄을 실행합니다.

```bash
git remote add origin https://github.com/내아이디/ra-music-consultation-card.git
git push -u origin main
```

GitHub 저장소의 파일 목록에 `app`, `components`, `lib`, `supabase`, `package.json`이 보이면 성공입니다. `.env.local`이나 실제 비밀키가 보이면 즉시 삭제하고 키를 재발급해야 합니다.

## 3. 새 Vercel 프로젝트로 배포하기

공식 안내: [Vercel Git 저장소 배포](https://vercel.com/docs/git), [Vercel 환경변수](https://vercel.com/docs/environment-variables)

1. [vercel.com/new](https://vercel.com/new)을 열고 GitHub 계정으로 로그인합니다.
2. 방금 만든 `ra-music-consultation-card` 저장소 오른쪽의 `Import`를 누릅니다.
3. 설정을 확인합니다.
   - Project Name: `ra-music-consultation-card`
   - Framework Preset: `Next.js`
   - Root Directory: `./`
   - Build/Install 명령: 기본값 그대로
4. `Environment Variables`에 아래 5개를 하나씩 추가합니다.

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
SUPABASE_SECRET_KEY
ADMIN_PASSWORD
ADMIN_SESSION_SECRET
```

- Supabase 3개 값은 1단계에서 복사한 새 프로젝트 값만 사용합니다.
- `ADMIN_PASSWORD`는 `/admin`에서 사용할 길고 추측하기 어려운 비밀번호입니다.
- `ADMIN_SESSION_SECRET`은 비밀번호 관리자에서 만든 32자 이상의 무작위 문자열입니다. 터미널 사용이 가능하면 `openssl rand -hex 32` 결과를 써도 됩니다.
- 다섯 변수 모두 `Production`, `Preview`, `Development`에 적용하면 관리가 쉽습니다.

5. `Deploy`를 누릅니다.
6. 빌드가 끝나면 `https://...vercel.app` 주소가 표시됩니다.
7. 환경변수를 나중에 고쳤다면 `Deployments → 가장 최근 배포 → ... → Redeploy`가 필요합니다. 환경변수 변경은 과거 배포에 자동 적용되지 않습니다.

GitHub의 `main` 브랜치에 새 커밋을 push하면 Vercel이 자동으로 운영 주소를 다시 배포합니다. 다른 브랜치는 미리보기 배포가 만들어집니다.

## 4. 실제 Supabase 연결 최종 확인

테스트할 때는 실제 학생 정보 대신 아래처럼 눈에 띄는 가짜 값을 사용하세요.

### 일반 흐름

1. Vercel 주소 `/`를 엽니다.
2. 이름을 `일반연결테스트`로 입력합니다.
3. 일반 목적을 선택하고 마지막 요약까지 진행합니다.
4. `이대로 제출`을 누릅니다.
5. `감사합니다`가 보이고 약 3초 뒤 이름 화면으로 돌아오는지 확인합니다.

### 입시 흐름

1. 다시 이름을 `입시연결테스트`로 입력합니다.
2. 레슨 목적에서 `프로 · 입시`를 선택합니다.
3. 파란 `입시 상담` 배지가 보이는지 확인합니다.
4. 학교·입시 유형·목표 학교를 입력하고 제출합니다.

### 관리자와 DB 확인

1. `https://배포주소/admin`을 엽니다.
2. Vercel의 `ADMIN_PASSWORD` 값을 입력합니다.
3. 두 테스트 상담이 최신순으로 보이는지 확인합니다.
4. 이름 검색, `일반/입시` 필터, 상세 보기를 확인합니다.
5. 입시 테스트의 상태를 `등록함`으로 바꿉니다.
6. Supabase `Table Editor → consultations`에서 두 행과 변경된 `status`를 확인합니다.

### 학생 조회 차단 확인

- 로그아웃 상태에서 `https://배포주소/api/admin/consultations`를 열면 `인증이 필요합니다`가 나와야 합니다.
- `https://배포주소/api/consultations`를 주소창에서 열면 GET 요청이므로 `405 Method Not Allowed`가 나와야 합니다.
- 학생 앱에는 조회 버튼이나 조회 API가 없습니다.

Supabase SQL Editor에서 아래를 실행하면 핵심 권한도 확인할 수 있습니다.

```sql
select
  has_table_privilege('anon', 'public.consultations', 'select') as anon_can_select,
  has_table_privilege('anon', 'public.consultations', 'update') as anon_can_update,
  has_table_privilege('anon', 'public.consultations', 'delete') as anon_can_delete,
  has_column_privilege('anon', 'public.consultations', 'name', 'insert') as anon_can_insert_name;

select policyname, cmd, roles
from pg_policies
where schemaname = 'public' and tablename = 'consultations';
```

첫 쿼리는 `false, false, false, true`, 두 번째 쿼리는 anon 대상 `INSERT` 정책 한 개만 보여야 합니다.

테스트가 끝나면 Supabase Table Editor에서 `일반연결테스트`, `입시연결테스트` 두 행만 삭제하세요.

## 5. 태블릿에서 최종 확인

1. 아이패드는 Safari, 갤럭시탭은 Chrome에서 Vercel 주소를 엽니다.
2. 세로 방향으로 두고 이름부터 제출까지 눌러 봅니다.
3. 키보드가 열린 상태에서도 `다음` 버튼까지 스크롤되는지 확인합니다.
4. 관심 과목 칩과 스케줄 버튼이 손가락으로 편하게 눌리는지 확인합니다.
5. 필요하면 브라우저 메뉴의 `홈 화면에 추가`를 사용합니다.
6. 홈 화면 아이콘으로 연 뒤 `/admin` 주소는 학생에게 공유하지 않습니다.

## 문제가 생겼을 때

- `저장 설정을 확인해 주세요`: Vercel의 Supabase URL/Publishable key를 확인하고 재배포합니다.
- 학생 저장은 되지만 관리자 목록이 안 보임: `SUPABASE_SECRET_KEY`와 관리자 세션 환경변수를 확인합니다.
- 관리자 로그인이 500 오류: `ADMIN_PASSWORD` 또는 `ADMIN_SESSION_SECRET`이 빠졌습니다.
- 테이블이 없다는 오류: 새 Supabase 프로젝트의 SQL Editor에서 `supabase/schema.sql` 실행 여부를 확인합니다.
- 키를 실수로 GitHub에 올림: Supabase에서 해당 Secret key를 즉시 폐기·재발급하고 Vercel 값을 바꾼 뒤 재배포합니다.
