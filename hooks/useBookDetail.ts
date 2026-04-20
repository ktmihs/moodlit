import { useCallback, useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { handleApiResponse, showApiError } from '../lib/apiError';
import { supabase } from '../lib/supabase';
import type { ReadingStatus, Review, UserBook } from '../types/book';

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

	useEffect(() => {
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
		async (newStatus: ReadingStatus) => {
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

			// database.types.ts가 실제 스키마와 일부 불일치하여 any 캐스팅

			await (supabase as any)
				.from('user_books')
				.update({ start_date, end_date })
				.eq('id', localBook.id);
		},
		[localBook],
	);

	const saveReview = useCallback(
		async (rating: number | null, memo: string, sentences: string[]) => {
			if (!localBook) return;
			setSaving(true);
			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();

				const body = {
					user_book_id: localBook.id,
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
				Toast.show({ type: 'success', text1: '저장했습니다.' });
			} catch (err) {
				showApiError(err);
			} finally {
				setSaving(false);
			}
		},
		[localBook, review],
	);

	return {
		review,
		loading,
		saving,
		status,
		localBook,
		updateStatus,
		saveReview,
	};
}
