import { Router } from 'express';
import { z } from 'zod';
import { generateEmbedding } from '../lib/embedding';
import { apiError, apiSuccess, ErrorCode } from '../lib/errors';
import { validate } from '../lib/validate';

const postBody = z.object({
	user_book_id: z.string().min(1, 'user_book_id가 필요합니다.'),
	content: z
		.string()
		.max(2_000, 'content는 2,000자 이내여야 합니다.')
		.optional()
		.nullable(),
	rating: z.number().int().min(1).max(5).nullable().optional(),
	memo: z
		.string()
		.max(2_000, 'memo는 2,000자 이내여야 합니다.')
		.nullable()
		.optional(),
	sentences: z.array(z.string()).optional(),
});

const patchBody = z.object({
	content: z
		.string()
		.max(2_000, 'content는 2,000자 이내여야 합니다.')
		.optional()
		.nullable(),
	rating: z.number().int().min(1).max(5).nullable().optional(),
	memo: z
		.string()
		.max(2_000, 'memo는 2,000자 이내여야 합니다.')
		.nullable()
		.optional(),
	sentences: z.array(z.string()).optional(),
});

const router = Router();

const SELECT_FIELDS =
	'id, content, ai_status, rating, memo, sentences, created_at, updated_at, user_book_id';

// ── GET /reviews/:id ── 단건 조회
router.get('/:id', async (req, res) => {
	const { supabase } = req.auth;

	const { data, error } = await supabase
		.from('reviews')
		.select(SELECT_FIELDS)
		.eq('id', req.params.id)
		.single();

	if (error || !data)
		return void apiError(res, ErrorCode.NOT_FOUND, '리뷰를 찾을 수 없습니다.');
	apiSuccess(res, data);
});

// ── POST /reviews ── 리뷰 작성
router.post('/', validate({ body: postBody }), async (req, res) => {
	const { user_book_id, content, rating, memo, sentences } =
		req.body as z.infer<typeof postBody>;
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
			content: content?.trim() ?? null,
			ai_status: content ? 'pending' : null,
			rating: rating ?? null,
			memo: memo?.trim() ?? null,
			sentences: sentences ?? [],
		})
		.select(SELECT_FIELDS)
		.single();

	if (error) return void apiError(res, ErrorCode.INTERNAL_ERROR, error.message);

	if (data.content) generateEmbedding(data.id, data.content).catch(() => {});

	apiSuccess(res, data, 201);
});

// ── PATCH /reviews/:id ── 리뷰 수정
router.patch('/:id', validate({ body: patchBody }), async (req, res) => {
	const { content, rating, memo, sentences } = req.body as z.infer<
		typeof patchBody
	>;
	const { supabase, user } = req.auth;

	// 소유권 확인: review → user_book → user_id
	const { data: existing } = await supabase
		.from('reviews')
		.select('id, user_books!inner(user_id)')
		.eq('id', req.params.id)
		.single();

	if (!existing)
		return void apiError(res, ErrorCode.NOT_FOUND, '리뷰를 찾을 수 없습니다.');

	const userBook = (existing as unknown as { user_books: { user_id: string } })
		.user_books;
	if (userBook?.user_id !== user.id)
		return void apiError(res, ErrorCode.FORBIDDEN, '접근 권한이 없습니다.');

	const updates: Record<string, unknown> = {};
	if (content !== undefined) {
		updates.content = content?.trim() ?? null;
		updates.embedding = null;
		updates.ai_status = content ? 'pending' : null;
	}
	if (rating !== undefined) updates.rating = rating;
	if (memo !== undefined) updates.memo = memo?.trim() ?? null;
	if (sentences !== undefined) updates.sentences = sentences;

	const { data, error } = await supabase
		.from('reviews')
		.update(updates)
		.eq('id', req.params.id)
		.select(SELECT_FIELDS)
		.single();

	if (error || !data)
		return void apiError(res, ErrorCode.NOT_FOUND, '리뷰를 찾을 수 없습니다.');

	if (content) generateEmbedding(data.id, content.trim()).catch(() => {});

	apiSuccess(res, data);
});

