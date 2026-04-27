import { Router } from 'express';
import { z } from 'zod';
import { apiError, apiSuccess, ErrorCode } from '../lib/errors';
import { validate } from '../lib/validate';
import { getAdminClient } from '../middleware/auth';

const router = Router();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6시간

const postBody = z.object({
	review_id: z.string().uuid('유효한 review_id가 필요합니다.'),
	refresh: z.boolean().optional().default(false),
});

interface VectorBook {
	book_id: string;
	title: string;
	author: string | null;
	cover_image_url: string | null;
	similarity: number;
}

interface RecBook {
	isbn: string | null;
	title: string;
	author: string | null;
	cover_image_url: string | null;
	reason: string | null;
	similarity: number | null;
}

type RecEntry = RecBook & { score: number };

async function buildRecommendations(
	reviewId: string,
	userId: string,
	userSupabase: any,
): Promise<RecBook[]> {
	const admin = getAdminClient();

	// 1. pgvector 유사도 검색
	const { data: vectorResults } = await admin.rpc('match_books_by_review', {
		p_review_id: reviewId,
		p_match_count: 10,
	});

	// 2. 리뷰 + 책 정보 조회
	const { data: review } = await userSupabase
		.from('reviews')
		.select('content, keywords, user_books(books(title, genre, summary))')
		.eq('id', reviewId)
		.single();

	const bookInfo = (review?.user_books as Record<string, unknown>)?.books as
		| { title?: string; genre?: string; summary?: string }
		| undefined;
	const bookContext = [bookInfo?.title, bookInfo?.genre, bookInfo?.summary]
		.filter(Boolean)
		.join(' / ');

	// 3. 검색 키워드 생성 (책 주제 + 리뷰 감상 결합)
	let keywords: string[] = [];
	if (review?.content) {
		const storedKeywords = ((review?.keywords as string[] | null) ?? []).slice(
			0,
			3,
		);
		if (bookContext) {
			try {
				const kwRes = await fetch(
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
										'독자의 감상과 책 정보를 바탕으로 카카오 도서 검색에 쓸 검색어 3개를 생성하세요. 책의 주제·장르와 독자가 좋아한 요소를 결합해야 합니다. JSON 배열만 응답: ["검색어1","검색어2","검색어3"]',
								},
								{
									role: 'user',
									content: `책: ${bookContext}\n감상: ${review.content}`,
								},
							],
							max_tokens: 80,
							temperature: 0.3,
						}),
					},
				);
				if (kwRes.ok) {
					const kwJson = await kwRes.json();
					const text: string =
						kwJson.choices?.[0]?.message?.content?.trim() ?? '';
					const parsed = JSON.parse(text) as string[];
					if (Array.isArray(parsed)) keywords = parsed.slice(0, 3);
				}
			} catch {
				// keyword 생성 실패 시 fallback
			}
		}
		if (keywords.length === 0) {
			keywords =
				storedKeywords.length > 0
					? storedKeywords
					: (review.content as string).split(/\s+/).slice(0, 3);
		}
	}

	// 4. 내 서재 ISBN 필터링
	const { data: myUserBooks } = await userSupabase
		.from('user_books')
		.select('books(isbn)')
		.eq('user_id', userId);

	const myIsbns = new Set<string>(
		(myUserBooks ?? []).flatMap((ub: any) =>
			ub.books?.isbn ? [ub.books.isbn] : [],
		),
	);

	// 결과 병합 맵
	const merged = new Map<string, RecEntry>();

	// pgvector 결과 (가중치 3배)
	((vectorResults as VectorBook[] | null) ?? []).forEach(r => {
		merged.set(r.book_id, {
			isbn: null,
			title: r.title,
			author: r.author,
			cover_image_url: r.cover_image_url,
			reason: null,
			similarity: r.similarity,
			score: r.similarity * 3,
		});
	});

	// Kakao 키워드 검색 결과
	if (keywords.length > 0) {
		const kakaoResults = await Promise.allSettled(
			keywords.map(async keyword => {
				const url = new URL(process.env.KAKAO_BOOK_URL!);
				url.searchParams.set('query', keyword);
				url.searchParams.set('size', '10');
				const r = await fetch(url.toString(), {
					headers: { Authorization: `KakaoAK ${process.env.KAKAO_API_KEY}` },
				});
				if (!r.ok) return [];
				const json = await r.json();
				return (json.documents ?? []) as any[];
			}),
		);

		kakaoResults.forEach(result => {
			if (result.status !== 'fulfilled') return;
			result.value.forEach((item: any) => {
				const isbn = item.isbn?.split(' ').at(-1) ?? null;
				const key = isbn ?? item.title;
				const existing = merged.get(key);
				if (!existing) {
					merged.set(key, {
						isbn,
						title: item.title,
						author: item.authors?.join(', ') ?? null,
						cover_image_url: item.thumbnail ?? null,
						reason: null,
						similarity: null,
						score: 1,
					});
				} else {
					existing.score += 0.5;
					if (isbn && !existing.isbn) existing.isbn = isbn;
				}
			});
		});
	}

	const sorted = Array.from(merged.values())
		.filter(b => !b.isbn || !myIsbns.has(b.isbn))
		.sort((a, b) => b.score - a.score)
		.slice(0, 10);

	// GPT-4o-mini 추천 이유 생성 (top 5)
	if (sorted.length > 0 && review?.content) {
		try {
			const top5 = sorted.slice(0, 5);
			const bookList = top5
				.map((b, i) => `${i + 1}. ${b.title} (${b.author ?? '저자 미상'})`)
				.join('\n');

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
									'독자의 감상을 바탕으로 각 추천 책에 대한 추천 이유를 10~15자로 작성하세요. 반드시 JSON 배열만 응답하세요: [{"index":1,"reason":"..."},...]',
							},
							{
								role: 'user',
								content: `감상: ${review.content}\n\n추천 책:\n${bookList}`,
							},
						],
						max_tokens: 200,
						temperature: 0.4,
					}),
				},
			);

			if (openaiRes.ok) {
				const aiJson = await openaiRes.json();
				const text: string =
					aiJson.choices?.[0]?.message?.content?.trim() ?? '';
				const reasons = JSON.parse(text) as { index: number; reason: string }[];
				reasons.forEach(({ index, reason }) => {
					if (index >= 1 && index <= top5.length) {
						sorted[index - 1].reason = reason;
					}
				});
			}
		} catch {
			// reason 생성 실패는 non-critical
		}
	}

	return sorted.map(({ score: _score, ...rest }) => rest);
}

