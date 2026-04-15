import { Router } from 'express';
import { apiError, apiSuccess, ErrorCode } from '../lib/errors';
import { checkRateLimit } from '../middleware/rateLimit';

function normalizeGenre(genre: string | null | undefined): string {
	if (!genre || genre.trim() === '') return '기타';
	const trimmed = genre.trim().toLowerCase();
	return trimmed.includes('/') ? trimmed.split('/')[0].trim() : trimmed;
}

const router = Router();

// ── GET /user-books ── 목록 조회 (rank 순)
router.get('/', async (req, res) => {
	const { supabase, user } = req.auth;
	const { allowed } = checkRateLimit(user.id);
	if (!allowed)
		return void apiError(
			res,
			ErrorCode.RATE_LIMITED,
			'요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
		);

	const { data, error } = await supabase
		.from('user_books')
		.select(
			'id, rank, start_date, end_date, created_at, updated_at, books (id, isbn, title, authors, thumbnail, genre, summary)',
		)
		.eq('user_id', user.id)
		.order('rank', { ascending: true });

	if (error) return void apiError(res, ErrorCode.INTERNAL_ERROR, error.message);
	apiSuccess(res, { user_books: data });
});

// ── GET /user-books/:id ── 단건 조회
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
		.from('user_books')
		.select('id, rank, start_date, end_date, created_at, updated_at, books (*)')
		.eq('id', req.params.id)
		.eq('user_id', user.id)
		.single();

	if (error || !data)
		return void apiError(res, ErrorCode.NOT_FOUND, '책을 찾을 수 없습니다.');
	apiSuccess(res, data);
});

// ── POST /user-books ── 책 추가
router.post('/', async (req, res) => {
	const { supabase, user } = req.auth;
	const { allowed } = checkRateLimit(user.id);
	if (!allowed)
		return void apiError(
			res,
			ErrorCode.RATE_LIMITED,
			'요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
		);

	const { book, start_date } = req.body ?? {};

	if (!book?.title)
		return void apiError(
			res,
			ErrorCode.MISSING_PARAM,
			'book.title이 필요합니다.',
		);

	// author(string) 또는 authors(array) 모두 허용
	const authors: string[] = Array.isArray(book.authors)
		? book.authors
		: book.author
			? book.author.split(', ').map((a: string) => a.trim())
			: [];

	const bookPayload = {
		isbn: book.isbn ?? null,
		title: book.title,
		authors,
		thumbnail: book.thumbnail ?? book.cover_image_url ?? null,
		description: book.description ?? null,
		genre: normalizeGenre(book.genre),
	};

	let bookId: string;

	if (book.isbn) {
		const { data: upserted, error: upsertErr } = await supabase
			.from('books')
			.upsert(bookPayload, { onConflict: 'isbn' })
			.select('id')
			.single();

		if (upsertErr || !upserted)
			return void apiError(
				res,
				ErrorCode.INTERNAL_ERROR,
				'책 저장에 실패했습니다.',
			);
		bookId = upserted.id;
	} else {
		const { data: inserted, error: insertErr } = await supabase
			.from('books')
			.insert(bookPayload)
			.select('id')
			.single();

		if (insertErr || !inserted)
			return void apiError(
				res,
				ErrorCode.INTERNAL_ERROR,
				'책 저장에 실패했습니다.',
			);
		bookId = inserted.id;
	}

	// 다음 rank 계산 (현재 최대 rank + 1)
	const { data: maxRankData } = await supabase
		.from('user_books')
		.select('rank')
		.eq('user_id', user.id)
		.order('rank', { ascending: false })
		.limit(1)
		.maybeSingle();

	const nextRank = (maxRankData?.rank ?? 0) + 1;

	const { data, error } = await supabase
		.from('user_books')
		.insert({
			user_id: user.id,
			book_id: bookId,
			rank: nextRank,
			start_date: start_date ?? new Date().toISOString().slice(0, 10),
			end_date: null,
		})
		.select('id, rank, start_date, end_date, created_at, books (*)')
		.single();

	if (error) {
		if (error.code === '23505')
			return void apiError(
				res,
				ErrorCode.CONFLICT,
				'이미 내 책장에 추가된 책입니다.',
			);
		return void apiError(res, ErrorCode.INTERNAL_ERROR, error.message);
	}

	apiSuccess(res, data, 201);
});

// ── PUT /user-books/rank ── 순위 일괄 변경
router.put('/rank', async (req, res) => {
	const { supabase, user } = req.auth;
	const { allowed } = checkRateLimit(user.id);
	if (!allowed)
		return void apiError(
			res,
			ErrorCode.RATE_LIMITED,
			'요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
		);

	const { ids } = req.body ?? {};
	if (!Array.isArray(ids) || ids.length === 0)
		return void apiError(
			res,
			ErrorCode.MISSING_PARAM,
			'ids 배열이 필요합니다.',
		);

	await Promise.all(
		ids.map((id: string, index: number) =>
			supabase
				.from('user_books')
				.update({ rank: index + 1 })
				.eq('id', id)
				.eq('user_id', user.id),
		),
	);

	apiSuccess(res, { message: '순위가 업데이트되었습니다.' });
});

// ── PATCH /user-books/:id ── 날짜 수정
router.patch('/:id', async (req, res) => {
	const { supabase, user } = req.auth;
	const { allowed } = checkRateLimit(user.id);
	if (!allowed)
		return void apiError(
			res,
			ErrorCode.RATE_LIMITED,
			'요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
		);

	const { start_date, end_date } = req.body ?? {};
	const updates: Record<string, unknown> = {};

	if (start_date !== undefined) updates.start_date = start_date;
	if (end_date !== undefined) updates.end_date = end_date;

	if (Object.keys(updates).length === 0)
		return void apiError(
			res,
			ErrorCode.MISSING_PARAM,
			'수정할 항목(start_date, end_date)이 없습니다.',
		);

	const { data, error } = await supabase
		.from('user_books')
		.update(updates)
		.eq('id', req.params.id)
		.eq('user_id', user.id)
		.select(
			'id, rank, start_date, end_date, updated_at, books (id, title, thumbnail)',
		)
		.single();

	if (error || !data)
		return void apiError(res, ErrorCode.NOT_FOUND, '책을 찾을 수 없습니다.');
	apiSuccess(res, data);
});

// ── DELETE /user-books/:id ── 삭제
router.delete('/:id', async (req, res) => {
	const { supabase, user } = req.auth;
	const { allowed } = checkRateLimit(user.id);
	if (!allowed)
		return void apiError(
			res,
			ErrorCode.RATE_LIMITED,
			'요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
		);

	const { error } = await supabase
		.from('user_books')
		.delete()
		.eq('id', req.params.id)
		.eq('user_id', user.id);

	if (error) return void apiError(res, ErrorCode.INTERNAL_ERROR, error.message);
	apiSuccess(res, { message: '삭제되었습니다.' });
});

export default router;
