import { Router } from 'express';
import { apiError, apiSuccess, ErrorCode } from '../lib/errors';
import { generateSummaryIfNeeded } from '../lib/summary';

const router = Router();

// ── GET /books/:id/summary ── 캐시된 요약 반환 (없으면 생성 후 반환)
router.get('/:id/summary', async (req, res) => {
	const { supabase } = req.auth;

	const { data: book, error } = await supabase
		.from('books')
		.select('id, summary')
		.eq('id', req.params.id)
		.single();

	if (error || !book)
		return void apiError(res, ErrorCode.NOT_FOUND, '책을 찾을 수 없습니다.');

	if (book.summary) return void apiSuccess(res, { summary: book.summary });

	// 캐시 미스: 생성 후 반환
	await generateSummaryIfNeeded(req.params.id);

	const { data: updated } = await supabase
		.from('books')
		.select('summary')
		.eq('id', req.params.id)
		.single();

	apiSuccess(res, { summary: updated?.summary ?? null });
});

export default router;
