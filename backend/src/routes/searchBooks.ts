import { Router } from 'express';
import { apiError, apiSuccess, ErrorCode } from '../lib/errors';
import { checkRateLimit } from '../middleware/rateLimit';

interface Book {
	google_id?: string;
	isbn: string | null;
	title: string;
	author: string | null;
	publisher: string | null;
	published_date: string | null;
	description: string | null;
	cover_image_url: string | null;
	genre: string | null;
}

interface GoogleBookItem {
	id: string;
	volumeInfo: {
		title: string;
		authors?: string[];
		publisher?: string;
		publishedDate?: string;
		description?: string;
		imageLinks?: { thumbnail?: string; smallThumbnail?: string };
		industryIdentifiers?: { type: string; identifier: string }[];
		categories?: string[];
	};
}

interface KakaoBookItem {
	isbn: string;
	title: string;
	authors: string[];
	publisher: string;
	datetime: string;
	contents: string;
	thumbnail: string;
}

async function searchKakao(
	query: string,
	page: number,
	limit: number,
): Promise<{ books: Book[]; total: number }> {
	const kakaoUrl = new URL(process.env.KAKAO_BOOK_URL!);
	kakaoUrl.searchParams.set('query', query);
	kakaoUrl.searchParams.set('page', String(page));
	kakaoUrl.searchParams.set('size', String(limit));

	const res = await fetch(kakaoUrl.toString(), {
		headers: { Authorization: `KakaoAK ${process.env.KAKAO_API_KEY}` },
	});

	if (!res.ok) return { books: [], total: 0 };

	const raw = await res.json();
	const books: Book[] = (raw.documents ?? []).map((item: KakaoBookItem) => ({
		isbn: item.isbn?.split(' ').at(-1) ?? null, // ISBN-13 우선
		title: item.title,
		author: item.authors?.join(', ') ?? null,
		publisher: item.publisher ?? null,
		published_date: item.datetime?.slice(0, 10) ?? null,
		description: item.contents ?? null,
		cover_image_url: item.thumbnail ?? null,
		genre: null,
	}));

	return { books, total: raw.meta?.total_count ?? 0 };
}

async function searchGoogle(
	query: string,
	page: number,
	limit: number,
): Promise<{ books: Book[]; total: number }> {
	const googleUrl = new URL(process.env.GOOGLE_BOOK_URL!);
	googleUrl.searchParams.set('q', query);
	googleUrl.searchParams.set('maxResults', String(limit));
	googleUrl.searchParams.set('startIndex', String((page - 1) * limit));
	googleUrl.searchParams.set('printType', 'books');
	googleUrl.searchParams.set('langRestrict', 'ko');
	if (process.env.GOOGLE_BOOK_KEY)
		googleUrl.searchParams.set('key', process.env.GOOGLE_BOOK_KEY);

	const res = await fetch(googleUrl.toString());
	if (!res.ok) return { books: [], total: 0 };

	const raw = await res.json();
	const books: Book[] = (raw.items ?? []).map((item: GoogleBookItem) => {
		const info = item.volumeInfo;
		const isbn =
			info.industryIdentifiers?.find(
				id => id.type === 'ISBN_13' || id.type === 'ISBN_10',
			)?.identifier ?? null;
		return {
			google_id: item.id,
			isbn,
			title: info.title,
			author: info.authors?.join(', ') ?? null,
			publisher: info.publisher ?? null,
			published_date: info.publishedDate ?? null,
			description: info.description ?? null,
			cover_image_url:
				info.imageLinks?.thumbnail ?? info.imageLinks?.smallThumbnail ?? null,
			genre: info.categories?.[0] ?? null,
		};
	});

	return { books, total: raw.totalItems ?? 0 };
}

const router = Router();

router.get('/', async (req, res) => {
	const { user } = req.auth;
	const { allowed, remaining } = checkRateLimit(user.id);
	if (!allowed)
		return void apiError(
			res,
			ErrorCode.RATE_LIMITED,
			'요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
		);

	const query = req.query.q as string | undefined;
	const page = parseInt((req.query.page as string) ?? '1', 10);
	const limit = Math.min(parseInt((req.query.limit as string) ?? '10', 10), 40);

	if (!query || query.trim().length === 0) {
		return void apiError(
			res,
			ErrorCode.MISSING_PARAM,
			'검색어(q)가 필요합니다.',
		);
	}

	// 카카오 우선 검색
	const kakao = await searchKakao(query.trim(), page, limit);

	// 카카오 결과가 부족하면 구글로 보완
	if (kakao.books.length >= limit || kakao.total > 0) {
		return apiSuccess(res, {
			books: kakao.books,
			total: kakao.total,
			page,
			limit,
			source: 'kakao',
			remaining_requests: remaining,
		});
	}

	const google = await searchGoogle(query.trim(), page, limit);
	if (google.books.length === 0) {
		return void apiError(
			res,
			ErrorCode.GOOGLE_BOOKS_ERROR,
			'검색 결과가 없습니다.',
		);
	}

	apiSuccess(res, {
		books: google.books,
		total: google.total,
		page,
		limit,
		source: 'google',
		remaining_requests: remaining,
	});
});

export default router;
