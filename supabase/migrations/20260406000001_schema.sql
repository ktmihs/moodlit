-- ============================================================
-- mood-lit DB 스키마
-- ============================================================

-- pgvector 확장 활성화
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- users 테이블
-- auth.users를 확장하는 공개 프로필 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  display_name TEXT,
  avatar_url  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 신규 auth.users 생성 시 자동으로 public.users 행 생성
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.users (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- updated_at 자동 갱신 함수
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ============================================================
-- books 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS public.books (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  isbn           TEXT UNIQUE,
  title          TEXT NOT NULL,
  author         TEXT,
  publisher      TEXT,
  published_date TEXT,
  description    TEXT,
  cover_image_url TEXT,
  genre          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================
-- user_books 테이블 (사용자 독서 목록)
-- ============================================================
-- CREATE TYPE은 IF NOT EXISTS를 지원하지 않으므로 안전하게 처리
DO $$ BEGIN
  CREATE TYPE reading_status AS ENUM ('want_to_read', 'reading', 'completed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS public.user_books (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id    UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  status     reading_status NOT NULL DEFAULT 'want_to_read',
  rating     SMALLINT CHECK (rating >= 1 AND rating <= 5),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

-- ============================================================
-- reviews 테이블 (독서 리뷰 + 감정 임베딩)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.reviews (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  book_id    UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  content    TEXT NOT NULL,
  mood       TEXT,
  embedding  VECTOR(100),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- updated_at 트리거 연결
DROP TRIGGER IF EXISTS set_users_updated_at ON public.users;
CREATE TRIGGER set_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_user_books_updated_at ON public.user_books;
CREATE TRIGGER set_user_books_updated_at
  BEFORE UPDATE ON public.user_books
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_reviews_updated_at ON public.reviews;
CREATE TRIGGER set_reviews_updated_at
  BEFORE UPDATE ON public.reviews
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- pgvector IVFFlat 인덱스 (코사인 유사도, 차원 100)
CREATE INDEX IF NOT EXISTS reviews_embedding_idx
  ON public.reviews
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- ============================================================
-- genre_colors 테이블 (장르별 색상)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.genre_colors (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  genre      TEXT NOT NULL UNIQUE,
  color      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 기본 장르 색상 데이터
INSERT INTO public.genre_colors (genre, color) VALUES
  ('소설',     '#FF6B6B'),
  ('에세이',   '#FFD93D'),
  ('자기계발', '#6BCB77'),
  ('경제/경영','#4D96FF'),
  ('역사',     '#C77DFF'),
  ('과학',     '#00C2A8'),
  ('시/문학',  '#FF9A3C'),
  ('사회',     '#F72585'),
  ('철학',     '#7B2D8B'),
  ('여행',     '#43AA8B')
ON CONFLICT (genre) DO NOTHING;
