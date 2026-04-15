import { Router } from 'express';
import { z } from 'zod';
import { apiError, apiSuccess, ErrorCode } from '../lib/errors';
import { validate } from '../lib/validate';

function normalizeGenre(genre: string | null | undefined): string {
	if (!genre || genre.trim() === '') return '기타';
	const trimmed = genre.trim().toLowerCase();
	return trimmed.includes('/') ? trimmed.split('/')[0].trim() : trimmed;
}

const bookSchema = z.object({
	isbn: z.string().optional(),
	title: z.string().min(1, '제목이 필요합니다.'),
	author: z.string().optional(),
	authors: z.array(z.string()).optional(),
	thumbnail: z.string().optional().nullable(),
	cover_image_url: z.string().optional().nullable(),
	description: z.string().optional().nullable(),
	genre: z.string().optional().nullable(),
});

const postBody = z.object({
	book: bookSchema,
	start_date: z
		.string()
		.regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다.')
		.optional(),
});

const patchBody = z
	.object({
		start_date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다.')
			.optional(),
		end_date: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}$/, '날짜 형식은 YYYY-MM-DD여야 합니다.')
			.optional()
			.nullable(),
	})
	.refine(d => d.start_date !== undefined || d.end_date !== undefined, {
		message: '수정할 항목(start_date, end_date)이 없습니다.',
	});

const rankBody = z.object({
	ids: z.array(z.string()).min(1, 'ids 배열이 필요합니다.'),
});

const router = Router();

// ── GET /user-books ── 목록 조회 (rank 순)
router.get('/', async (req, res) => {
	const { supabase, user } = req.auth;

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
router.post('/', validate({ body: postBody }), async (req, res) => {
	const { book, start_date } = req.body as z.infer<typeof postBody>;
	const { supabase, user } = req.auth;

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
router.put('/rank', validate({ body: rankBody }), async (req, res) => {
	const { ids } = req.body as z.infer<typeof rankBody>;
	const { supabase, user } = req.auth;

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
router.patch('/:id', validate({ body: patchBody }), async (req, res) => {
	const { start_date, end_date } = req.body as z.infer<typeof patchBody>;
	const { supabase, user } = req.auth;

	const updates: Record<string, unknown> = {};
	if (start_date !== undefined) updates.start_date = start_date;
	if (end_date !== undefined) updates.end_date = end_date;

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

	const { error } = await supabase
		.from('user_books')
		.delete()
		.eq('id', req.params.id)
		.eq('user_id', user.id);

	if (error) return void apiError(res, ErrorCode.INTERNAL_ERROR, error.message);
	apiSuccess(res, { message: '삭제되었습니다.' });
});

export default router;
