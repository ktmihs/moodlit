import { router, useLocalSearchParams } from 'expo-router';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../../lib/theme';

export default function RegistrationSuccessScreen() {
	const { email } = useLocalSearchParams<{ email?: string }>();

	return (
		<View style={styles.container}>
			<View style={styles.inner}>
				<View style={styles.badge}>
					<Text style={styles.badgeText}>✓</Text>
				</View>

				<Text style={styles.mark}>· moodlit ·</Text>
				<Text style={styles.title}>가입이 완료됐어요</Text>

				<Text style={styles.message}>
					{email
						? `${email} 주소로\n인증 메일을 보냈어요.`
						: '등록하신 이메일로\n인증 메일을 보냈어요.'}
					{'\n\n'}메일함의 링크를 눌러 인증을 완료한 뒤{'\n'}
					로그인해주세요.
				</Text>

				<View style={styles.hintCard}>
					<Text style={styles.hintTitle}>메일이 보이지 않나요?</Text>
					<Text style={styles.hintBody}>
						· 스팸함을 확인해주세요{'\n'}· 몇 분 정도 기다려주세요
					</Text>
				</View>

				<Pressable
					style={styles.primaryButton}
					onPress={() => router.replace('/(auth)/login')}
				>
					<Text style={styles.primaryText}>로그인 화면으로</Text>
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg.canvas },
	inner: {
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: spacing.xxxl,
	},
	badge: {
		alignSelf: 'center',
		width: 72,
		height: 72,
		borderRadius: 36,
		backgroundColor: colors.accent.soft,
		alignItems: 'center',
		justifyContent: 'center',
		marginBottom: spacing.xl,
		...Platform.select({
			ios: {
				shadowColor: colors.accent.deep,
				shadowOpacity: 0.15,
				shadowRadius: 16,
				shadowOffset: { width: 0, height: 6 },
			},
			android: { elevation: 4 },
		}),
	},
	badgeText: {
		fontFamily: fonts.bodyBold,
		fontSize: 32,
		color: colors.accent.deep,
	},
	mark: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.accent.deep,
		letterSpacing: 3,
		textAlign: 'center',
		marginBottom: spacing.md,
	},
	title: {
		fontFamily: fonts.display,
		fontSize: 28,
		color: colors.ink.primary,
		textAlign: 'center',
		marginBottom: spacing.lg,
		letterSpacing: 0.3,
	},
	message: {
		fontFamily: fonts.body,
		fontSize: 14,
		color: colors.ink.secondary,
		textAlign: 'center',
		lineHeight: 22,
		marginBottom: spacing.xxl,
	},
	hintCard: {
		backgroundColor: colors.bg.subtle,
		borderRadius: radius.lg,
		padding: spacing.lg,
		marginBottom: spacing.xxl,
	},
	hintTitle: {
		fontFamily: fonts.bodyMedium,
		fontSize: 13,
		color: colors.ink.primary,
		marginBottom: spacing.xs,
	},
	hintBody: {
		fontFamily: fonts.body,
		fontSize: 13,
		color: colors.ink.secondary,
		lineHeight: 20,
	},
	primaryButton: {
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
});
