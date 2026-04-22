-- ============================================================
-- pgvector 리뷰 유사도 기반 책 추천 함수
-- ============================================================
CREATE OR REPLACE FUNCTION match_books_by_review(
  p_review_id uuid,
  p_match_count int DEFAULT 10
)
RETURNS TABLE (
  book_id uuid,
  title text,
  author text,
  cover_image_url text,
  genre text,
  similarity float
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  WITH src AS (
    SELECT embedding FROM reviews WHERE id = p_review_id AND embedding IS NOT NULL
  ),
  ranked AS (
    SELECT
      b.id AS book_id,
      b.title,
      b.author,
      b.cover_image_url,
      b.genre,
      (1 - (r.embedding <=> src.embedding))::float AS similarity,
      ROW_NUMBER() OVER (PARTITION BY b.id ORDER BY r.embedding <=> src.embedding) AS rn
    FROM reviews r
    JOIN user_books ub ON r.user_book_id = ub.id
    JOIN books b ON ub.book_id = b.id
    CROSS JOIN src
    WHERE r.id != p_review_id
      AND r.embedding IS NOT NULL
  )
  SELECT book_id, title, author, cover_image_url, genre, similarity
  FROM ranked
  WHERE rn = 1
  ORDER BY similarity DESC
  LIMIT p_match_count;
$$;

-- ============================================================
-- 추천 결과 서버사이드 캐시 테이블
-- ============================================================
CREATE TABLE IF NOT EXISTS public.recommendations (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_id UUID UNIQUE NOT NULL REFERENCES public.reviews(id) ON DELETE CASCADE,
  results   JSONB NOT NULL DEFAULT '[]',
  cached_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "recommendations: 전체 조회"
  ON public.recommendations FOR SELECT
  USING (true);