// ── POST /recommendations ──
router.post('/', validate({ body: postBody }), async (req, res) => {
	const { review_id, refresh } = req.body as z.infer<typeof postBody>;
	const { supabase, user } = req.auth;
	const admin = getAdminClient();

	// 리뷰 존재 + 내용 확인
	const { data: review } = await supabase
		.from('reviews')
		.select('id, content')
		.eq('id', review_id)
		.single();

	if (!review)
		return void apiError(res, ErrorCode.NOT_FOUND, '리뷰를 찾을 수 없습니다.');
	if (!(review as { content: string | null }).content)
		return void apiError(
			res,
			ErrorCode.MISSING_PARAM,
			'분석할 감상이 없습니다.',
		);

	// 캐시 확인
	const { data: cached } = await admin
		.from('recommendations')
		.select('results, cached_at')
		.eq('review_id', review_id)
		.maybeSingle();

	const age = cached
		? Date.now() -
			new Date((cached as { cached_at: string }).cached_at).getTime()
		: Infinity;
	const isFresh = age < CACHE_TTL_MS;

	// 신선한 캐시 → 즉시 반환
	if (cached && isFresh && !refresh) {
		return void apiSuccess(res, {
			recommendations: (cached as { results: RecBook[] }).results,
			cached_at: (cached as { cached_at: string }).cached_at,
			is_cached: true,
		});
	}

	// 오래된 캐시 → stale 즉시 반환 + 백그라운드 갱신 (SWR)
	if (cached && !isFresh && !refresh) {
		apiSuccess(res, {
			recommendations: (cached as { results: RecBook[] }).results,
			cached_at: (cached as { cached_at: string }).cached_at,
			is_cached: true,
			is_stale: true,
		});

		buildRecommendations(review_id, user.id, supabase)
			.then(recommendations =>
				admin.from('recommendations').upsert(
					{
						review_id,
						results: recommendations,
						cached_at: new Date().toISOString(),
					},
					{ onConflict: 'review_id' },
				),
			)
			.catch(() => {});
		return;
	}

	// 캐시 없음 or 강제 갱신 → 새로 생성
	try {
		const recommendations = await buildRecommendations(
			review_id,
			user.id,
			supabase,
		);

		await admin.from('recommendations').upsert(
			{
				review_id,
				results: recommendations,
				cached_at: new Date().toISOString(),
			},
			{ onConflict: 'review_id' },
		);

		apiSuccess(res, {
			recommendations,
			cached_at: new Date().toISOString(),
			is_cached: false,
		});
	} catch {
		apiError(res, ErrorCode.INTERNAL_ERROR, '추천 생성에 실패했습니다.');
	}
});

export default router;
