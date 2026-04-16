import { useCallback, useEffect, useRef, useState } from 'react';
import type { DragEndParams } from 'react-native-draggable-flatlist';
import Toast from 'react-native-toast-message';
import { showApiError } from '../lib/apiError';
import { supabase } from '../lib/supabase';
import type { UserBook } from '../types/book';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const PAGE_SIZE = 21; // 3의 배수 (열 맞춤)

export function useUserBooks() {
	const [userBooks, setUserBooks] = useState<UserBook[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(0);
	const prevBooksRef = useRef<UserBook[]>([]);

	const fetchPage = useCallback(async (pageIndex: number, replace: boolean) => {
		const from = pageIndex * PAGE_SIZE;
		const to = from + PAGE_SIZE - 1;

		const { data, error } = await supabase
			.from('user_books')
			.select(
				'id, rank, start_date, end_date, books (id, title, thumbnail, genre)',
			)
			.order('rank', { ascending: true })
			.range(from, to);

		if (!error && data) {
			setUserBooks(prev =>
				replace
					? (data as unknown as UserBook[])
					: [...prev, ...(data as unknown as UserBook[])],
			);
			setHasMore(data.length === PAGE_SIZE);
			setPage(pageIndex);
		}
	}, []);

	const fetchAll = useCallback(async () => {
		const { data, error } = await supabase
			.from('user_books')
			.select(
				'id, rank, start_date, end_date, books (id, title, thumbnail, genre)',
			)
			.order('rank', { ascending: true });

		if (!error && data) {
			setUserBooks(data as unknown as UserBook[]);
			setHasMore(false);
		}
	}, []);

	useEffect(() => {
		fetchPage(0, true).finally(() => setLoading(false));
	}, [fetchPage]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await fetchPage(0, true);
		setRefreshing(false);
	}, [fetchPage]);

	const onEndReached = useCallback(
		async (editMode: boolean) => {
			if (!hasMore || loadingMore || editMode) return;
			setLoadingMore(true);
			await fetchPage(page + 1, false);
			setLoadingMore(false);
		},
		[hasMore, loadingMore, page, fetchPage],
	);

	const handleDragEnd = useCallback(
		async ({ data }: DragEndParams<UserBook>) => {
			const prev = userBooks;
			prevBooksRef.current = prev;
			setUserBooks(data);

			try {
				const {
					data: { session },
				} = await supabase.auth.getSession();
				const res = await fetch(`${API_BASE}/user-books/rank`, {
					method: 'PUT',
					headers: {
						Authorization: `Bearer ${session?.access_token}`,
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({ ids: data.map(b => b.id) }),
				});

				if (!res.ok) {
					setUserBooks(prev);
					Toast.show({ type: 'error', text1: '순서 변경에 실패했습니다.' });
				}
			} catch (err) {
				setUserBooks(prev);
				showApiError(err);
			}
		},
		[userBooks],
	);

	const removeBook = useCallback((id: string) => {
		setUserBooks(prev => prev.filter(b => b.id !== id));
	}, []);

	const restoreBook = useCallback((book: UserBook) => {
		setUserBooks(prev => {
			const list = [...prev, book];
			return list.sort((a, b) => a.rank - b.rank);
		});
	}, []);

	return {
		userBooks,
		loading,
		loadingMore,
		refreshing,
		hasMore,
		fetchAll,
		onRefresh,
		onEndReached,
		handleDragEnd,
		removeBook,
		restoreBook,
	};
}
