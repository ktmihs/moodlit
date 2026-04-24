# mood-lit 스토어 제출 준비 체크리스트

앱 버전: **1.0.0** · 번들ID: `com.ktmihs.moodlit` · EAS 프로젝트: `c3f6c487-5e41-4fba-8cd8-ba06ef85e094`

---

## 1. 사전 준비

### 공통
- [ ] 개인정보처리방침 URL 발급 — `[PRIVACY_POLICY_URL]`
- [ ] 지원(문의) URL — `[SUPPORT_URL]`
- [ ] 마케팅 URL — `[MARKETING_URL]`
- [ ] 아이콘 1024×1024 (iOS), 512×512 (Android) 준비
- [ ] 스크린샷 세트 준비 ([metadata.md](./metadata.md) 참고)
- [ ] 피처 그래픽 1024×500 (Android)
- [ ] 앱 소개 영상 (선택)

### iOS (Apple)
- [ ] Apple Developer Program 가입 — Team ID: `[APPLE_TEAM_ID]`
- [ ] App Store Connect에 앱 등록, ASC App ID: `[ASC_APP_ID]`
- [ ] 번들ID `com.ktmihs.moodlit` 등록 확인
- [ ] Sign in with Apple 서비스 활성화 (OAuth로 Apple 사용 중)
- [ ] 푸시 키(선택), 인증서는 EAS가 관리하도록 위임
- [ ] `eas.json` 의 submit 프로필에 Apple 계정 정보 입력

### Android (Google)
- [ ] Google Play Console 계정 개설
- [ ] 새 앱 생성, 패키지명 `com.ktmihs.moodlit` 고정
- [ ] 업로드 키/앱 서명 키 — EAS 관리 위임
- [ ] 내부 테스트 트랙에 테스터 이메일 목록 등록
- [ ] 데이터 안전 설문 작성 ([metadata.md](./metadata.md) §2)

---

## 2. 앱 심사 통과 포인트

### iOS 공통
- [ ] 가이드라인 **5.1.1(v)** 계정 삭제 기능 — 앱 내에서 계정 삭제 경로 제공 (마이페이지 > 계정 삭제)
- [ ] 가이드라인 **4.8** — Sign in with Apple이 Google/Apple OAuth와 동등하게 노출되는지 확인
- [ ] `Info.plist` 암호화 수출 규정 — `ITSAppUsesNonExemptEncryption: false` 이미 설정됨
- [ ] OAuth 콜백 스킴 `moodlit://auth/callback` Info.plist URL Types에 등록되는지 확인 (expo prebuild 결과 점검)
- [ ] 테스트 계정 & 비밀번호 제공 — `[test@moodlit.app / ********]`
- [ ] 심사자용 안내문 (App Review Information > Notes) — 간편 로그인 사용법 명시
- [ ] 연령 등급 설정 — **4+** 예상 (폭력/성인 콘텐츠 없음)

### Android 공통
- [ ] 타깃 SDK **34+** 준수 (Expo SDK 54 기본)
- [ ] 데이터 안전 섹션 전 항목 입력
- [ ] 광고 ID 사용 **"아니오"**
- [ ] 콘텐츠 등급 설문 (IARC) 완료 — 3+ 예상
- [ ] 앱 번들(AAB) 업로드, Play App Signing 동의
- [ ] 개인정보처리방침 URL 입력 (필수)
- [ ] 내부/비공개/프로덕션 트랙 단계적 롤아웃 계획

---

## 3. 빌드 & 업로드 플로우

### 3.1 프로덕션 빌드
```bash
# iOS
eas build --profile production --platform ios

# Android
eas build --profile production --platform android
```
- `eas.json` 의 `production` 프로필 사용 (채널: production, AAB)
- `appVersionSource: remote` — EAS가 빌드 번호 자동 증가

### 3.2 내부 테스트 (TestFlight / Play Internal)
```bash
eas build --profile preview --platform all
```
- iOS: `distribution: internal` — Ad hoc 서명으로 EAS 다이렉트 링크 배포 가능
- Android: APK 산출, 내부 공유 또는 Play Console 내부 트랙 업로드

### 3.3 제출
```bash
eas submit --profile production --platform ios
eas submit --profile production --platform android
```
- 제출 전에 `eas.json` 의 Apple 계정 placeholder 3곳(`__APPLE_ID__`, `__ASC_APP_ID__`, `__APPLE_TEAM_ID__`) 실값 치환
- Play는 `serviceAccountKeyPath` 추가 필요 시 `eas.json` 업데이트

### 3.4 OTA 업데이트 (JS 번들 교체)
```bash
# preview 채널로 푸시
eas update --branch preview --message "설명 수정"

# production 채널로 푸시
eas update --branch production --message "핫픽스 v1.0.1"
```
- `runtimeVersion` 이 동일해야 적용됨 (현재 policy: `appVersion`)
- 네이티브 코드 변경 시 OTA 불가 → 스토어 재심사 필요

---

## 4. 출시 후 운영

### 모니터링
- [ ] Sentry 또는 expo-application-based 크래시 리포트 연동 (TODO)
- [ ] Firebase Analytics 또는 PostHog 도입 검토
- [ ] 리뷰 알림 — App Store Connect / Play Console 이메일 수신 설정

### OTA 채널 운영 원칙
- **production** — 스토어 릴리즈와 동일 상태, 긴급 핫픽스만 푸시
- **preview** — 내부 QA 계정 전용, 다음 릴리즈 후보 미리보기
- **development** — 개발자 전용, 상시 푸시

### 릴리즈 노트 템플릿

#### 한국어
```
v[X.Y.Z] — [YYYY-MM-DD]
· [기능] 새로운 [무드 추천 카테고리]가 추가됐어요
· [개선] [캘린더 로딩 속도]가 빨라졌어요
· [수정] [로그인 화면 키보드 겹침] 이슈를 고쳤어요
```

#### 영어
```
v[X.Y.Z] — [YYYY-MM-DD]
· New: [mood recommendation categories]
· Improved: [calendar loading speed]
· Fixed: [keyboard overlap on login screen]
```

---

## 5. 최종 제출 직전 체크

- [ ] 버전 번호 `1.0.0` 일관 (`app.json`, 스토어 화면 모두)
- [ ] `runtimeVersion.policy` = `appVersion` (app.json에 반영 완료)
- [ ] OTA URL 접근 가능 확인 (`https://u.expo.dev/<projectId>`)
- [ ] 심사자 테스트 계정 생성 + 실제 로그인 검증
- [ ] 스크린샷 파일명/순서 정렬
- [ ] 개인정보처리방침 URL HTTPS 접근 OK
- [ ] 한 번의 `eas build --profile production --platform all` 전체 그린
- [ ] 내부 테스터 2명 이상 실기기 smoke test 완료
