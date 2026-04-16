import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	RefreshControl,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

interface Book {
	id: string;
	title: string;
	thumbnail: string | null;
	genre: string | null;
}

interface UserBook {
	id: string;
	rank: number;
	start_date: string | null;
	end_date: string | null;
	books: Book;
}

const NUM_COLUMNS = 3;
const PAGE_SIZE = 21; // 3의 배수 (열 맞춤)
const PLACEHOLDER_COLOR = '#f0f0f0';

function BookCard({ item }: { item: UserBook }) {
	return (
		<View style={styles.card}>
			<View style={styles.coverWrapper}>
				{item.books.thumbnail ? (
					<Image
						source={{ uri: item.books.thumbnail }}
						style={styles.cover}
						contentFit="cover"
						transition={200}
					/>
				) : (
					<View style={[styles.cover, styles.coverPlaceholder]}>
						<Text style={styles.placeholderText} numberOfLines={3}>
							{item.books.title}
						</Text>
					</View>
				)}
			</View>
			<Text style={styles.bookTitle} numberOfLines={2}>
				{item.books.title}
			</Text>
		</View>
	);
}

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const [userBooks, setUserBooks] = useState<UserBook[]>([]);
	const [loading, setLoading] = useState(true);
	const [loadingMore, setLoadingMore] = useState(false);
	const [refreshing, setRefreshing] = useState(false);
	const [hasMore, setHasMore] = useState(true);
	const [page, setPage] = useState(0);

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

	useEffect(() => {
		fetchPage(0, true).finally(() => setLoading(false));
	}, [fetchPage]);

	const onRefresh = useCallback(async () => {
		setRefreshing(true);
		await fetchPage(0, true);
		setRefreshing(false);
	}, [fetchPage]);

	const onEndReached = useCallback(async () => {
		if (!hasMore || loadingMore) return;
		setLoadingMore(true);
		await fetchPage(page + 1, false);
		setLoadingMore(false);
	}, [hasMore, loadingMore, page, fetchPage]);

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<Text style={styles.headerTitle}>내 서재</Text>
			</View>

			{userBooks.length === 0 ? (
				<View style={styles.center}>
					<Text style={styles.emptyText}>아직 담은 책이 없어요</Text>
					<Text style={styles.emptySubText}>
						검색 탭에서 책을 찾아 담아보세요
					</Text>
				</View>
			) : (
				<FlatList
					data={userBooks}
					keyExtractor={item => item.id}
					numColumns={NUM_COLUMNS}
					renderItem={({ item }) => <BookCard item={item} />}
					contentContainerStyle={styles.grid}
					columnWrapperStyle={styles.row}
					onEndReached={onEndReached}
					onEndReachedThreshold={0.3}
					ListFooterComponent={
						loadingMore ? <ActivityIndicator style={styles.footer} /> : null
					}
					refreshControl={
						<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
					}
					showsVerticalScrollIndicator={false}
				/>
			)}
		</View>
	);
}

const CARD_WIDTH = '30%';

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
	header: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	headerTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
	grid: { paddingHorizontal: 12, paddingVertical: 16 },
	row: { justifyContent: 'flex-start', gap: 12, marginBottom: 20 },
	card: { width: CARD_WIDTH },
	coverWrapper: {
		borderRadius: 8,
		overflow: 'hidden',
		aspectRatio: 0.68,
		backgroundColor: PLACEHOLDER_COLOR,
		marginBottom: 6,
	},
	cover: { width: '100%', height: '100%' },
	coverPlaceholder: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 8,
		backgroundColor: '#e8e0d5',
	},
	placeholderText: {
		fontSize: 10,
		color: '#666',
		textAlign: 'center',
	},
	bookTitle: { fontSize: 12, color: '#333', lineHeight: 16 },
	emptyText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	emptySubText: { fontSize: 13, color: '#999' },
	footer: { paddingVertical: 16 },
});
