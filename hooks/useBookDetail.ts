import { useCallback, useEffect, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import { handleApiResponse, showApiError } from '../lib/apiError';
import { supabase } from '../lib/supabase';
import type {
	ReadingStatus,
	RecommendedBook,
	Review,
	SummaryState,
	UserBook,
} from '../types/book';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';

export function deriveStatus(book: UserBook): ReadingStatus {
	if (book.end_date) return 'finished';
	if (book.start_date) return 'reading';
	return 'want';
}

function today(): string {
	return new Date().toISOString().split('T')[0];
}

export function useBookDetail(userBook: UserBook | null) {
	const [review, setReview] = useState<Review | null>(null);
	const [loading, setLoading] = useState(false);
	const [saving, setSaving] = useState(false);
	const [localBook, setLocalBook] = useState<UserBook | null>(userBook);
	const [recommendations, setRecommendations] = useState<RecommendedBook[]>([]);
	const [fetchingRecs, setFetchingRecs] = useState(false);
	const [recsPage, setRecsPage] = useState(1);
	const [hasMoreRecs, setHasMoreRecs] = useState(false);
	const [summary, setSummary] = useState<SummaryState>({ status: 'idle' });
	const lastBookIdRef = useRef<string | null>(null);

	useEffect(() => {
		const newId = userBook?.id ?? null;
		// 다른 책으로 바뀔 때만 초기화 (닫기→같은책 재열기는 유지)
		if (newId !== null && newId !== lastBookIdRef.current) {
			setRecommendations([]);
			setRecsPage(1);
			setHasMoreRecs(false);
			setSummary({ status: 'idle' });
		}
		if (newId !== null) lastBookIdRef.current = newId;

		setLocalBook(userBook);
		if (!userBook) {
			setReview(null);
			return;
		}
		setLoading(true);
		supabase
			.from('reviews')
			.select('*')
			.eq('user_book_id', userBook.id)
			.maybeSingle()
			.then(({ data }) => {
				const raw = data as unknown as Review | null;
				setReview(raw ? { ...raw, sentences: raw.sentences ?? [] } : null);
				setLoading(false);
			});
	}, [userBook?.id]); // eslint-disable-line react-hooks/exhaustive-deps

	const status = localBook ? deriveStatus(localBook) : 'want';

	const updateStatus = useCallback(
		(newStatus: ReadingStatus) => {
			if (!localBook) return;

			let start_date = localBook.start_date;
			let end_date = localBook.end_date;

			if (newStatus === 'want') {
				start_date = null;
				end_date = null;
			} else if (newStatus === 'reading') {
				start_date = start_date ?? today();
				end_date = null;
			} else {
				start_date = start_date ?? today();
				end_date = end_date ?? today();
			}

			setLocalBook(prev => (prev ? { ...prev, start_date, end_date } : prev));
		},
		[localBook],
	);

	const saveDates = useCallback(
		async (startDate: string | null, endDate: string | null) => {
			if (!localBook) return;
			setSaving(true);
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();
				const res = await fetch(`${API_BASE}/user-books/${localBook.id}`, {
					method: 'PATCH',
					headers: {
						Authorization: `Bearer ${session?.access_token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ start_date: startDate, end_date: endDate }),
				});
				await handleApiResponse(res);
				setLocalBook(prev =>
					prev ? { ...prev, start_date: startDate, end_date: endDate } : prev,
				);
				Toast.show({ type: 'success', text1: '저장했습니다.' });
			} catch (err) {
				showApiError(err);
			} finally {
				setSaving(false);
			}
		},
		[localBook],
	);

	const saveReview = useCallback(
		async (
			rating: number | null,
			memo: string,
			sentences: string[],
			content: string,
		) => {
			if (!localBook) return;
			setSaving(true);
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();

				const body = {
					user_book_id: localBook.id,
					content: content.trim() || null,
					rating: rating || null,
					memo: memo.trim() || null,
					sentences,
				};
				const headers: Record<string, string> = {
					Authorization: `Bearer ${session?.access_token}`,
					'Content-Type': 'application/json',
				};

				const res = review?.id
					? await fetch(`${API_BASE}/reviews/${review.id}`, {
							method: 'PATCH',
							headers,
							body: JSON.stringify(body),
						})
					: await fetch(`${API_BASE}/reviews`, {
							method: 'POST',
							headers,
							body: JSON.stringify(body),
						});

				await handleApiResponse(res);
				const saved: Review = await res.json();
				setReview({ ...saved, sentences: (saved.sentences as string[]) ?? [] });
				setRecommendations([]);
				setRecsPage(1);
				Toast.show({ type: 'success', text1: '저장했습니다.' });
			} catch (err) {
				showApiError(err);
			} finally {
				setSaving(false);
			}
		},
		[localBook, review],
	);

	const fetchSummary = useCallback(async () => {
		if (!localBook?.books.id) return;
		setSummary({ status: 'loading' });
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const res = await fetch(
				`${API_BASE}/books/${localBook.books.id}/summary`,
				{
					headers: { Authorization: `Bearer ${session?.access_token}` },
				},
			);
			await handleApiResponse(res);
			const json = await res.json();
			setSummary({ status: 'done', text: json.summary ?? '' });
		} catch {
			setSummary({ status: 'error' });
		}
	}, [localBook?.books.id]);

	const fetchRecommendations = useCallback(async () => {
		if (!review?.id) return;
		setFetchingRecs(true);
		setRecsPage(1);
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const res = await fetch(
				`${API_BASE}/reviews/${review.id}/recommendations?page=1`,
				{ headers: { Authorization: `Bearer ${session?.access_token}` } },
			);
			await handleApiResponse(res);
			const json = await res.json();
			setRecommendations(json.recommendations ?? []);
			setHasMoreRecs(json.has_more ?? false);
		} catch (err) {
			showApiError(err);
		} finally {
			setFetchingRecs(false);
		}
	}, [review?.id]);

	const loadMoreRecommendations = useCallback(async () => {
		if (!review?.id) return;
		const nextPage = recsPage + 1;
		setFetchingRecs(true);
		try {
			const {
				data: { session },
			} = await supabase.auth.getSession();
			const res = await fetch(
				`${API_BASE}/reviews/${review.id}/recommendations?page=${nextPage}`,
				{ headers: { Authorization: `Bearer ${session?.access_token}` } },
			);
			await handleApiResponse(res);
			const json = await res.json();
			setRecommendations(prev => [...prev, ...(json.recommendations ?? [])]);
			setHasMoreRecs(json.has_more ?? false);
			setRecsPage(nextPage);
		} catch (err) {
			showApiError(err);
		} finally {
			setFetchingRecs(false);
		}
	}, [review?.id, recsPage]);

	return {
		review,
		loading,
		saving,
		status,
		localBook,
		summary,
		recommendations,
		fetchingRecs,
		hasMoreRecs,
		updateStatus,
		saveDates,
		saveReview,
		fetchSummary,
		fetchRecommendations,
		loadMoreRecommendations,
	};
}
