import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
	Dimensions,
	FlatList,
	Pressable,
	StyleSheet,
	Text,
	View,
	ViewToken,
} from 'react-native';
import { useFeatureIntroFlag } from '../hooks/useFeatureIntroFlag';
import { colors, fonts, radius, spacing } from '../lib/theme';

const { width } = Dimensions.get('window');

interface Slide {
	key: string;
	emoji: string;
	title: string;
	body: string;
}

const SLIDES: Slide[] = [
	{
		key: 'mood',
		emoji: '✶',
		title: '오늘의 무드를 담아요',
		body: '기분을 한 줄로 남기면\nAI가 그에 어울리는 책을 펼쳐드려요.',
	},
	{
		key: 'curate',
		emoji: '✦',
		title: '나에게 맞는 한 권',
		body: '베스트셀러가 아니라\n오늘의 나에게 말을 거는 책을 골라요.',
	},
	{
		key: 'shelf',
		emoji: '✧',
		title: '나만의 책장을 정돈해요',
		body: '읽은 책·읽고 싶은 책을 캘린더와 서재에\n내 손으로 정리해요.',
	},
];

const viewabilityConfig = { itemVisiblePercentThreshold: 60 };

export default function OnboardingScreen() {
	const { markSeen } = useFeatureIntroFlag();
	const listRef = useRef<FlatList<Slide>>(null);
	const [page, setPage] = useState(0);

	const onViewableItemsChanged = useRef(
		({ viewableItems }: { viewableItems: ViewToken[] }) => {
			const first = viewableItems[0];
			if (first?.index != null) setPage(first.index);
		},
	).current;

	const finish = async () => {
		await markSeen();
		router.replace('/(tabs)');
	};

	const goNext = () => {
		if (page < SLIDES.length - 1) {
			listRef.current?.scrollToIndex({ index: page + 1, animated: true });
		} else {
			finish();
		}
	};

	const isLast = page === SLIDES.length - 1;

	return (
		<View style={styles.container}>
			<View style={styles.topBar}>
				<Pressable onPress={finish} hitSlop={12}>
					<Text style={styles.skip}>건너뛰기</Text>
				</Pressable>
			</View>

			<View style={styles.listWrap}>
				<FlatList
					ref={listRef}
					data={SLIDES}
					keyExtractor={item => item.key}
					horizontal
					pagingEnabled
					showsHorizontalScrollIndicator={false}
					onViewableItemsChanged={onViewableItemsChanged}
					viewabilityConfig={viewabilityConfig}
					getItemLayout={(_, index) => ({
						length: width,
						offset: width * index,
						index,
					})}
					renderItem={({ item }) => (
						<View style={styles.slide}>
							<Text style={styles.emoji}>{item.emoji}</Text>
							<Text style={styles.title}>{item.title}</Text>
							<Text style={styles.body}>{item.body}</Text>
						</View>
					)}
				/>
			</View>

			<View style={styles.bottom}>
				<View style={styles.dots}>
					{SLIDES.map((_, i) => (
						<View
							key={i}
							style={[styles.dot, i === page && styles.dotActive]}
						/>
					))}
				</View>
				<Pressable style={styles.cta} onPress={goNext}>
					<Text style={styles.ctaText}>{isLast ? '시작하기' : '다음'}</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg.canvas },
	topBar: {
		paddingTop: spacing.xxxl + spacing.md,
		paddingHorizontal: spacing.xxl,
		alignItems: 'flex-end',
	},
	skip: {
		fontFamily: fonts.body,
		fontSize: 13,
		color: colors.ink.muted,
		letterSpacing: 0.5,
	},
	listWrap: {
		flex: 1,
	},
	slide: {
		width,
		alignItems: 'center',
		justifyContent: 'center',
		paddingHorizontal: spacing.xxxl,
	},
	emoji: {
		fontSize: 36,
		color: colors.accent.deep,
		marginBottom: spacing.xxl,
		letterSpacing: 6,
	},
	title: {
		fontFamily: fonts.display,
		fontSize: 26,
		color: colors.ink.primary,
		textAlign: 'center',
		marginBottom: spacing.lg,
		letterSpacing: 0.3,
	},
	body: {
		fontFamily: fonts.body,
		fontSize: 15,
		color: colors.ink.secondary,
		textAlign: 'center',
		lineHeight: 24,
	},
	bottom: {
		paddingHorizontal: spacing.xxxl,
		paddingBottom: spacing.xxxl + spacing.md,
		gap: spacing.xl,
	},
	dots: {
		flexDirection: 'row',
		justifyContent: 'center',
		gap: spacing.sm,
	},
	dot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: colors.border.strong,
	},
	dotActive: {
		backgroundColor: colors.accent.deep,
		width: 20,
	},
	cta: {
		height: 54,
		backgroundColor: colors.ink.primary,
		borderRadius: radius.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	ctaText: {
		fontFamily: fonts.bodyBold,
		color: colors.surface,
		fontSize: 15,
		letterSpacing: 0.5,
	},
});
