# Supabase Edge Functions 배포 가이드

`supabase/functions/` 하위의 Edge Function(Deno 런타임)들을 로컬에서 테스트하고 운영에 배포하는 절차입니다. 현재 다루는 함수는 다음과 같습니다.

| 함수 | 경로 | 용도 |
|------|------|------|
| `delete-account` | `POST /functions/v1/delete-account` | 계정 탈퇴 (Google Play 정책 준수) |

---

## 1. 사전 준비

### 1-A. Supabase CLI 설치

```bash
# macOS
brew install supabase/tap/supabase

# Windows (Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# npm (모든 OS, 권장 X — 최신 기능 누락 가능)
npm i -g supabase
```

설치 확인:

```bash
supabase --version
```

### 1-B. 로그인 및 프로젝트 링크

```bash
# 브라우저로 액세스 토큰 발급
supabase login

# 프로젝트 디렉터리(=리포 루트)에서 실행
supabase link --project-ref <YOUR-PROJECT-REF>
```

`<YOUR-PROJECT-REF>`는 Supabase Dashboard URL(`https://app.supabase.com/project/<ref>`)에서 확인할 수 있습니다. `EXPO_PUBLIC_SUPABASE_URL`의 서브도메인과 동일합니다.

---

## 2. 환경변수

Edge Function 런타임은 다음 변수를 **자동으로 주입**합니다. 별도 설정 불필요:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

> Service Role 키는 admin 권한을 가지므로 **클라이언트(앱) 코드나 Git에 절대 노출 금지**. Edge Function 런타임 내부에서만 `Deno.env.get(...)`으로 읽어야 합니다.

추가 시크릿이 필요하면:

```bash
supabase secrets set MY_KEY=value
supabase secrets list
```

---

## 3. 로컬 테스트

```bash
# 함수 실행 (자동 reload)
supabase functions serve delete-account --env-file .env.local
```

`.env.local` 예시 (로컬 개발용):

```
SUPABASE_URL=http://127.0.0.1:54321
SUPABASE_ANON_KEY=<로컬 anon 키>
SUPABASE_SERVICE_ROLE_KEY=<로컬 service role 키>
```

curl로 호출:

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/delete-account \
  -H "Authorization: Bearer <USER_JWT>" \
  -H "Content-Type: application/json"
```

---

## 4. 배포

```bash
# 단일 함수 배포
supabase functions deploy delete-account

# 전체 함수 일괄 배포
supabase functions deploy
```

배포 직후 Dashboard > Edge Functions 에서 상태와 invoke URL을 확인할 수 있습니다.

---

## 5. 클라이언트 호출 예시 (React Native)

```ts
import { supabase } from '@/lib/supabase';

async function deleteAccount() {
	const { data, error } = await supabase.functions.invoke('delete-account');

	if (error || !data?.success) {
		// 사용자에게는 일반화된 메시지만 노출
		throw new Error('계정 삭제에 실패했습니다. 잠시 후 다시 시도해주세요.');
	}

	// 성공 시 로컬 세션 정리
	await supabase.auth.signOut();
}
```

`supabase.functions.invoke`는 자동으로 현재 세션의 JWT를 `Authorization` 헤더에 넣어 호출합니다. 별도 토큰 주입 코드는 불필요합니다.

---

## 6. 디버깅

```bash
# 실시간 로그 스트림
supabase functions logs delete-account

# 특정 시간 범위
supabase functions logs delete-account --since 1h
```

PII(이메일 등)는 의도적으로 로그에 남기지 않으므로, 사용자 신원이 필요하면 UUID로 교차 조회하세요.

---

## 7. 보안 체크리스트

- [ ] Service Role 키가 클라이언트 번들이나 Git 히스토리에 포함되지 않았는지 확인
- [ ] 함수 본문에서 호출자 JWT 검증(`auth.getUser`) 후에만 admin 작업 수행
- [ ] 에러 응답에 Supabase 내부 메시지를 그대로 노출하지 않음
- [ ] CORS preflight(OPTIONS) 처리 및 메서드 화이트리스트 확인
- [ ] 새 함수 추가 시 본 문서의 표 갱신
