import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookDetailModal } from '../../components/BookDetailModal';
import { DraggableGrid } from '../../components/DraggableGrid';
import { useUserBooks } from '../../hooks/useUserBooks';
import { colors, fonts, radius, spacing } from '../../lib/theme';
import type { UserBook } from '../../types/book';

export default function HomeScreen() {
	const insets = useSafeAreaInsets();
	const [editMode, setEditMode] = useState(false);
	const [selectedBook, setSelectedBook] = useState<UserBook | null>(null);

	const {
		userBooks,
		loading,
		loadingMore,
		refreshing,
		fetchAll,
		onRefresh,
		onEndReached,
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
					{userBooks.length > 0 && (
						<Pressable onPress={toggleEditMode} style={styles.editButton}>
							<Text style={styles.editButtonText}>
								{editMode ? '완료' : '편집'}
							</Text>
						</Pressable>
					)}
				</View>

				{userBooks.length === 0 ? (
					<View style={styles.center}>
						<Text style={styles.emptyText}>아직 담은 책이 없어요</Text>
						<Text style={styles.emptySubText}>
							‘발견’ 탭에서 마음에 드는 책을 꽂아보세요
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
