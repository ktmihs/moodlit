import { Router } from 'express';
import { generateEmbedding } from '../lib/embedding';
import { apiError, apiSuccess, ErrorCode } from '../lib/errors';
import { checkRateLimit } from '../middleware/rateLimit';

const router = Router();

// ── GET /reviews/:id ── 단건 조회
router.get('/:id', async (req, res) => {
	const { supabase, user } = req.auth;
	const { allowed } = checkRateLimit(user.id);
	if (!allowed)
		return void apiError(
			res,
			ErrorCode.RATE_LIMITED,
			'요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
		);

	const { data, error } = await supabase
		.from('reviews')
		.select('id, content, keywords, ai_status, created_at, user_book_id')
		.eq('id', req.params.id)
		.single();

	if (error || !data)
		return void apiError(res, ErrorCode.NOT_FOUND, '리뷰를 찾을 수 없습니다.');
	apiSuccess(res, data);
});

// ── POST /reviews ── 리뷰 작성
router.post('/', async (req, res) => {
	const { supabase, user } = req.auth;
	const { allowed } = checkRateLimit(user.id);
	if (!allowed)
		return void apiError(
			res,
			ErrorCode.RATE_LIMITED,
			'요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
		);

	const { user_book_id, content } = req.body ?? {};
	if (!user_book_id)
		return void apiError(
			res,
			ErrorCode.MISSING_PARAM,
			'user_book_id가 필요합니다.',
		);
	if (!content || content.trim().length === 0)
		return void apiError(res, ErrorCode.MISSING_PARAM, 'content가 필요합니다.');
	if (content.trim().length > 2_000)
		return void apiError(
			res,
			ErrorCode.VALIDATION_ERROR,
			'content는 2,000자 이내여야 합니다.',
		);

	// user_book이 본인 소유인지 확인
	const { data: userBook } = await supabase
		.from('user_books')
		.select('id')
		.eq('id', user_book_id)
		.eq('user_id', user.id)
		.single();

	if (!userBook)
		return void apiError(res, ErrorCode.FORBIDDEN, '접근 권한이 없습니다.');

	const { data, error } = await supabase
		.from('reviews')
		.insert({
			user_book_id,
			content: content.trim(),
			ai_status: 'pending',
		})
		.select('id, content, ai_status, created_at, user_book_id')
		.single();

	if (error) return void apiError(res, ErrorCode.INTERNAL_ERROR, error.message);

	generateEmbedding(data.id, data.content).catch(() => {});

	apiSuccess(res, data, 201);
});

// ── PATCH /reviews/:id ── 리뷰 수정
router.patch('/:id', async (req, res) => {
	const { supabase, user } = req.auth;
	const { allowed } = checkRateLimit(user.id);
	if (!allowed)
		return void apiError(
			res,
			ErrorCode.RATE_LIMITED,
			'요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
		);

	const { content } = req.body ?? {};
	if (content === undefined)
		return void apiError(res, ErrorCode.MISSING_PARAM, 'content가 필요합니다.');
	if (content.trim().length === 0)
		return void apiError(
			res,
			ErrorCode.VALIDATION_ERROR,
			'content가 비어있습니다.',
		);
	if (content.trim().length > 2_000)
		return void apiError(
			res,
			ErrorCode.VALIDATION_ERROR,
			'content는 2,000자 이내여야 합니다.',
		);

	// 소유권 확인: review → user_book → user_id
	const { data: existing } = await supabase
		.from('reviews')
		.select('id, user_books!inner(user_id)')
		.eq('id', req.params.id)
		.single();

	if (!existing)
		return void apiError(res, ErrorCode.NOT_FOUND, '리뷰를 찾을 수 없습니다.');

	const userBooks = (
		existing as unknown as { user_books: { user_id: string }[] }
	).user_books;
	if (userBooks[0]?.user_id !== user.id)
		return void apiError(res, ErrorCode.FORBIDDEN, '접근 권한이 없습니다.');

	const { data, error } = await supabase
		.from('reviews')
		.update({
			content: content.trim(),
			embedding: null,
			ai_status: 'pending',
		})
		.eq('id', req.params.id)
		.select('id, content, ai_status, created_at, user_book_id')
		.single();

	if (error || !data)
		return void apiError(res, ErrorCode.NOT_FOUND, '리뷰를 찾을 수 없습니다.');

	generateEmbedding(data.id, data.content as string).catch(() => {});

	apiSuccess(res, data);
});

// ── DELETE /reviews/:id ── 리뷰 삭제
router.delete('/:id', async (req, res) => {
	const { supabase, user } = req.auth;
	const { allowed } = checkRateLimit(user.id);
	if (!allowed)
		return void apiError(
			res,
			ErrorCode.RATE_LIMITED,
			'요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
		);

	// 소유권 확인: review → user_book → user_id
	const { data: existing } = await supabase
		.from('reviews')
		.select('id, user_books!inner(user_id)')
		.eq('id', req.params.id)
		.single();

	if (!existing)
		return void apiError(res, ErrorCode.NOT_FOUND, '리뷰를 찾을 수 없습니다.');

	const userBooks = (
		existing as unknown as { user_books: { user_id: string }[] }
	).user_books;
	if (userBooks[0]?.user_id !== user.id)
		return void apiError(res, ErrorCode.FORBIDDEN, '접근 권한이 없습니다.');

	const { error } = await supabase
		.from('reviews')
		.delete()
		.eq('id', req.params.id);

	if (error) return void apiError(res, ErrorCode.INTERNAL_ERROR, error.message);
	apiSuccess(res, { message: '리뷰가 삭제되었습니다.' });
});

export default router;
