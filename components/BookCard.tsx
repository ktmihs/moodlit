import { Image } from 'expo-image';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, shadow } from '../lib/theme';
import type { UserBook } from '../types/book';

interface Props {
	item: UserBook;
	onPress?: () => void;
}

export function BookCard({ item, onPress }: Props) {
	return (
		<Pressable style={styles.card} onPress={onPress}>
			<View style={styles.coverWrapper}>
				{item.books.cover_image_url ? (
					<Image
						source={{ uri: item.books.cover_image_url }}
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
		</Pressable>
	);
}

export const CARD_WIDTH = '30%';

const styles = StyleSheet.create({
	card: { width: CARD_WIDTH },
	coverWrapper: {
		borderRadius: radius.sm,
		overflow: 'hidden',
		aspectRatio: 0.68,
		backgroundColor: colors.bg.subtle,
		marginBottom: 8,
		...shadow.card,
	},
	cover: { width: '100%', height: '100%' },
	coverPlaceholder: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 8,
		backgroundColor: colors.accent.soft,
	},
	placeholderText: {
		fontFamily: fonts.bodyMedium,
		fontSize: 10,
		color: colors.accent.deep,
		textAlign: 'center',
	},
	bookTitle: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.ink.secondary,
		lineHeight: 17,
	},
});
