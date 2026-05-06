import { useCallback, useState } from 'react';
import { handleApiResponse, showApiError } from '../lib/apiError';
import { supabase } from '../lib/supabase';
import type { RecommendedBook } from '../types/book';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export function useRecommendations() {
	const [recommendations, setRecommendations] = useState<RecommendedBook[]>(
		[],
	);
	const [loading, setLoading] = useState(false);
	const [pendingCount, setPendingCount] = useState(0);
	const [minRating, setMinRating] = useState(4);

	const fetchAggregate = useCallback(async (rating: number, shuffle = false) => {
		setLoading(true);
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const params = new URLSearchParams({ min_rating: String(rating) });
			if (shuffle) params.set('shuffle', 'true');
			const res = await fetch(
				`${API_BASE}/recommendations/aggregate?${params.toString()}`,
				{ headers: { Authorization: `Bearer ${session?.access_token}` } },
			);
			await handleApiResponse(res);
			const json = await res.json();
			setRecommendations(json.recommendations ?? []);
			setPendingCount(json.pending_count ?? 0);
		} catch (err) {
			showApiError(err);
		} finally {
			setLoading(false);
		}
	}, []);

	const changeRating = useCallback(
		(rating: number) => {
			setMinRating(rating);
			fetchAggregate(rating);
		},
		[fetchAggregate],
	);

	const refresh = useCallback(
		(shuffle = false) => fetchAggregate(minRating, shuffle),
		[fetchAggregate, minRating],
	);

	return {
		recommendations,
		loading,
		pendingCount,
		minRating,
		changeRating,
		refresh,
	};
}
