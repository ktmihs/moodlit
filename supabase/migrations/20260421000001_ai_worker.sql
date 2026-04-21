-- ============================================================
-- AI Worker 스키마 확장
-- ============================================================

-- reviews 테이블에 keywords 컬럼 추가 (AI Worker Step 1 결과)
ALTER TABLE public.reviews
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- books 테이블에 summary 컬럼 추가 (GPT 요약 캐시)
ALTER TABLE public.books
ADD COLUMN IF NOT EXISTS summary TEXT;

-- ============================================================
-- pg-cron 초기화 (Supabase Pro+ 환경에서만 동작)
-- 매일 오전 2시 UTC: 재처리 필요한 리뷰를 'pending'으로 초기화
-- ============================================================
DO $$ BEGIN
  CREATE EXTENSION IF NOT EXISTS pg_cron;

  -- 기존 스케줄 제거 후 재등록
  BEGIN
    PERFORM cron.unschedule('ai-daily-worker');
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  PERFORM cron.schedule(
    'ai-daily-worker',
    '0 2 * * *',
    $inner$
      UPDATE public.reviews
      SET ai_status = 'pending'
      WHERE content IS NOT NULL
        AND content <> ''
        AND (embedding IS NULL OR keywords = '{}')
        AND ai_status NOT IN ('pending', 'processing')
    $inner$
  );
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'pg-cron 설정 건너뜀 (플랜 미지원): %', SQLERRM;
END $$;
