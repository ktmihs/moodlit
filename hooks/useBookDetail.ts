import { useCallback, useEffect, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import { handleApiResponse, showApiError } from '../lib/apiError';
import { supabase } from '../lib/supabase';
import type {
	ReadingStatus,
	RecommendedBook,
	Review,
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
	const lastBookIdRef = useRef<string | null>(null);

	useEffect(() => {
		const newId = userBook?.id ?? null;
		if (newId !== null && newId !== lastBookIdRef.current) {
			setRecommendations([]);
		}
		if (newId !== null) lastBookIdRef.current = newId;

		setLocalBook(userBook);
		if (!userBook) {
			setReview(null);
			return;
		}
		setLoading(true);

		// 리뷰 로드 + 최신 book 데이터(summary 포함) 동시 fetch
		Promise.all([
			supabase
				.from('reviews')
				.select('*')
				.eq('user_book_id', userBook.id)
				.maybeSingle(),
			supabase.auth.getSession().then(({ data: { session } }) =>
				fetch(`${API_BASE}/user-books/${userBook.id}`, {
					headers: { Authorization: `Bearer ${session?.access_token}` },
				}).then(r => (r.ok ? r.json() : null)),
			),
		]).then(([{ data }, freshBook]) => {
			const raw = data as unknown as Review | null;
			setReview(raw ? { ...raw, sentences: raw.sentences ?? [] } : null);
			if (freshBook?.books) {
				setLocalBook(prev =>
					prev ? { ...prev, books: freshBook.books } : prev,
				);
			}
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
				Toast.show({ type: 'success', text1: '저장했습니다.' });
			} catch (err) {
				showApiError(err);
			} finally {
				setSaving(false);
			}
		},
		[localBook, review],
	);

	const fetchRecommendations = useCallback(
		async (forceRefresh = false) => {
			if (!review?.id || !review.content) return;
			setFetchingRecs(true);
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();
				const res = await fetch(`${API_BASE}/recommendations`, {
					method: 'POST',
					headers: {
						Authorization: `Bearer ${session?.access_token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ review_id: review.id, refresh: forceRefresh }),
				});
				await handleApiResponse(res);
				const json = await res.json();
				setRecommendations(json.recommendations ?? []);
			} catch (err) {
				showApiError(err);
			} finally {
				setFetchingRecs(false);
			}
		},
		[review?.id, review?.content],
	);

	return {
		review,
		loading,
		saving,
		status,
		localBook,
		recommendations,
		fetchingRecs,
		updateStatus,
		saveDates,
		saveReview,
		fetchRecommendations,
	};
}
