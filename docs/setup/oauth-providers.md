# OAuth 프로바이더 설정 가이드

앱의 소셜 로그인(Google, Apple)을 동작시키려면 **Google Cloud Console / Apple Developer** 에서 OAuth 자격증명을 생성하고, **Supabase Dashboard** 에서 프로바이더를 활성화해야 합니다. 코드는 이미 준비되어 있으므로 아래 순서만 밟으면 됩니다.

---

## 프로젝트 상수 (미리 준비)

| 항목 | 값 | 확인 위치 |
|------|------|----------|
| Supabase 프로젝트 REF | `<YOUR-PROJECT-REF>` | `EXPO_PUBLIC_SUPABASE_URL` 또는 Supabase Dashboard URL |
| Supabase Callback URL | `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback` | Google Cloud Console 에 입력 |
| 앱 Redirect URL | `moodlit://auth/callback` | `app.json` 의 `scheme` + `app/auth/callback.tsx` |
| 번들 ID | `com.ktmihs.moodlit` | `app.json` |

---

## 1. Google OAuth 설정

### 1-A. Google Cloud Console에서 OAuth Client 생성

1. **[Google Cloud Console](https://console.cloud.google.com)** 접속 → 프로젝트 생성 (예: `moodlit-auth`)

2. **APIs & Services → OAuth consent screen**
   - User Type: **External** 선택
   - 앱 이름: `moodlit`
   - 사용자 지원 이메일: 본인 이메일
   - 개발자 연락처 이메일: 본인 이메일
   - 스코프 추가: `email`, `profile`, `openid`
   - **테스트 사용자** 섹션에 본인 Google 계정 이메일 추가
     > 프로덕션 승인 전에는 여기 등록된 계정만 로그인 가능

3. **APIs & Services → Credentials → `+ Create Credentials` → OAuth client ID**
   - Application type: **Web application** 선택
     > 모바일 앱이지만 Supabase가 중개하므로 Web으로 생성합니다
   - Name: `moodlit supabase`
   - **Authorized redirect URIs** 에 아래 URL 한 줄 추가
     ```
     https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback
     ```
   - `CREATE` 클릭

4. 생성 완료 팝업에서 **Client ID** / **Client Secret** 복사 (다시 볼 수 있지만 Secret은 복사해두면 편함)

### 1-B. Supabase에서 Google Provider 활성화

1. **Supabase Dashboard → Authentication → Providers**
2. **Google** 항목 펼치기 → **Enable** 토글 ON
3. 위에서 복사한 **Client ID** / **Client Secret** 붙여넣기
4. `Save` 클릭

### 1-C. Supabase Redirect URL 허용

1. **Supabase Dashboard → Authentication → URL Configuration**
2. **Redirect URLs** 섹션에 아래 추가
   ```
   moodlit://auth/callback
   ```
3. `Save` 클릭

### 1-D. 동작 확인

- 앱 재시작 → 로그인 화면 → **Google로 계속하기** 버튼
- 인앱 브라우저에서 Google 계정 선택 화면 → 승인
- 자동으로 앱으로 복귀 → 탭 화면 진입하면 성공

---

## 2. Apple OAuth 설정 (iOS 제출 직전에 진행)

Apple 로그인은 **Apple Developer Program 유료 가입(연 $99)** 과 별도 자격증명 생성이 필요합니다. iOS App Store 심사 가이드라인상 Google 등 다른 소셜 로그인을 제공하면 Apple 로그인도 필수이므로, iOS 제출 시점에 설정합니다.

> App Store Review Guideline 4.8 — "If your app uses a third-party or social login service ... it must also offer Sign in with Apple as an equivalent option"

### 2-A. Apple Developer에서 자격증명 생성

1. **[Apple Developer](https://developer.apple.com/account)** 접속

2. **Certificates, Identifiers & Profiles → Identifiers**
   - 번들 ID `com.ktmihs.moodlit` 의 **Capabilities** 에서 **Sign in with Apple** 활성화
   - Edit → Save

3. **Identifiers → `+` → Services IDs** 생성
   - Identifier: `com.ktmihs.moodlit.auth` (번들 ID와 달라야 함)
   - **Sign in with Apple** 활성화 → `Configure` 클릭
     - Primary App ID: `com.ktmihs.moodlit`
     - Domains and Subdomains: `<YOUR-PROJECT-REF>.supabase.co`
     - Return URLs: `https://<YOUR-PROJECT-REF>.supabase.co/auth/v1/callback`

4. **Keys → `+`** 생성
   - Name: `moodlit Sign in with Apple`
   - **Sign in with Apple** 활성화 → `Configure` 에서 Primary App ID 선택
   - `Register` → **.p8 키 파일 다운로드** (한 번만 받을 수 있음)
   - **Key ID** 복사
   - **Team ID** 도 복사 (계정 화면 우상단)

### 2-B. Supabase에서 Apple Provider 활성화

1. **Supabase Dashboard → Authentication → Providers → Apple**
2. Enable 토글 ON
3. 입력
   - **Services ID** (= `com.ktmihs.moodlit.auth`)
   - **Team ID**
   - **Key ID**
   - **Secret Key (.p8 파일 내용 통째로)**
4. `Save`

### 2-C. 앱 쪽 추가 작업 (iOS 빌드 설정)

- `app.json` 의 iOS section 에 아래 추가 (EAS Build 시 자동 반영)
  ```json
  "ios": {
    "usesAppleSignIn": true
  }
  ```
- `expo-apple-authentication` 을 쓰면 네이티브 Apple 로그인 시트 사용 가능. 현재 앱은 Supabase OAuth 경유 웹 플로우 사용 중

---

## 3. 환경 변수 참고

현재 `.env` / EAS Secrets 에 이미 존재해야 하는 값:

```env
EXPO_PUBLIC_SUPABASE_URL=https://<YOUR-PROJECT-REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-public-key>
```

OAuth Client ID/Secret은 **Supabase 쪽에만** 보관하면 됩니다 (앱 번들에 포함하지 말 것).

---

## 4. 트러블슈팅

| 증상 | 원인 / 해결 |
|------|------------|
| `Unsupported provider: provider is not enabled` | Supabase Dashboard 에서 Google Provider Enable 토글이 꺼져 있음 |
| Google 동의 화면에서 `Error 400: redirect_uri_mismatch` | Google Cloud Console 의 Authorized redirect URIs 가 정확히 `https://<REF>.supabase.co/auth/v1/callback` 이어야 함 (프로토콜/슬래시 주의) |
| Google 동의 화면에서 `Error 403: access_denied` + 테스트 계정인데 실패 | OAuth consent screen **Publishing status** 가 Testing 이면 테스트 사용자로 등록된 계정만 가능 |
| 구글 화면까지는 갔는데 앱으로 안 돌아옴 | Supabase Redirect URLs 에 `moodlit://auth/callback` 누락 |
| 앱 복귀 후 탭 진입 실패, Toast 에러 없음 | 코드 상 `completeOAuth` 가 code/fragment 모두 못 찾은 케이스. 콘솔에서 `result.url` 확인 필요 |
| `invalid_grant` 또는 `code verifier` 에러 | SecureStore 저장이 중간에 끊긴 경우. 로그인 버튼 다시 누르기 |
| Apple 심사 반려 "4.8 Sign in with Apple" | iOS 빌드에 Apple 로그인 미구현 상태로 제출. §2 완료 후 재제출 |

---

## 5. 참고 링크

- [Supabase Docs — Login with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Supabase Docs — Login with Apple](https://supabase.com/docs/guides/auth/social-login/auth-apple)
- [Google Cloud — OAuth 2.0 Setup](https://developers.google.com/identity/protocols/oauth2)
- [Apple — Sign in with Apple Configuration](https://developer.apple.com/documentation/sign_in_with_apple)
