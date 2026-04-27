import { router } from 'expo-router';
import { useState } from 'react';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, spacing } from '../../lib/theme';

const RESET_REDIRECT_URL = 'moodlit://auth/callback?type=recovery';
const EMAIL_REGEX = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

const AUTH_ERROR_CODES: Record<string, string> = {
	invalid_email: '올바른 이메일 형식이 아닙니다.',
	email_address_invalid: '올바른 이메일 형식이 아닙니다.',
	over_email_send_rate_limit: '잠시 후 다시 시도해주세요.',
	over_request_rate_limit: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
};

function toKoreanError(err: unknown): string {
	const code = (err as { code?: string })?.code;
	if (code && AUTH_ERROR_CODES[code]) return AUTH_ERROR_CODES[code];
	return err instanceof Error ? err.message : '오류가 발생했습니다.';
}

export default function ForgotPasswordScreen() {
	const [email, setEmail] = useState('');
	const [loading, setLoading] = useState(false);

	async function handleSubmit() {
		const trimmed = email.trim();

		if (!trimmed) {
			Toast.show({ type: 'error', text1: '이메일을 입력해주세요.' });
			return;
		}
		if (!EMAIL_REGEX.test(trimmed)) {
			Toast.show({ type: 'error', text1: '올바른 이메일 형식이 아닙니다.' });
			return;
		}

		setLoading(true);
		try {
			// Supabase는 이메일 enumeration 방지를 위해 미가입 계정에 대해서도
			// 동일한 성공 응답을 반환한다. 따라서 토스트는 항상 success 톤을 유지한다.
			const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
				redirectTo: RESET_REDIRECT_URL,
			});
			if (error) throw error;

			Toast.show({
				type: 'success',
				text1: '재설정 메일을 보냈어요. 받은 편지함을 확인해주세요.',
			});

			setTimeout(() => {
				router.replace('/(auth)/login');
			}, 1200);
		} catch (err: unknown) {
			Toast.show({ type: 'error', text1: toKoreanError(err) });
		} finally {
			setLoading(false);
		}
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<View style={styles.inner}>
				<View style={styles.header}>
					<Text style={styles.mark}>· moodlit ·</Text>
					<Text style={styles.title}>비밀번호를 잊으셨나요</Text>
					<Text style={styles.subtitle}>
						가입하신 이메일로{'\n'}재설정 링크를 보내드릴게요.
					</Text>
				</View>

				<View style={styles.form}>
					<TextInput
						style={styles.input}
						placeholder="이메일"
						placeholderTextColor={colors.ink.placeholder}
						value={email}
						onChangeText={setEmail}
						keyboardType="email-address"
						autoCapitalize="none"
						autoCorrect={false}
						autoFocus
						returnKeyType="go"
						onSubmitEditing={handleSubmit}
					/>

					<Pressable
						style={[styles.button, loading && styles.buttonDisabled]}
						onPress={handleSubmit}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator color={colors.surface} />
						) : (
							<Text style={styles.buttonText}>재설정 메일 보내기</Text>
						)}
					</Pressable>

					<Pressable
						onPress={() => router.replace('/(auth)/login')}
						style={styles.switchButton}
					>
						<Text style={styles.switchText}>로그인으로 돌아가기</Text>
					</Pressable>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg.canvas },
	inner: {
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: spacing.xxxl,
	},
	header: {
		alignItems: 'center',
		marginBottom: spacing.xxl,
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
		fontSize: 28,
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
	form: { gap: spacing.md },
	input: {
		height: 54,
		borderWidth: 1,
		borderColor: colors.border.base,
		borderRadius: radius.lg,
		paddingHorizontal: spacing.lg,
		fontSize: 15,
		fontFamily: fonts.body,
		color: colors.ink.primary,
		backgroundColor: colors.surface,
	},
	button: {
		height: 54,
		backgroundColor: colors.ink.primary,
		borderRadius: radius.lg,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: spacing.xs,
	},
	buttonDisabled: { opacity: 0.5 },
	buttonText: {
		fontFamily: fonts.bodyBold,
		color: colors.surface,
		fontSize: 15,
		letterSpacing: 0.5,
	},
	switchButton: { alignItems: 'center', paddingVertical: spacing.sm },
	switchText: {
		fontFamily: fonts.body,
		color: colors.ink.secondary,
		fontSize: 13,
	},
});
