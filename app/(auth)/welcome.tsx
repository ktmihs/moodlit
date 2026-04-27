import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../../lib/theme';

const LOGO = require('../../assets/images/icon.png');

export default function WelcomeScreen() {
	return (
		<View style={styles.container}>
			<View style={styles.brandWrap}>
				<Image source={LOGO} style={styles.logo} contentFit="contain" />
				<Text style={styles.mark}>· moodlit ·</Text>
				<Text style={styles.title}>오늘의 한 페이지</Text>
				<Text style={styles.subtitle}>AI가 펼쳐주는{'\n'}나만의 책 무드</Text>
			</View>

			<View style={styles.actions}>
				<Pressable
					style={styles.primary}
					onPress={() => router.push('/(auth)/login')}
				>
					<Text style={styles.primaryText}>로그인</Text>
				</Pressable>
				<Pressable
					style={styles.secondary}
					onPress={() => router.push('/(auth)/sign-up')}
				>
					<Text style={styles.secondaryText}>회원가입</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		backgroundColor: colors.bg.canvas,
		paddingHorizontal: spacing.xxxl,
		paddingBottom: spacing.xxxl + spacing.md,
	},
	brandWrap: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
	},
	logo: {
		width: 84,
		height: 84,
		marginBottom: spacing.xl,
	},
	mark: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.accent.deep,
		letterSpacing: 3,
		marginBottom: spacing.lg,
	},
	title: {
		fontFamily: fonts.display,
		fontSize: 32,
		color: colors.ink.primary,
		textAlign: 'center',
		marginBottom: spacing.md,
		letterSpacing: 0.3,
	},
	subtitle: {
		fontFamily: fonts.body,
		fontSize: 14,
		color: colors.ink.secondary,
		textAlign: 'center',
		lineHeight: 22,
	},
	actions: {
		gap: spacing.md,
	},
	primary: {
		height: 54,
		backgroundColor: colors.ink.primary,
		borderRadius: radius.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	primaryText: {
		fontFamily: fonts.bodyBold,
		color: colors.surface,
		fontSize: 15,
		letterSpacing: 0.5,
	},
	secondary: {
		height: 54,
		backgroundColor: colors.surface,
		borderColor: colors.border.strong,
		borderWidth: 1,
		borderRadius: radius.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	secondaryText: {
		fontFamily: fonts.bodyMedium,
		color: colors.ink.primary,
		fontSize: 15,
		letterSpacing: 0.5,
	},
});