// ── GET /reviews/:id/recommendations ── 카카오 검색 기반 추천
router.get('/:id/recommendations', async (req, res) => {
	const { supabase, user } = req.auth;
	const page = Math.max(1, parseInt(req.query.page as string) || 1);
	const PAGE_SIZE = 3;

	const { data: review } = await supabase
		.from('reviews')
		.select('content')
		.eq('id', req.params.id)
		.single();

	const searchContent = (review as unknown as { content: string | null } | null)
		?.content;

	if (!searchContent)
		return void apiError(res, ErrorCode.NOT_FOUND, '분석할 감상이 없습니다.');

	// OpenAI로 개별 키워드 추출 (실패 시 원문 단어로 폴백)
	let keywords: string[] = searchContent.split(/\s+/).slice(0, 2);
	try {
		const openaiRes = await fetch(
			'https://api.openai.com/v1/chat/completions',
			{
				method: 'POST',
				headers: {
					Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					model: 'gpt-4o-mini',
					messages: [
						{
							role: 'system',
							content:
								'독자의 독서 감상을 읽고, 카카오 책 검색에 쓸 핵심 키워드를 2~3개 추출하세요. 각 키워드는 짧은 단어 또는 구 (예: 추리소설, 범죄, 스릴러). 쉼표로 구분해서 응답하세요.',
						},
						{ role: 'user', content: searchContent },
					],
					max_tokens: 60,
					temperature: 0.3,
				}),
			},
		);
		if (openaiRes.ok) {
			const aiJson = await openaiRes.json();
			const extracted = aiJson.choices?.[0]?.message?.content?.trim();
			if (extracted) {
				const parsed = extracted
					.split(/[,，\n]/)
					.map((k: string) => k.trim())
					.filter(Boolean);
				if (parsed.length > 0) keywords = parsed.slice(0, 3);
			}
		}
	} catch {
		// OpenAI 실패 시 원문 단어로 폴백
	}

	// 내 서재 ISBN 목록 (필터링용)
	const { data: myBooks } = await supabase
		.from('user_books')
		.select('books(isbn)')
		.eq('user_id', user.id);

	const myIsbns = new Set<string>(
		(myBooks ?? []).flatMap(ub => {
			const b = (ub as unknown as { books: { isbn: string | null } }).books;
			return b?.isbn ? [b.isbn] : [];
		}),
	);

	interface KakaoItem {
		isbn: string;
		title: string;
		authors: string[];
		thumbnail: string;
	}

	// 키워드별 병렬 검색
	const keywordResults = await Promise.all(
		keywords.map(async keyword => {
			const url = new URL(process.env.KAKAO_BOOK_URL!);
			url.searchParams.set('query', keyword);
			url.searchParams.set('page', '1');
			url.searchParams.set('size', '10');
			const r = await fetch(url.toString(), {
				headers: { Authorization: `KakaoAK ${process.env.KAKAO_API_KEY}` },
			});
			if (!r.ok) return [] as KakaoItem[];
			const json = await r.json();
			return (json.documents ?? []) as KakaoItem[];
		}),
	);

	// 겹치는 키워드 수로 점수 계산 → 내림차순 정렬
	const scoreMap = new Map<string, { item: KakaoItem; score: number }>();
	keywordResults.forEach(docs => {
		docs.forEach(item => {
			const key = item.isbn?.split(' ').at(-1) || item.title;
			const entry = scoreMap.get(key);
			if (entry) entry.score += 1;
			else scoreMap.set(key, { item, score: 1 });
		});
	});

	const allSorted = Array.from(scoreMap.values())
		.sort((a, b) => b.score - a.score)
		.map(({ item }) => ({
			isbn: item.isbn?.split(' ').at(-1) ?? null,
			title: item.title,
			author: item.authors?.join(', ') ?? null,
			cover_image_url: item.thumbnail ?? null,
		}))
		.filter(b => !b.isbn || !myIsbns.has(b.isbn));

	const offset = (page - 1) * PAGE_SIZE;
	const paginated = allSorted.slice(offset, offset + PAGE_SIZE);

	apiSuccess(res, {
		recommendations: paginated,
		page,
		has_more: allSorted.length > offset + PAGE_SIZE,
		_debug: { keywords, total: allSorted.length },
	});
});

// ── DELETE /reviews/:id ── 리뷰 삭제
router.delete('/:id', async (req, res) => {
	const { supabase, user } = req.auth;

	const { data: existing } = await supabase
		.from('reviews')
		.select('id, user_books!inner(user_id)')
		.eq('id', req.params.id)
		.single();

	if (!existing)
		return void apiError(res, ErrorCode.NOT_FOUND, '리뷰를 찾을 수 없습니다.');

	const userBook = (existing as unknown as { user_books: { user_id: string } })
		.user_books;
	if (userBook?.user_id !== user.id)
		return void apiError(res, ErrorCode.FORBIDDEN, '접근 권한이 없습니다.');

	const { error } = await supabase
		.from('reviews')
		.delete()
		.eq('id', req.params.id);

	if (error) return void apiError(res, ErrorCode.INTERNAL_ERROR, error.message);
	apiSuccess(res, { message: '리뷰가 삭제되었습니다.' });
});

export default router;
