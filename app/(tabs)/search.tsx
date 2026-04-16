import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';

const API_BASE = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3000';
const DEBOUNCE_MS = 300;

interface SearchBook {
	isbn: string | null;
	title: string;
	author: string | null;
	publisher: string | null;
	published_date: string | null;
	description: string | null;
	cover_image_url: string | null;
	genre: string | null;
}

interface SearchResult {
	books: SearchBook[];
	total: number;
	page: number;
	limit: number;
}

async function searchBooks(query: string, page: number): Promise<SearchResult> {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	const token = session?.access_token;

	const url = `${API_BASE}/search-books?q=${encodeURIComponent(query)}&page=${page}&limit=20`;
	const res = await fetch(url, {
		headers: token ? { Authorization: `Bearer ${token}` } : {},
	});
	if (!res.ok) throw new Error('검색에 실패했습니다.');
	return res.json();
}

async function addToLibrary(book: SearchBook): Promise<void> {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	const token = session?.access_token;
	if (!token) throw new Error('로그인이 필요합니다.');

	const res = await fetch(`${API_BASE}/user-books`, {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${token}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({ book }),
	});

	const json = await res.json();
	if (!res.ok) {
		throw new Error(json.error?.message ?? '추가에 실패했습니다.');
	}
}

function BookItem({
	book,
	onAdd,
}: {
	book: SearchBook;
	onAdd: (book: SearchBook) => void;
}) {
	return (
		<View style={styles.bookItem}>
			<View style={styles.thumbnail}>
				{book.cover_image_url ? (
					<Image
						source={{ uri: book.cover_image_url }}
						style={styles.thumbnailImage}
						contentFit="cover"
						transition={200}
					/>
				) : (
					<View style={[styles.thumbnailImage, styles.thumbnailPlaceholder]} />
				)}
			</View>
			<View style={styles.bookInfo}>
				<Text style={styles.bookTitle} numberOfLines={2}>
					{book.title}
				</Text>
				<Text style={styles.bookAuthor} numberOfLines={1}>
					{book.author ?? '저자 미상'}
				</Text>
				{book.publisher && (
					<Text style={styles.bookPublisher} numberOfLines={1}>
						{book.publisher}
					</Text>
				)}
			</View>
			<Pressable style={styles.addButton} onPress={() => onAdd(book)}>
				<Text style={styles.addButtonText}>담기</Text>
			</Pressable>
		</View>
	);
}

export default function SearchScreen() {
	const insets = useSafeAreaInsets();
	const [query, setQuery] = useState('');
	const [books, setBooks] = useState<SearchBook[]>([]);
	const [page, setPage] = useState(1);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(false);
	const [loadingMore, setLoadingMore] = useState(false);
	const [adding, setAdding] = useState<string | null>(null);

	const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const queryRef = useRef('');

	const runSearch = useCallback(
		async (q: string, p: number, append = false) => {
			if (!q.trim()) {
				setBooks([]);
				setTotal(0);
				return;
			}
			append ? setLoadingMore(true) : setLoading(true);
			try {
				const result = await searchBooks(q, p);
				setBooks(prev => (append ? [...prev, ...result.books] : result.books));
				setTotal(result.total);
				setPage(p);
			} catch {
				// 검색 실패 시 조용히 처리
			} finally {
				append ? setLoadingMore(false) : setLoading(false);
			}
		},
		[],
	);

	useEffect(() => {
		queryRef.current = query;
		if (debounceRef.current) clearTimeout(debounceRef.current);
		debounceRef.current = setTimeout(() => {
			runSearch(query, 1, false);
		}, DEBOUNCE_MS);
		return () => {
			if (debounceRef.current) clearTimeout(debounceRef.current);
		};
	}, [query, runSearch]);

	function onEndReached() {
		const hasMore = books.length < total;
		if (!hasMore || loadingMore || loading) return;
		runSearch(queryRef.current, page + 1, true);
	}

	async function handleAdd(book: SearchBook) {
		const key = book.isbn ?? book.title;
		setAdding(key);
		try {
			await addToLibrary(book);
			Alert.alert('완료', `"${book.title}"을(를) 서재에 담았습니다.`, [
				{ text: '서재 보기', onPress: () => router.replace('/(tabs)') },
				{ text: '계속 검색' },
			]);
		} catch (err: unknown) {
			Alert.alert(
				'오류',
				err instanceof Error ? err.message : '추가에 실패했습니다.',
			);
		} finally {
			setAdding(null);
		}
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<Text style={styles.headerTitle}>책 검색</Text>
			</View>

			<View style={styles.searchBar}>
				<TextInput
					style={styles.searchInput}
					placeholder="제목, 저자로 검색"
					placeholderTextColor="#999"
					value={query}
					onChangeText={setQuery}
					autoCorrect={false}
					returnKeyType="search"
				/>
			</View>

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" />
				</View>
			) : (
				<FlatList
					data={books}
					keyExtractor={(item, index) => `${item.isbn ?? item.title}-${index}`}
					renderItem={({ item }) => (
						<BookItem book={item} onAdd={adding ? () => {} : handleAdd} />
					)}
					onEndReached={onEndReached}
					onEndReachedThreshold={0.3}
					ListEmptyComponent={
						query.trim() ? (
							<View style={styles.center}>
								<Text style={styles.emptyText}>검색 결과가 없어요</Text>
							</View>
						) : null
					}
					ListFooterComponent={
						loadingMore ? <ActivityIndicator style={styles.footer} /> : null
					}
					contentContainerStyle={styles.list}
					showsVerticalScrollIndicator={false}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 60,
	},
	header: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	headerTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
	searchBar: { paddingHorizontal: 16, paddingVertical: 12 },
	searchInput: {
		height: 44,
		backgroundColor: '#f5f5f5',
		borderRadius: 10,
		paddingHorizontal: 14,
		fontSize: 15,
		color: '#1a1a1a',
	},
	list: { paddingHorizontal: 16, paddingBottom: 20 },
	bookItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f5f5f5',
		gap: 12,
	},
	thumbnail: {
		width: 52,
		height: 76,
		borderRadius: 4,
		overflow: 'hidden',
		backgroundColor: '#f0f0f0',
	},
	thumbnailImage: { width: '100%', height: '100%' },
	thumbnailPlaceholder: { backgroundColor: '#e8e0d5' },
	bookInfo: { flex: 1, gap: 3 },
	bookTitle: {
		fontSize: 14,
		fontWeight: '600',
		color: '#1a1a1a',
		lineHeight: 20,
	},
	bookAuthor: { fontSize: 12, color: '#666' },
	bookPublisher: { fontSize: 11, color: '#aaa' },
	addButton: {
		paddingHorizontal: 14,
		paddingVertical: 7,
		backgroundColor: '#1a1a1a',
		borderRadius: 8,
	},
	addButtonText: { fontSize: 13, fontWeight: '600', color: '#fff' },
	emptyText: { fontSize: 14, color: '#999' },
	footer: { paddingVertical: 16 },
});
