-- ============================================================
-- Row Level Security (RLS) 정책
-- ============================================================

-- ---- users ----
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users: 전체 조회 허용"
  ON public.users FOR SELECT
  USING (true);

CREATE POLICY "users: 본인만 수정 허용"
  ON public.users FOR UPDATE
  USING (auth.uid() = id);

-- ---- books ----
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "books: 전체 조회 허용"
  ON public.books FOR SELECT
  USING (true);

CREATE POLICY "books: 인증된 사용자만 추가 허용"
  ON public.books FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

-- ---- user_books ----
ALTER TABLE public.user_books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user_books: 본인 데이터만 조회"
  ON public.user_books FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "user_books: 본인 데이터만 추가"
  ON public.user_books FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "user_books: 본인 데이터만 수정"
  ON public.user_books FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "user_books: 본인 데이터만 삭제"
  ON public.user_books FOR DELETE
  USING (auth.uid() = user_id);

-- ---- reviews ----
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews: 전체 조회 허용"
  ON public.reviews FOR SELECT
  USING (true);

CREATE POLICY "reviews: 인증된 사용자만 추가"
  ON public.reviews FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL AND auth.uid() = user_id);

CREATE POLICY "reviews: 본인 리뷰만 수정"
  ON public.reviews FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "reviews: 본인 리뷰만 삭제"
  ON public.reviews FOR DELETE
  USING (auth.uid() = user_id);

-- ---- genre_colors ----
ALTER TABLE public.genre_colors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "genre_colors: 전체 조회 허용"
  ON public.genre_colors FOR SELECT
  USING (true);
