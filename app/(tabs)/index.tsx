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
import DraggableFlatList from 'react-native-draggable-flatlist';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BookCard } from '../../components/BookCard';
import { BookDetailModal } from '../../components/BookDetailModal';
import { DragRow } from '../../components/DragRow';
import { useUserBooks } from '../../hooks/useUserBooks';
import type { UserBook } from '../../types/book';

const NUM_COLUMNS = 3;

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
				<ActivityIndicator size="large" />
			</View>
		);
	}

	return (
		<GestureHandlerRootView style={styles.flex}>
			<View style={[styles.container, { paddingTop: insets.top }]}>
				<View style={styles.header}>
					<Text style={styles.headerTitle}>내 서재</Text>
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
							검색 탭에서 책을 찾아 담아보세요
						</Text>
					</View>
				) : editMode ? (
					<DraggableFlatList
						data={userBooks}
						keyExtractor={item => item.id}
						renderItem={params => <DragRow {...params} onDelete={deleteBook} />}
						onDragEnd={handleDragEnd}
						contentContainerStyle={styles.dragList}
					/>
				) : (
					<FlatList
						data={userBooks}
						keyExtractor={item => item.id}
						numColumns={NUM_COLUMNS}
						renderItem={({ item }) => (
							<BookCard item={item} onPress={() => setSelectedBook(item)} />
						)}
						contentContainerStyle={styles.grid}
						columnWrapperStyle={styles.row}
						onEndReached={() => onEndReached(editMode)}
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
			<BookDetailModal
				userBook={selectedBook}
				visible={selectedBook !== null}
				onClose={() => setSelectedBook(null)}
			/>
		</GestureHandlerRootView>
	);
}

const styles = StyleSheet.create({
	flex: { flex: 1 },
	container: { flex: 1, backgroundColor: '#fff' },
	center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 16,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	headerTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
	editButton: { paddingHorizontal: 4, paddingVertical: 4 },
	editButtonText: { fontSize: 15, color: '#555', fontWeight: '500' },
	grid: { paddingHorizontal: 12, paddingVertical: 16 },
	row: { justifyContent: 'flex-start', gap: 12, marginBottom: 20 },
	emptyText: {
		fontSize: 16,
		fontWeight: '600',
		color: '#333',
		marginBottom: 8,
	},
	emptySubText: { fontSize: 13, color: '#999' },
	footer: { paddingVertical: 16 },
	dragList: { paddingVertical: 8 },
});
