import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import type { UserBook } from '../types/book';

interface Props {
	item: UserBook;
}

export function BookCard({ item }: Props) {
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

export const CARD_WIDTH = '30%';

const styles = StyleSheet.create({
	card: { width: CARD_WIDTH },
	coverWrapper: {
		borderRadius: 8,
		overflow: 'hidden',
		aspectRatio: 0.68,
		backgroundColor: '#f0f0f0',
		marginBottom: 6,
	},
	cover: { width: '100%', height: '100%' },
	coverPlaceholder: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 8,
		backgroundColor: '#e8e0d5',
	},
	placeholderText: { fontSize: 10, color: '#666', textAlign: 'center' },
	bookTitle: { fontSize: 12, color: '#333', lineHeight: 16 },
});
