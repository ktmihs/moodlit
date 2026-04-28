import { Router } from 'express';
import { apiSuccess } from '../lib/errors';

const router = Router();

interface CalendarEvent {
	user_book_id: string;
	book: {
		id: string;
		title: string;
		author: string | null;
		cover_image_url: string | null;
	};
	start_date: string;
	end_date: string | null;
}

// ── GET /calendar ── 사용자의 독서 기간 목록
// query: ?month=YYYY-MM (선택, 없으면 전체)
router.get('/', async (req, res) => {
	const { supabase, user } = req.auth;
	const month = req.query.month as string | undefined;

	let query = supabase
		.from('user_books')
		.select(
			`id,
			 start_date,
			 end_date,
			 books!inner(id, title, author, cover_image_url)`,
		)
		.eq('user_id', user.id)
		.not('start_date', 'is', null)
		.order('start_date', { ascending: true });

	if (month) {
		const from = `${month}-01`;
		const [y, m] = month.split('-').map(Number);
		const nextMonth =
			m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, '0')}-01`;
		// 해당 월과 기간이 겹치는 책: 시작일 < 다음달 첫날 AND (종료일 >= 이번달 첫날 OR 아직 읽는 중)
		query = query
			.lt('start_date', nextMonth)
			.or(`end_date.gte.${from},end_date.is.null`);
	}

	const { data, error } = await query;

	if (error) {
		return void apiSuccess(res, { events: [], marked_dates: {} });
	}

	const events: CalendarEvent[] = (
		(data ?? []) as unknown as {
			id: string;
			start_date: string;
			end_date: string | null;
			books: {
				id: string;
				title: string;
				author: string | null;
				cover_image_url: string | null;
			};
		}[]
	).map(row => ({
		user_book_id: row.id,
		book: row.books,
		start_date: row.start_date,
		end_date: row.end_date,
	}));

	// react-native-calendars markedDates 형식 생성
	// 읽기 시작일 ~ 완료일 사이 모든 날짜에 마커 추가
	const marked_dates: Record<
		string,
		{ dots: { key: string; color: string }[] }
	> = {};

	const addDot = (date: string, key: string) => {
		if (!marked_dates[date]) marked_dates[date] = { dots: [] };
		marked_dates[date].dots.push({ key, color: '#1a1a1a' });
	};

	const today = new Date().toISOString().split('T')[0];
	for (const ev of events) {
		const start = new Date(ev.start_date);
		const end = new Date(ev.end_date ?? today);
		const cur = new Date(start);

		while (cur <= end) {
			addDot(cur.toISOString().split('T')[0], ev.user_book_id);
			cur.setDate(cur.getDate() + 1);
		}
	}

	apiSuccess(res, { events, marked_dates });
});

export default router;
