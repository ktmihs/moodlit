# iPhone 실기기 설치 가이드 (맥 + 무료 Apple ID)

유료 Apple Developer Program 없이, 맥과 무료 Apple ID만으로 iPhone에 mood-lit을 직접 설치하는 방법입니다.

핵심 흐름: **맥에서 Xcode로 빌드 → USB로 연결한 iPhone에 직접 설치** (무료 프로비저닝)

## 0. 미리 알아둘 제약 (무료 계정)

- 설치한 앱은 **7일 후 서명이 만료**되어 실행이 안 됩니다. 맥에 다시 연결해서 재빌드하면 됩니다 (앱 데이터는 유지됨).
- 동시에 설치 가능한 앱 3개, 7일간 App ID 등록 10개 제한이 있습니다.
- 푸시 알림 등 일부 기능은 무료 계정에서 사용할 수 없지만, 이 앱은 해당 사항이 없습니다.

## 1. 맥 환경 준비

```bash
# 1) Xcode 설치 (App Store에서 "Xcode" 검색, 10GB+ 이므로 시간이 걸림)
#    설치 후 한 번 실행해서 라이선스 동의 + iOS 컴포넌트 설치

# 2) Command Line Tools 지정
sudo xcode-select -s /Applications/Xcode.app

# 3) Homebrew가 있다면 (없으면 https://brew.sh 참고)
brew install node cocoapods

# 4) 프로젝트 가져오기
git clone <이 저장소 URL>
cd mood-lit
npm install
```

> **환경변수 주의**: `.env` 등 환경변수 파일(Supabase 키 등)은 git에 올라가지 않으므로, 사용 중이라면 맥에도 따로 복사해야 합니다.

## 2. Xcode에 Apple ID 등록

1. Xcode 실행 → 메뉴 **Xcode > Settings > Accounts**
2. 왼쪽 아래 **+** → **Apple Account** → 본인 Apple ID 로그인
3. 로그인하면 자동으로 **"이름 (Personal Team)"** 이 생성됩니다. 이것이 무료 서명 팀입니다.

## 3. iPhone 준비

1. USB 케이블로 맥에 연결 → iPhone에 뜨는 **"이 컴퓨터를 신뢰하겠습니까?"** → 신뢰
2. **개발자 모드 켜기** (iOS 16+):
   - 설정 → 개인정보 보호 및 보안 → 맨 아래 **개발자 모드** → 켬 → 재부팅
   - 이 메뉴는 맥에 연결된 후에야 나타나는 경우가 있습니다. 안 보이면 4~5단계에서 첫 빌드를 시도한 뒤 다시 확인하세요.

## 4. 네이티브 프로젝트 생성 + 서명 설정

프로젝트 폴더에서:

```bash
npx expo prebuild -p ios
```

`ios/` 폴더가 생성됩니다. 이어서 Xcode에서 서명을 설정합니다:

1. `ios/moodlit.xcworkspace` 를 Xcode로 열기
   ```bash
   open ios/moodlit.xcworkspace
   ```
   ⚠️ `.xcodeproj` 가 아니라 **`.xcworkspace`** 를 열어야 합니다.
2. 왼쪽 파일 트리 최상단 **moodlit** 프로젝트 클릭 → TARGETS의 **moodlit** 선택 → **Signing & Capabilities** 탭
3. **Automatically manage signing** 체크
4. **Team** 을 **"이름 (Personal Team)"** 으로 선택
5. 에러가 나면 Bundle Identifier(`com.ktmihs.moodlit`)가 다른 계정에 이미 등록된 경우입니다. 그때만 `app.json`의 `ios.bundleIdentifier`를 `com.ktmihs.moodlit.dev` 처럼 바꾸고 다음을 다시 실행하세요:
   ```bash
   npx expo prebuild -p ios --clean
   ```

## 5. 빌드해서 iPhone에 설치

Metro 서버 없이 단독 실행되는 **Release 빌드**를 권장합니다:

```bash
npx expo run:ios --device --configuration Release
```

- 기기 선택 프롬프트가 뜨면 본인 iPhone 선택
- 첫 빌드는 5~15분 걸립니다
- 중간에 키체인 접근 허용 팝업이 뜨면 **항상 허용**

**Xcode에서 직접 빌드하는 경우**: 상단 기기 선택 드롭다운에서 본인 iPhone 선택 → **⌘R**.
이때는 **Edit Scheme > Run > Build Configuration** 을 **Release** 로 바꿔두면 Metro 없이 단독 실행됩니다.

## 6. iPhone에서 개발자 신뢰

설치 후 처음 실행하면 "신뢰하지 않는 개발자" 경고가 뜹니다:

1. iPhone 설정 → **일반 → VPN 및 기기 관리**
2. 본인 Apple ID 항목 탭 → **신뢰**
3. 앱 다시 실행

## 요약

| 단계 | 명령/작업 |
| --- | --- |
| 환경 | Xcode + Node + CocoaPods 설치, `npm install` |
| 서명 | Xcode Accounts에 Apple ID 추가 → Personal Team |
| 생성 | `npx expo prebuild -p ios` → Xcode에서 Team 지정 |
| 설치 | `npx expo run:ios --device --configuration Release` |
| 신뢰 | iPhone 설정 → VPN 및 기기 관리 → 신뢰 |

## 7일 후 앱이 안 열릴 때

서명 만료입니다. iPhone을 맥에 다시 연결하고 5단계 명령만 다시 실행하면 됩니다:

```bash
npx expo run:ios --device --configuration Release
```

## 참고: 유료 계정으로 전환하면

Apple Developer Program(연 $99) 가입 시 맥 없이도 EAS 클라우드 빌드로 설치할 수 있습니다:

```bash
eas device:create                                # iPhone UDID 등록
eas build --profile preview --platform ios       # 빌드 (eas.json에 프로필 준비됨)
```

빌드 완료 후 나오는 링크/QR을 iPhone에서 열면 바로 설치되며, 7일 만료 제한도 없습니다. TestFlight 배포도 가능해집니다.
