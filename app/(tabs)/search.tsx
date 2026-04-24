import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { handleApiResponse } from '../../lib/apiError';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, shadow, spacing } from '../../lib/theme';

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
	await handleApiResponse(res);
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

	await handleApiResponse(res);
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
			Toast.show({
				type: 'success',
				text1: '서재에 담았습니다',
				text2: book.title,
				onPress: () => router.replace('/(tabs)'),
			});
		} catch (err: unknown) {
			Toast.show({
				type: 'error',
				text1: err instanceof Error ? err.message : '추가에 실패했습니다.',
			});
		} finally {
			setAdding(null);
		}
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<Text style={styles.eyebrow}>새 페이지를 펼치기</Text>
				<Text style={styles.headerTitle}>오늘의 발견</Text>
			</View>

			<View style={styles.searchBar}>
				<Ionicons
					name="search"
					size={16}
					color={colors.ink.muted}
					style={styles.searchIcon}
				/>
				<TextInput
					style={styles.searchInput}
					placeholder="제목, 저자로 찾아보세요"
					placeholderTextColor={colors.ink.placeholder}
					value={query}
					onChangeText={setQuery}
					autoCorrect={false}
					returnKeyType="search"
				/>
			</View>

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size="large" color={colors.ink.primary} />
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
								<Text style={styles.emptyText}>찾으시는 책이 없네요</Text>
								<Text style={styles.emptySubText}>
									다른 키워드로 다시 시도해보세요
								</Text>
							</View>
						) : (
							<View style={styles.center}>
								<Text style={styles.emptyHint}>
									어떤 책이 오늘의 무드와{'\n'}어울릴까요?
								</Text>
							</View>
						)
					}
					ListFooterComponent={
						loadingMore ? (
							<ActivityIndicator
								style={styles.footer}
								color={colors.ink.muted}
							/>
						) : null
					}
					contentContainerStyle={styles.list}
					showsVerticalScrollIndicator={false}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg.canvas },
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingTop: 80,
		paddingHorizontal: spacing.xxl,
	},
	header: {
		paddingHorizontal: spacing.xxl,
		paddingTop: spacing.lg,
		paddingBottom: spacing.lg,
	},
	eyebrow: {
		fontFamily: fonts.body,
		fontSize: 11,
		color: colors.accent.deep,
		letterSpacing: 1.5,
		textTransform: 'uppercase',
		marginBottom: 4,
	},
	headerTitle: {
		fontFamily: fonts.display,
		fontSize: 28,
		color: colors.ink.primary,
		letterSpacing: 0.3,
	},
	searchBar: {
		marginHorizontal: spacing.xxl,
		marginBottom: spacing.md,
		flexDirection: 'row',
		alignItems: 'center',
		backgroundColor: colors.surface,
		borderRadius: radius.lg,
		paddingHorizontal: spacing.lg,
		borderWidth: 1,
		borderColor: colors.border.base,
		...shadow.card,
	},
	searchIcon: { marginRight: spacing.sm },
	searchInput: {
		flex: 1,
		height: 48,
		fontSize: 14,
		fontFamily: fonts.body,
		color: colors.ink.primary,
	},
	list: { paddingHorizontal: spacing.xxl, paddingBottom: spacing.xl },
	bookItem: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingVertical: spacing.md + 2,
		borderBottomWidth: 1,
		borderBottomColor: colors.border.base,
		gap: spacing.md,
	},
	thumbnail: {
		width: 54,
		height: 78,
		borderRadius: radius.sm,
		overflow: 'hidden',
		backgroundColor: colors.bg.subtle,
	},
	thumbnailImage: { width: '100%', height: '100%' },
	thumbnailPlaceholder: { backgroundColor: colors.accent.soft },
	bookInfo: { flex: 1, gap: 3 },
	bookTitle: {
		fontFamily: fonts.bodyMedium,
		fontSize: 14,
		color: colors.ink.primary,
		lineHeight: 20,
	},
	bookAuthor: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.ink.secondary,
	},
	bookPublisher: {
		fontFamily: fonts.body,
		fontSize: 11,
		color: colors.ink.muted,
	},
	addButton: {
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
		backgroundColor: colors.ink.primary,
		borderRadius: radius.pill,
	},
	addButtonText: {
		fontFamily: fonts.bodyBold,
		fontSize: 12,
		color: colors.surface,
		letterSpacing: 0.3,
	},
	emptyText: {
		fontFamily: fonts.display,
		fontSize: 17,
		color: colors.ink.primary,
		marginBottom: 6,
	},
	emptySubText: {
		fontFamily: fonts.body,
		fontSize: 13,
		color: colors.ink.muted,
		textAlign: 'center',
	},
	emptyHint: {
		fontFamily: fonts.display,
		fontSize: 16,
		color: colors.ink.muted,
		textAlign: 'center',
		lineHeight: 26,
	},
	footer: { paddingVertical: spacing.lg },
});
