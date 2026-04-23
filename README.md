# mood-lit

> 감상 기반 도서 추천 · 독서 기록 모바일 앱

`mood-lit`은 사용자의 독서 감상(리뷰)을 분석해 비슷한 분위기의 책을 추천해 주는 React Native (Expo) 기반 앱입니다.
Supabase의 **pgvector** 임베딩 유사도와 **카카오 도서 검색 API** 결과를 하이브리드로 결합하고, OpenAI(GPT-4o-mini)를 활용해 추천 사유까지 생성합니다.

---

## 주요 기능

| 영역 | 설명 |
| --- | --- |
| 📚 **서재** | 내가 등록한 책을 그리드 형태로 관리. 드래그 앤 드롭 정렬·삭제 지원 |
| 🔍 **검색** | 카카오 도서 API 연동, 디바운스 검색 + 페이지네이션 |
| 📅 **달력** | 독서 시작·종료 일자를 캘린더에 시각화 |
| 👤 **마이페이지** | 프로필·OAuth 로그아웃 |
| ✍️ **리뷰** | 독서 감상 작성 → AI 워커가 키워드/임베딩 자동 생성 |
| 🤖 **추천** | 리뷰 임베딩(pgvector) × 카카오 검색 하이브리드 + GPT 추천 사유 |

---

## 기술 스택

### Frontend ([app/](app/))
- **Expo SDK 54** / React Native 0.81 / React 19
- **expo-router** (파일 기반 라우팅, 탭 + 스택 네비게이션)
- **Supabase JS** + `expo-secure-store` 기반 세션 영속화
- `react-native-reanimated` · `react-native-gesture-handler` · `react-native-draggable-flatlist`
- `react-native-calendars` · `react-native-toast-message`

