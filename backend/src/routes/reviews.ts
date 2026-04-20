import { Router } from 'express';
import { z } from 'zod';
import { apiError, apiSuccess, ErrorCode } from '../lib/errors';
import { validate } from '../lib/validate';

const postBody = z.object({
	user_book_id: z.string().min(1, 'user_book_id가 필요합니다.'),
	rating: z.number().int().min(1).max(5).nullable().optional(),
	memo: z.string().max(2_000, 'memo는 2,000자 이내여야 합니다.').nullable().optional(),
	sentences: z.array(z.string()).optional(),
});

const patchBody = z.object({
	rating: z.number().int().min(1).max(5).nullable().optional(),
	memo: z.string().max(2_000, 'memo는 2,000자 이내여야 합니다.').nullable().optional(),
	sentences: z.array(z.string()).optional(),
});

const router = Router();

// ── GET /reviews/:id ── 단건 조회
router.get('/:id', async (req, res) => {
	const { supabase } = req.auth;

	const { data, error } = await supabase
		.from('reviews')
		.select('id, rating, memo, sentences, created_at, updated_at, user_book_id')
		.eq('id', req.params.id)
		.single();

	if (error || !data)
		return void apiError(res, ErrorCode.NOT_FOUND, '리뷰를 찾을 수 없습니다.');
	apiSuccess(res, data);
});

// ── POST /reviews ── 리뷰 작성
router.post('/', validate({ body: postBody }), async (req, res) => {
	const { user_book_id, rating, memo, sentences } = req.body as z.infer<typeof postBody>;
	const { supabase, user } = req.auth;

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
			rating: rating ?? null,
			memo: memo?.trim() ?? null,
			sentences: sentences ?? [],
		})
		.select('id, rating, memo, sentences, created_at, updated_at, user_book_id')
		.single();

	if (error) return void apiError(res, ErrorCode.INTERNAL_ERROR, error.message);
	apiSuccess(res, data, 201);
});

// ── PATCH /reviews/:id ── 리뷰 수정
router.patch('/:id', validate({ body: patchBody }), async (req, res) => {
	const { rating, memo, sentences } = req.body as z.infer<typeof patchBody>;
	const { supabase, user } = req.auth;

	// 소유권 확인: review → user_book → user_id
	const { data: existing } = await supabase
		.from('reviews')
		.select('id, user_books!inner(user_id)')
		.eq('id', req.params.id)
		.single();

	if (!existing)
		return void apiError(res, ErrorCode.NOT_FOUND, '리뷰를 찾을 수 없습니다.');

	const userBooks = (existing as unknown as { user_books: { user_id: string }[] }).user_books;
	if (userBooks[0]?.user_id !== user.id)
		return void apiError(res, ErrorCode.FORBIDDEN, '접근 권한이 없습니다.');

	const updates: Record<string, unknown> = {};
	if (rating !== undefined) updates.rating = rating;
	if (memo !== undefined) updates.memo = memo?.trim() ?? null;
	if (sentences !== undefined) updates.sentences = sentences;

	const { data, error } = await supabase
		.from('reviews')
		.update(updates)
		.eq('id', req.params.id)
		.select('id, rating, memo, sentences, created_at, updated_at, user_book_id')
		.single();

	if (error || !data)
		return void apiError(res, ErrorCode.NOT_FOUND, '리뷰를 찾을 수 없습니다.');

	apiSuccess(res, data);
});

// ── DELETE /reviews/:id ── 리뷰 삭제
router.delete('/:id', async (req, res) => {
	const { supabase, user } = req.auth;

	// 소유권 확인
	const { data: existing } = await supabase
		.from('reviews')
		.select('id, user_books!inner(user_id)')
		.eq('id', req.params.id)
		.single();

	if (!existing)
		return void apiError(res, ErrorCode.NOT_FOUND, '리뷰를 찾을 수 없습니다.');

	const userBooks = (existing as unknown as { user_books: { user_id: string }[] }).user_books;
	if (userBooks[0]?.user_id !== user.id)
		return void apiError(res, ErrorCode.FORBIDDEN, '접근 권한이 없습니다.');

	const { error } = await supabase.from('reviews').delete().eq('id', req.params.id);

	if (error) return void apiError(res, ErrorCode.INTERNAL_ERROR, error.message);
	apiSuccess(res, { message: '리뷰가 삭제되었습니다.' });
});

export default router;
