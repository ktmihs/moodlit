import { useCallback, useState } from 'react';
import { handleApiResponse, showApiError } from '../lib/apiError';
import { supabase } from '../lib/supabase';
import type { CalendarData, CalendarEvent } from '../types/book';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

const HIGHLIGHT_COLORS = [
	'#FFD93D', // 노란 형광
	'#6BCB77', // 초록 형광
	'#4D96FF', // 파란 형광
	'#FF6B6B', // 빨간 형광
	'#C77DFF', // 보라 형광
	'#FF9A3C', // 주황 형광
	'#00C2A8', // 청록 형광
];

type PeriodMark = {
	startingDay?: boolean;
	endingDay?: boolean;
	color: string;
};

type MarkedDates = Record<string, { periods: PeriodMark[] }>;

const MAX_BARS = 3;
const OVERFLOW_COLOR = '#d0d0d0';

// book.id 기반 결정적 색상 매핑 → 같은 책은 어느 달에서든 동일 색
function colorForBook(bookId: string): string {
	let h = 0;
	for (let i = 0; i < bookId.length; i++) {
		h = (h * 31 + bookId.charCodeAt(i)) | 0;
	}
	return HIGHLIGHT_COLORS[Math.abs(h) % HIGHLIGHT_COLORS.length];
}

// 이벤트 목록 → multi-period markedDates 변환 (하루 최대 MAX_BARS개, 초과 시 회색 ··· 막대)
function buildPeriodMarks(events: CalendarEvent[]): MarkedDates {
	const result: MarkedDates = {};

	const today = new Date().toISOString().split('T')[0];
	events.forEach(ev => {
		const color = colorForBook(ev.book.id);
		const start = new Date(ev.start_date);
		const endStr = ev.end_date ?? today;
		const end = new Date(endStr);
		const cur = new Date(start);

		while (cur <= end) {
			const dateStr = cur.toISOString().split('T')[0];
			const isFirst = dateStr === ev.start_date;
			const isLast = dateStr === endStr;

			if (!result[dateStr]) result[dateStr] = { periods: [] };
			result[dateStr].periods.push({
				...(isFirst && { startingDay: true }),
				...(isLast && { endingDay: true }),
				color,
			});

			cur.setDate(cur.getDate() + 1);
		}
	});

	// 하루 MAX_BARS 초과 시: 처음 (MAX_BARS - 1)개 유지 + 회색 ··· 막대로 대체
	for (const dateStr of Object.keys(result)) {
		const periods = result[dateStr].periods;
		if (periods.length > MAX_BARS) {
			result[dateStr].periods = [
				...periods.slice(0, MAX_BARS - 1),
				{ startingDay: true, endingDay: true, color: OVERFLOW_COLOR },
			];
		}
	}

	return result;
}

export function useCalendar() {
	const [data, setData] = useState<CalendarData>({
		events: [],
		marked_dates: {},
	});
	const [loading, setLoading] = useState(false);
	const [currentMonth, setCurrentMonth] = useState(() => {
		const now = new Date();
		return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
	});

	const fetchMonth = useCallback(async (month: string) => {
		setLoading(true);
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const res = await fetch(`${API_BASE}/calendar?month=${month}`, {
				headers: { Authorization: `Bearer ${session?.access_token}` },
			});
			await handleApiResponse(res);
			const json: CalendarData = await res.json();
			setData(json);
			setCurrentMonth(month);
		} catch (err) {
			showApiError(err);
		} finally {
			setLoading(false);
		}
	}, []);

	const getEventsForDate = useCallback(
		(dateString: string): CalendarEvent[] => {
			const today = new Date().toISOString().split('T')[0];
			return data.events.filter(ev => {
				const end = ev.end_date ?? today;
				return dateString >= ev.start_date && dateString <= end;
			});
		},
		[data.events],
	);

	const periodMarks = buildPeriodMarks(data.events);

	return {
		data,
		loading,
		currentMonth,
		periodMarks,
		fetchMonth,
		getEventsForDate,
	};
}