### Backend ([backend/](backend/))
- **Express 4** + **TypeScript** (`tsx watch`)
- **Zod** 스키마 검증 / `helmet` / `express-rate-limit`
- **node-cron**: 매일 02:00 UTC AI 워커 배치 ([backend/src/index.ts:101](backend/src/index.ts#L101))
- Supabase Service Role 키로 RLS 우회 + 사용자 토큰 검증

### Database ([supabase/migrations/](supabase/migrations/))
- **PostgreSQL** + **pgvector** (100차원 임베딩, IVFFlat 인덱스)
- Row Level Security 적용, `auth.users` 트리거로 `public.users` 자동 생성
- 추천 결과 캐싱 테이블(`recommendations`) — TTL 6시간 + Stale-While-Revalidate

### 외부 API
- **Supabase Auth** (OAuth)
- **Kakao Book Search API**
- **OpenAI** (`gpt-4o-mini`) — 키워드/추천 사유 생성

---

## 디렉터리 구조

```
mood-lit/
├─ app/                       # Expo Router 화면
│  ├─ (auth)/login.tsx
│  ├─ (tabs)/                 # 서재 · 검색 · 달력 · 마이페이지
│  └─ auth/callback.tsx       # OAuth 콜백
├─ components/                # 공용 UI (BookCard, BookDetailModal, DraggableGrid …)
├─ hooks/                     # useAuth, useUserBooks, useCalendar, useBookDetail
├─ lib/                       # Supabase 클라이언트, 임베딩, 에러 핸들러, DB 타입
├─ types/                     # 도메인 타입(book 등)
├─ backend/
│  └─ src/
│     ├─ index.ts             # Express 엔트리 + cron
│     ├─ middleware/          # auth · rateLimit · errorHandler
│     ├─ lib/                 # validate · errors · embedding · summary · worker
│     └─ routes/              # books · userBooks · searchBooks · reviews · calendar · recommendations
└─ supabase/migrations/       # 스키마 / RLS / AI worker / recommendations
```

---

## API 엔드포인트 (요약)

모든 사용자 라우트는 `Authorization: Bearer <supabase access_token>` 필요.

| Method | Path | 설명 |
| --- | --- | --- |
| `GET`  | `/search-books`        | 카카오 도서 검색 프록시 (q, page, limit) |
| `GET`  | `/books/:id`           | 책 상세 |
| `GET`  | `/user-books`          | 내 서재 목록 (정렬/페이지네이션) |
| `POST` | `/user-books`          | 서재에 책 추가 |
| `PATCH`| `/user-books/:id`      | 상태/평점/순서 변경 |
| `DELETE`| `/user-books/:id`     | 서재에서 삭제 |
| `GET`  | `/calendar`            | 기간 내 독서 이벤트 |
| `POST` | `/reviews`             | 리뷰 작성 (AI 워커가 후처리) |
| `POST` | `/recommendations`     | 리뷰 기반 추천 (캐시 + SWR) |
| `POST` | `/ai-worker/run`       | AI 워커 수동 실행 (`x-worker-key` 필요) |

---

## 추천 알고리즘 동작 흐름

[backend/src/routes/recommendations.ts](backend/src/routes/recommendations.ts) 참고.

1. **캐시 확인** — `recommendations` 테이블에서 `review_id`로 조회 (TTL 6시간)
   - 신선 → 즉시 반환
   - Stale → **stale 즉시 반환 + 백그라운드 재생성** (SWR 패턴)
2. **pgvector 유사도 검색** — `match_books_by_review` RPC로 상위 10권 (가중치 ×3)
3. **검색 키워드 생성** — 책 정보 + 리뷰 감상을 GPT-4o-mini로 3개 키워드 생성
4. **카카오 도서 검색** — 키워드별 병렬 호출, ISBN 기준 병합
5. **내 서재 ISBN 제외** 후 점수순 정렬, 상위 10권 추출
6. **추천 사유 생성** — 상위 5권에 대해 GPT-4o-mini가 10~15자 사유 작성
7. 결과를 캐시에 upsert

---

## 개발 환경 설정

### 1. 사전 요구

- Node.js 20+
- Supabase 프로젝트 (pgvector 확장 활성화)
- 카카오 REST API Key, OpenAI API Key

### 2. 환경 변수

**프론트엔드** (`.env` — Expo public 변수)

```bash
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=...
EXPO_PUBLIC_API_URL=http://localhost:3000
```

**백엔드** ([backend/.env](backend/))

```bash
PORT=3000
CORS_ORIGIN=http://localhost:8081

SUPABASE_URL=...
SUPABASE_SERVICE_ROLE_KEY=...

KAKAO_API_KEY=...
KAKAO_BOOK_URL=https://dapi.kakao.com/v3/search/book

OPENAI_API_KEY=...
WORKER_SECRET_KEY=...           # /ai-worker/* 보호용
```

### 3. DB 마이그레이션

```bash
# Supabase CLI 또는 SQL Editor에서 순서대로 실행
supabase/migrations/20260406000001_schema.sql
supabase/migrations/20260406000002_rls.sql
supabase/migrations/20260421000001_ai_worker.sql
supabase/migrations/20260421000002_recommendations.sql
```

### 4. 실행

```bash
# 백엔드
cd backend
npm install
npm run dev          # tsx watch src/index.ts → http://localhost:3000

# 프론트엔드 (프로젝트 루트)
npm install
npm run start        # Expo Dev Server
npm run android      # 안드로이드
npm run ios          # iOS
```

> ⚠️ Expo Go가 아닌 **expo-dev-client** 빌드를 사용합니다 (`expo-secure-store`, `@react-native-community/datetimepicker` 등 네이티브 모듈 의존).

---

## 스크립트

### 루트
| 스크립트 | 설명 |
| --- | --- |
| `npm run start` | Expo 개발 서버 |
| `npm run android` / `ios` / `web` | 플랫폼별 실행 |
| `npm run lint` | `expo lint` (ESLint 9 + expo config) |

### 백엔드 ([backend/package.json](backend/package.json))
| 스크립트 | 설명 |
| --- | --- |
| `npm run dev` | `tsx watch` 핫 리로드 |
| `npm run start` | 프로덕션 실행 |

---

## 보안 / 운영 메모

- **Helmet** + **CORS 화이트리스트** + **요청당 100req/분 글로벌 레이트 리밋**
- 사용자 라우트는 `requireAuth` 미들웨어로 Supabase JWT 검증
- AI 워커 엔드포인트는 `x-worker-key` 헤더로 보호
- RLS 정책으로 사용자 데이터 격리 (`supabase/migrations/20260406000002_rls.sql`)
- 추천 캐시 TTL 6시간 + SWR로 첫 응답 지연 최소화

---

## 라이선스

내부 프로젝트 (KTMIHS / RaonTech).
