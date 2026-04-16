import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { RenderItemParams } from 'react-native-draggable-flatlist';
import { ScaleDecorator } from 'react-native-draggable-flatlist';
import type { UserBook } from '../types/book';

export function DragRow({ item, drag, isActive }: RenderItemParams<UserBook>) {
	return (
		<ScaleDecorator>
			<Pressable
				style={[styles.row, isActive && styles.rowActive]}
				onLongPress={drag}
			>
				<View style={styles.thumb}>
					{item.books.thumbnail ? (
						<Image
							source={{ uri: item.books.thumbnail }}
							style={styles.thumbImage}
							contentFit="cover"
						/>
					) : (
						<View style={[styles.thumbImage, styles.thumbPlaceholder]} />
					)}
				</View>
				<Text style={styles.title} numberOfLines={2}>
					{item.books.title}
				</Text>
				<Text style={styles.handle}>☰</Text>
			</Pressable>
		</ScaleDecorator>
	);
}

const styles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		paddingHorizontal: 20,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f5f5f5',
		backgroundColor: '#fff',
		gap: 14,
	},
	rowActive: {
		backgroundColor: '#f8f8f8',
		shadowOpacity: 0.1,
		elevation: 4,
	},
	thumb: {
		width: 44,
		height: 64,
		borderRadius: 4,
		overflow: 'hidden',
		backgroundColor: '#f0f0f0',
	},
	thumbImage: { width: '100%', height: '100%' },
	thumbPlaceholder: { backgroundColor: '#e8e0d5' },
	title: { flex: 1, fontSize: 14, color: '#1a1a1a', fontWeight: '500' },
	handle: { fontSize: 18, color: '#ccc' },
});
