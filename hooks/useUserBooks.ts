import { useCallback, useEffect, useRef, useState } from 'react';
import Toast from 'react-native-toast-message';
import { showApiError } from '../lib/apiError';
import { supabase } from '../lib/supabase';
import type { UserBook } from '../types/book';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://10.47.16.123:3000';
const PAGE_SIZE = 21;

export type SortOption = 'rank' | 'newest' | 'oldest' | 'recently_finished';

const SORT_LABELS: Record<SortOption, string> = {
	rank: '내 순서',
	newest: '최신 등록',
	oldest: '오래된 등록',
	recently_finished: '최근 완독',
};

export { SORT_LABELS };

const SELECT_FIELDS =
	'id, rank, start_date, end_date, created_at, books (id, title, cover_image_url, genre)';

function buildQuery(sort: SortOption) {
	const q = supabase.from('user_books').select(SELECT_FIELDS);
	switch (sort) {
		case 'newest':
			return q.order('created_at', { ascending: false });
		case 'oldest':
			return q.order('created_at', { ascending: true });
		case 'recently_finished':
			return q.order('end_date', { ascending: false, nullsFirst: false });
		default:
			return q.order('rank', { ascending: true });
	}
}

export function useUserBooks() {
	const [userBooks, setUserBooks] = useState<UserBook[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(0);
	const [sort, setSort] = useState<SortOption>('rank');
	const sortRef = useRef<SortOption>('rank');
	const prevBooksRef = useRef<UserBook[]>([]);

	const fetchPage = useCallback(async (pageIndex: number, replace: boolean) => {
		const from = pageIndex * PAGE_SIZE;
		const to = from + PAGE_SIZE - 1;

		const { data, error } = await buildQuery(sortRef.current).range(from, to);

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
			.select(SELECT_FIELDS)
			.order('rank', { ascending: true });

		if (!error && data) {
			setUserBooks(data as unknown as UserBook[]);
			setHasMore(false);
		}
	}, []);

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

	const changeSort = useCallback(
		async (newSort: SortOption) => {
			if (newSort === sortRef.current) return;
			sortRef.current = newSort;
			setSort(newSort);
			setLoading(true);
			await fetchPage(0, true);
			setLoading(false);
		},
		[fetchPage],
	);

	const handleDragEnd = useCallback(
		async (data: UserBook[]) => {
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
					body: JSON.stringify({ ids: data.map((b: UserBook) => b.id) }),
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

	const deleteBook = useCallback(
		(book: UserBook) => {
			removeBook(book.id);

			const timerId = setTimeout(async () => {
				try {
					const {
						data: { session },
					} = await supabase.auth.getSession();
					const res = await fetch(`${API_BASE}/user-books/${book.id}`, {
						method: 'DELETE',
						headers: { Authorization: `Bearer ${session?.access_token}` },
					});
					if (!res.ok) {
						restoreBook(book);
						Toast.show({ type: 'error', text1: '삭제에 실패했습니다.' });
					}
				} catch (err) {
					restoreBook(book);
					showApiError(err);
				}
			}, 2000);

			Toast.show({
				type: 'info',
				text1: '책을 서재에서 삭제했습니다.',
				text2: '탭하여 실행 취소',
				onPress: () => {
					clearTimeout(timerId);
					restoreBook(book);
					Toast.hide();
				},
				visibilityTime: 2000,
				autoHide: true,
			});
		},
		[removeBook, restoreBook],
	);

	useEffect(() => {
		fetchPage(0, true).finally(() => setLoading(false));
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	return {
		userBooks,
		loading,
		loadingMore,
		refreshing,
		hasMore,
		sort,
		canReorder: sort === 'rank',
		fetchAll,
		onRefresh,
		onEndReached,
		changeSort,
		handleDragEnd,
		deleteBook,
	};
}
