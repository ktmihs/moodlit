# Android 실기기 설치 가이드

Android는 iOS와 달리 **유료 개발자 계정도, 맥도 필요 없습니다.**
Windows에서 EAS 클라우드 빌드로 APK를 만들어 바로 설치할 수 있습니다.

핵심 흐름: **EAS 클라우드에서 APK 빌드 → 링크/QR로 폰에서 다운로드 → 설치**

## 0. 미리 알아둘 점

- iOS와 달리 **서명 만료가 없습니다.** 한 번 설치하면 계속 사용할 수 있습니다.
- 첫 빌드 시 EAS가 서명 키스토어를 자동 생성해 클라우드에 보관합니다. 별도 준비물이 없습니다.
- EAS 무료 플랜은 월 빌드 횟수 제한과 대기열이 있습니다. 빌드가 몰리는 시간대에는 대기가 걸릴 수 있습니다.

## 방법 1: EAS 클라우드 빌드 (권장)

### 1. 빌드 실행

프로젝트 폴더에서 (EAS 로그인이 안 되어 있다면 `npx eas-cli login` 먼저):

```bash
npx eas-cli build --profile preview --platform android
```

- `eas.json`의 `preview` 프로필이 APK를 만들도록 이미 설정되어 있습니다.
- 첫 빌드 시 "Generate a new Android Keystore?" 를 물어보면 **Yes** 를 선택합니다.
- 빌드는 클라우드에서 진행되며 보통 10~20분 걸립니다. 터미널을 닫아도 계속 진행됩니다.

### 2. 폰에 설치

빌드가 끝나면 터미널에 **다운로드 링크와 QR 코드**가 표시됩니다.
([expo.dev](https://expo.dev) → 프로젝트 → Builds 페이지에서도 확인 가능)

1. Android 폰 카메라로 QR 스캔 (또는 링크를 폰으로 전송해서 열기)
2. APK 다운로드 → 열기
3. "출처를 알 수 없는 앱" 경고가 뜨면 → **설정** → 해당 브라우저(예: Chrome)의 **이 출처 허용** 켜기
4. 다시 설치 진행 → 완료

## 방법 2: 로컬 빌드 (Android Studio 사용)

클라우드 대기열 없이 직접 빌드하고 싶을 때 사용합니다.

### 1. 환경 준비 (Windows)

1. [Android Studio](https://developer.android.com/studio) 설치
   - 설치 중 **Android SDK**, **Android SDK Platform**, **Android SDK Build-Tools** 포함
2. 환경변수 설정 (시스템 환경변수):
   - `ANDROID_HOME` = `C:\Users\<사용자명>\AppData\Local\Android\Sdk`
   - `Path` 에 `%ANDROID_HOME%\platform-tools` 추가
3. JDK 17 필요 (Android Studio에 내장된 JBR을 써도 됨)

### 2. 폰 준비 (USB 디버깅)

1. 설정 → 휴대전화 정보 → **빌드 번호 7번 연타** → 개발자 옵션 활성화
2. 설정 → 개발자 옵션 → **USB 디버깅** 켬
3. USB로 PC에 연결 → 폰에 뜨는 "USB 디버깅을 허용하시겠습니까?" → 허용
4. 연결 확인:
   ```bash
   adb devices
   ```
   기기가 `device` 상태로 보이면 정상입니다.

### 3. 빌드해서 설치

```bash
npx expo run:android --device --variant release
```

- 기기 선택 프롬프트가 뜨면 본인 폰 선택
- 첫 빌드는 10분 이상 걸릴 수 있습니다
- 완료되면 폰에 자동으로 설치되고 실행됩니다

> 참고: 이 방법의 release 빌드는 디버그 키로 서명되므로 개인 테스트 용도로만 사용하세요. 배포용은 방법 1의 EAS 빌드를 사용합니다.

## 요약

| 방법 | 준비물 | 명령 |
| --- | --- | --- |
| EAS 클라우드 (권장) | EAS 로그인만 | `npx eas-cli build --profile preview --platform android` → QR로 설치 |
| 로컬 빌드 | Android Studio + USB 디버깅 | `npx expo run:android --device --variant release` |

## 참고: 스토어 배포하려면

Google Play 배포는 Google Play 개발자 계정(1회 $25) 가입 후:

```bash
npx eas-cli build --profile production --platform android   # AAB 빌드
npx eas-cli submit --profile production --platform android  # Play Console 업로드
```

`eas.json`에 `production` 프로필(app-bundle)이 이미 준비되어 있습니다.
