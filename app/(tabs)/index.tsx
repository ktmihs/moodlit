import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	RefreshControl,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookDetailModal } from '../../components/BookDetailModal';
import { DraggableGrid } from '../../components/DraggableGrid';
import {
	SORT_LABELS,
	SortOption,
	useUserBooks,
} from '../../hooks/useUserBooks';
import { colors, fonts, radius, spacing } from '../../lib/theme';
import type { UserBook } from '../../types/book';

const SORT_OPTIONS: SortOption[] = [
	'rank',
	'newest',
	'oldest',
	'recently_finished',
];

function SortBar({
	current,
	onChange,
}: {
	current: SortOption;
	onChange: (s: SortOption) => void;
}) {
	return (
		<ScrollView
			horizontal
			showsHorizontalScrollIndicator={false}
			contentContainerStyle={sortStyles.row}
			style={sortStyles.wrap}
		>
			{SORT_OPTIONS.map(opt => (
				<Pressable
					key={opt}
					style={[sortStyles.pill, current === opt && sortStyles.pillActive]}
					onPress={() => onChange(opt)}
				>
					<Text
						style={[
							sortStyles.pillText,
							current === opt && sortStyles.pillTextActive,
						]}
					>
						{SORT_LABELS[opt]}
					</Text>
				</Pressable>
			))}
		</ScrollView>
	);
}

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const [editMode, setEditMode] = useState(false);
	const [selectedBook, setSelectedBook] = useState<UserBook | null>(null);

	const {
		userBooks,
		loading,
		loadingMore,
		refreshing,
		sort,
		canReorder,
		fetchAll,
		onRefresh,
		onEndReached,
		changeSort,
		handleDragEnd,
		deleteBook,
	} = useUserBooks();

	useFocusEffect(
		useCallback(() => {
			onRefresh();
		}, [onRefresh]),
	);

	const toggleEditMode = useCallback(async () => {
		if (!editMode) await fetchAll();
		setEditMode(v => !v);
	}, [editMode, fetchAll]);

	const handleSortChange = useCallback(
		async (newSort: SortOption) => {
			if (editMode) setEditMode(false);
			await changeSort(newSort);
		},
		[editMode, changeSort],
	);

	if (loading) {
		return (
			<View style={styles.center}>
				<ActivityIndicator size="large" color={colors.ink.primary} />
			</View>
		);
	}

	return (
		<GestureHandlerRootView style={styles.flex}>
			<View style={[styles.container, { paddingTop: insets.top }]}>
				<View style={styles.header}>
					<View>
						<Text style={styles.eyebrow}>오늘도 한 페이지</Text>
						<Text style={styles.headerTitle}>나의 책장</Text>
					</View>
					{userBooks.length > 0 && canReorder && (
						<Pressable onPress={toggleEditMode} style={styles.editButton}>
							<Text style={styles.editButtonText}>
								{editMode ? '완료' : '편집'}
							</Text>
						</Pressable>
					)}
				</View>

				<SortBar current={sort} onChange={handleSortChange} />

				{userBooks.length === 0 ? (
					<View style={styles.center}>
						<Text style={styles.emptyText}>아직 담은 책이 없어요</Text>
						<Text style={styles.emptySubText}>
							{'\'발견\' 탭에서 마음에 드는 책을 꽂아보세요'}
						</Text>
					</View>
				) : (
					<FlatList
						data={[{ key: 'grid' }]}
						keyExtractor={i => i.key}
						renderItem={() => (
							<DraggableGrid
								data={userBooks}
								editMode={editMode}
								onReorder={handleDragEnd}
								onDelete={deleteBook}
								onPress={item => setSelectedBook(item)}
							/>
						)}
						onEndReached={() => onEndReached(editMode)}
						onEndReachedThreshold={0.3}
						ListFooterComponent={
							loadingMore ? (
								<ActivityIndicator
									style={styles.footer}
									color={colors.ink.muted}
								/>
							) : null
						}
						refreshControl={
							<RefreshControl
								refreshing={refreshing}
								onRefresh={onRefresh}
								tintColor={colors.ink.muted}
							/>
						}
						showsVerticalScrollIndicator={false}
					/>
				)}
			</View>
			<BookDetailModal
				userBook={selectedBook}
				visible={selectedBook !== null}
				onClose={() => setSelectedBook(null)}
			/>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1, backgroundColor: colors.bg.canvas },
	container: { flex: 1, backgroundColor: colors.bg.canvas },
	center: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.bg.canvas,
		paddingHorizontal: spacing.xxl,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'flex-end',
		justifyContent: 'space-between',
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
	editButton: {
		paddingHorizontal: spacing.md,
		paddingVertical: spacing.xs + 2,
		borderRadius: radius.pill,
		borderWidth: 1,
		borderColor: colors.border.strong,
	},
	editButtonText: {
		fontFamily: fonts.bodyMedium,
		fontSize: 12,
		color: colors.ink.secondary,
		letterSpacing: 0.3,
	},
	emptyText: {
		fontFamily: fonts.display,
		fontSize: 18,
		color: colors.ink.primary,
		marginBottom: 8,
		textAlign: 'center',
	},
	emptySubText: {
		fontFamily: fonts.body,
		fontSize: 13,
		color: colors.ink.muted,
		textAlign: 'center',
		lineHeight: 20,
	},
	footer: { paddingVertical: spacing.lg },
});

const sortStyles = StyleSheet.create({
	wrap: { flexGrow: 0, marginBottom: spacing.sm },
	row: {
		flexDirection: 'row',
		gap: spacing.sm,
		paddingHorizontal: spacing.xxl,
		paddingBottom: spacing.sm,
	},
	pill: {
		paddingHorizontal: spacing.md,
		paddingVertical: 6,
		borderRadius: radius.pill,
		borderWidth: 1,
		borderColor: colors.border.strong,
		backgroundColor: colors.surface,
	},
	pillActive: {
		backgroundColor: colors.ink.primary,
		borderColor: colors.ink.primary,
	},
	pillText: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.ink.secondary,
	},
	pillTextActive: {
		color: colors.surface,
	},
});
