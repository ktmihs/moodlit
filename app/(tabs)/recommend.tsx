import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback } from 'react';
import {
	ActivityIndicator,
	FlatList,
	Pressable,
	RefreshControl,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRecommendations } from '../../hooks/useRecommendations';
import { colors, fonts, radius, shadow, spacing } from '../../lib/theme';
import type { RecommendedBook } from '../../types/book';

const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

function StarFilterBar({
	minRating,
	onChange,
}: {
	minRating: number;
	onChange: (r: number) => void;
}) {
	return (
		<View style={styles.filterRow}>
			<Text style={styles.filterLabel}>기준 별점</Text>
			<View style={styles.filterPills}>
				{RATING_OPTIONS.map(r => (
					<Pressable
						key={r}
						style={[styles.pill, minRating === r && styles.pillActive]}
						onPress={() => onChange(r)}
					>
						<Text
							style={[
								styles.pillText,
								minRating === r && styles.pillTextActive,
							]}
						>
							{'★'.repeat(r)}
						</Text>
					</Pressable>
				))}
			</View>
		</View>
	);
}

function RecommendCard({ item }: { item: RecommendedBook }) {
	return (
		<View style={styles.card}>
			<View style={styles.thumb}>
				{item.cover_image_url ? (
					<Image
						source={{ uri: item.cover_image_url }}
						style={styles.thumbImg}
						contentFit={'cover'}
					/>
				) : (
					<View style={[styles.thumbImg, styles.thumbPlaceholder]} />
				)}
			</View>
			<View style={styles.cardInfo}>
				<Text style={styles.cardTitle} numberOfLines={2}>
					{item.title}
				</Text>
				{item.author && (
					<Text style={styles.cardAuthor} numberOfLines={1}>
						{item.author}
					</Text>
				)}
				{item.reason && (
					<Text style={styles.cardReason} numberOfLines={2}>
						{item.reason}
					</Text>
				)}
			</View>
		</View>
	);
}

function EmptyState({
	minRating,
	hasNoReviews,
}: {
	minRating: number;
	hasNoReviews: boolean;
}) {
	return (
		<View style={styles.emptyWrap}>
			<Text style={styles.emptyIcon}>✦</Text>
			{hasNoReviews ? (
				<>
					<Text style={styles.emptyTitle}>아직 감상이 없어요</Text>
					<Text style={styles.emptyDesc}>
						{'책을 읽고 감상을 남기면\n맞춤 추천이 시작돼요'}
					</Text>
				</>
			) : (
				<>
					<Text style={styles.emptyTitle}>
						{'★'.repeat(minRating)} 이상인 책이 없어요
					</Text>
					<Text style={styles.emptyDesc}>기준 별점을 낮춰보세요</Text>
				</>
			)}
		</View>
	);
}

export default function RecommendScreen() {
	const insets = useSafeAreaInsets();
	const { recommendations, loading, pendingCount, minRating, changeRating, refresh } =
		useRecommendations();

	useFocusEffect(
		useCallback(() => {
			refresh();
		}, [refresh]),
	);

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<Text style={styles.eyebrow}>당신을 위한</Text>
				<Text style={styles.headerTitle}>추천 도서</Text>
			</View>

			<StarFilterBar minRating={minRating} onChange={changeRating} />

			{pendingCount > 0 && !loading && (
				<View style={styles.pendingBanner}>
					<ActivityIndicator
						size={'small'}
						color={colors.accent.deep}
						style={{ marginRight: spacing.sm }}
					/>
					<Text style={styles.pendingText}>
						{pendingCount}권 분석 중… 잠시 후 더 채워져요
					</Text>
				</View>
			)}

			{loading ? (
				<View style={styles.center}>
					<ActivityIndicator size={'large'} color={colors.ink.primary} />
				</View>
			) : (
				<FlatList
					data={recommendations}
					keyExtractor={(item, i) => item.isbn ?? `${item.title}-${i}`}
					renderItem={({ item }) => <RecommendCard item={item} />}
					contentContainerStyle={[
						styles.listContent,
						recommendations.length === 0 && styles.listContentEmpty,
					]}
					ItemSeparatorComponent={() => <View style={styles.separator} />}
					ListEmptyComponent={
						<EmptyState minRating={minRating} hasNoReviews={pendingCount === 0} />
					}
					refreshControl={
						<RefreshControl
							refreshing={false}
							onRefresh={refresh}
							tintColor={colors.ink.muted}
						/>
					}
					showsVerticalScrollIndicator={false}
				/>
			)}
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg.canvas },
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
	filterRow: {
		paddingHorizontal: spacing.xxl,
		marginBottom: spacing.lg,
		gap: spacing.sm,
	},
	filterLabel: {
		fontFamily: fonts.body,
		fontSize: 11,
		color: colors.ink.muted,
		letterSpacing: 1.2,
		textTransform: 'uppercase',
	},
	filterPills: {
		flexDirection: 'row',
		gap: spacing.sm,
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
		letterSpacing: 1,
	},
	pillTextActive: {
		color: colors.surface,
	},
	pendingBanner: {
		flexDirection: 'row',
		alignItems: 'center',
		marginHorizontal: spacing.xxl,
		marginBottom: spacing.lg,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.sm,
		backgroundColor: colors.accent.soft,
		borderRadius: radius.md,
	},
	pendingText: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.accent.deep,
		flex: 1,
	},
	listContent: {
		paddingHorizontal: spacing.xxl,
		paddingBottom: spacing.xxxl,
	},
	listContentEmpty: {
		flex: 1,
	},
	separator: {
		height: 1,
		backgroundColor: colors.border.base,
	},
	card: {
		flexDirection: 'row',
		gap: spacing.md,
		paddingVertical: spacing.lg,
	},
	thumb: {
		width: 52,
		height: 72,
		borderRadius: radius.sm,
		overflow: 'hidden',
		backgroundColor: colors.bg.subtle,
		...shadow.card,
	},
	thumbImg: { width: '100%', height: '100%' },
	thumbPlaceholder: { backgroundColor: colors.accent.soft },
	cardInfo: { flex: 1, justifyContent: 'center', gap: 3 },
	cardTitle: {
		fontFamily: fonts.bodyMedium,
		fontSize: 14,
		color: colors.ink.primary,
		lineHeight: 20,
	},
	cardAuthor: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.ink.secondary,
	},
	cardReason: {
		fontFamily: fonts.body,
		fontSize: 11,
		color: colors.accent.deep,
		fontStyle: 'italic',
		lineHeight: 16,
	},
	emptyWrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		paddingBottom: spacing.xxxl * 2,
		gap: spacing.md,
	},
	emptyIcon: {
		fontSize: 28,
		color: colors.accent.soft,
		marginBottom: spacing.sm,
	},
	emptyTitle: {
		fontFamily: fonts.display,
		fontSize: 18,
		color: colors.ink.primary,
		textAlign: 'center',
	},
	emptyDesc: {
		fontFamily: fonts.body,
		fontSize: 13,
		color: colors.ink.secondary,
		textAlign: 'center',
		lineHeight: 20,
	},
	center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
});
