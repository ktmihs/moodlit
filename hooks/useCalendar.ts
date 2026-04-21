import { useCallback, useState } from 'react';
import { handleApiResponse, showApiError } from '../lib/apiError';
import { supabase } from '../lib/supabase';
import type { CalendarData, CalendarEvent } from '../types/book';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

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
			return data.events.filter(ev => {
				const start = ev.start_date;
				const end = ev.end_date ?? ev.start_date;
				return dateString >= start && dateString <= end;
			});
		},
		[data.events],
	);

	return { data, loading, currentMonth, fetchMonth, getEventsForDate };
}
