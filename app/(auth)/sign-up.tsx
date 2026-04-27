import { router } from 'expo-router';
import { useRef, useState } from 'react';
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

const AUTH_ERROR_CODES: Record<string, string> = {
	user_already_exists: '이미 가입된 이메일입니다.',
	weak_password: '비밀번호는 6자 이상이어야 합니다.',
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

export default function SignUpScreen() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState(false);
	const passwordRef = useRef<TextInput>(null);

	async function handleSignUp() {
		if (!email.trim() || !password.trim()) {
			Toast.show({ type: 'error', text1: '이메일과 비밀번호를 입력해주세요.' });
			return;
		}
		if (password.length < 6) {
			Toast.show({ type: 'error', text1: '비밀번호는 6자 이상이어야 합니다.' });
			return;
		}

		setLoading(true);
		try {
			const trimmed = email.trim();
			const { error } = await supabase.auth.signUp({
				email: trimmed,
				password,
			});
			if (error) throw error;
			setPassword('');
			router.replace({
				pathname: '/(auth)/registration-success',
				params: { email: trimmed },
			});
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
					<Text style={styles.title}>가입하고 시작하기</Text>
					<Text style={styles.subtitle}>이메일로 moodlit을 시작해보세요.</Text>
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
						returnKeyType="next"
						onSubmitEditing={() => passwordRef.current?.focus()}
						blurOnSubmit={false}
					/>
					<TextInput
						ref={passwordRef}
						style={styles.input}
						placeholder="비밀번호 (6자 이상)"
						placeholderTextColor={colors.ink.placeholder}
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						returnKeyType="go"
						onSubmitEditing={handleSignUp}
					/>

					<Pressable
						style={[styles.button, loading && styles.buttonDisabled]}
						onPress={handleSignUp}
						disabled={loading}
					>
						{loading ? (
							<ActivityIndicator color={colors.surface} />
						) : (
							<Text style={styles.buttonText}>회원가입</Text>
						)}
					</Pressable>

					<Pressable
						onPress={() => router.replace('/(auth)/login')}
						style={styles.switchButton}
					>
						<Text style={styles.switchText}>
							이미 계정이 있으신가요? 로그인
						</Text>
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
