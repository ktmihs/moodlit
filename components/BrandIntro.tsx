import { Image } from 'expo-image';
import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
	Easing,
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withDelay,
	withSequence,
	withTiming,
} from 'react-native-reanimated';
import { colors, fonts, spacing } from '../lib/theme';

const LOGO = require('../assets/images/icon.png');

const FADE_IN_MS = 550;
const HOLD_MS = 700;
const FADE_OUT_MS = 450;

interface Props {
	onFinish: () => void;
}

export function BrandIntro({ onFinish }: Props) {
	const opacity = useSharedValue(0);
	const scale = useSharedValue(0.92);

	useEffect(() => {
		scale.value = withTiming(1, {
			duration: FADE_IN_MS + 200,
			easing: Easing.out(Easing.cubic),
		});

		opacity.value = withSequence(
			withTiming(1, {
				duration: FADE_IN_MS,
				easing: Easing.out(Easing.cubic),
			}),
			withDelay(
				HOLD_MS,
				withTiming(
					0,
					{ duration: FADE_OUT_MS, easing: Easing.in(Easing.cubic) },
					finished => {
						if (finished) runOnJS(onFinish)();
					},
				),
			),
		);
	}, [opacity, scale, onFinish]);

	const logoStyle = useAnimatedStyle(() => ({
		opacity: opacity.value,
		transform: [{ scale: scale.value }],
	}));

	return (
		<View style={styles.container}>
			<Animated.View style={[styles.content, logoStyle]}>
				<Image source={LOGO} style={styles.logo} contentFit="contain" />
				<Text style={styles.mark}>· moodlit ·</Text>
				<Text style={styles.tagline}>오늘의 한 페이지</Text>
			</Animated.View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.bg.canvas,
		alignItems: 'center',
		justifyContent: 'center',
	},
	content: {
		alignItems: 'center',
	},
	logo: {
		width: 96,
		height: 96,
		marginBottom: spacing.xl,
	},
	mark: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.accent.deep,
		letterSpacing: 3,
		marginBottom: spacing.sm,
	},
	tagline: {
		fontFamily: fonts.display,
		fontSize: 22,
		color: colors.ink.primary,
		letterSpacing: 0.3,
	},
});
