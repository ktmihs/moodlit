import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
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

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URL = 'moodlit://auth/callback';

const AUTH_ERROR_CODES: Record<string, string> = {
	invalid_credentials: '이메일 또는 비밀번호가 올바르지 않습니다.',
	email_not_confirmed: '이메일 인증이 필요합니다. 받은 편지함을 확인해주세요.',
	invalid_email: '올바른 이메일 형식이 아닙니다.',
	over_email_send_rate_limit: '잠시 후 다시 시도해주세요.',
	over_request_rate_limit: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
	email_address_invalid: '올바른 이메일 형식이 아닙니다.',
};

function toKoreanError(err: unknown): string {
	const code = (err as { code?: string })?.code;
	if (code && AUTH_ERROR_CODES[code]) return AUTH_ERROR_CODES[code];
	return err instanceof Error ? err.message : '오류가 발생했습니다.';
}

async function completeOAuth(resultUrl: string) {
	const url = new URL(resultUrl);

	const errDesc =
		url.searchParams.get('error_description') ??
		new URLSearchParams(url.hash.replace(/^#/, '')).get('error_description');
	if (errDesc) throw new Error(errDesc);

	const code = url.searchParams.get('code');
	if (code) {
		const { error } = await supabase.auth.exchangeCodeForSession(code);
		if (error) throw error;
		return true;
	}

	const fragment = new URLSearchParams(url.hash.replace(/^#/, ''));
	const accessToken = fragment.get('access_token');
	const refreshToken = fragment.get('refresh_token');
	if (accessToken && refreshToken) {
		const { error } = await supabase.auth.setSession({
			access_token: accessToken,
			refresh_token: refreshToken,
		});
		if (error) throw error;
		return true;
	}

	return false;
}

export default function LoginScreen() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [loading, setLoading] = useState<'email' | 'google' | 'apple' | null>(
		null,
	);
	const passwordRef = useRef<TextInput>(null);

	async function handleEmailLogin() {
		if (!email.trim() || !password.trim()) {
			Toast.show({ type: 'error', text1: '이메일과 비밀번호를 입력해주세요.' });
			return;
		}

		setLoading('email');
		try {
			const { error } = await supabase.auth.signInWithPassword({
				email: email.trim(),
				password,
			});
			if (error) throw error;
			router.replace('/(tabs)');
		} catch (err: unknown) {
			Toast.show({ type: 'error', text1: toKoreanError(err) });
		} finally {
			setLoading(null);
		}
	}

	async function handleOAuth(provider: 'google' | 'apple') {
		setLoading(provider);
		try {
			const { data, error } = await supabase.auth.signInWithOAuth({
				provider,
				options: { redirectTo: REDIRECT_URL, skipBrowserRedirect: true },
			});
			if (error) throw error;
			if (!data.url) throw new Error('OAuth URL을 받지 못했습니다.');

			const result = await WebBrowser.openAuthSessionAsync(
				data.url,
				REDIRECT_URL,
			);

			if (result.type === 'success') {
				const ok = await completeOAuth(result.url);
				if (ok) {
					router.replace('/(tabs)');
				} else {
					throw new Error('로그인 응답을 해석하지 못했습니다.');
				}
			}
		} catch (err: unknown) {
			Toast.show({ type: 'error', text1: toKoreanError(err) });
		} finally {
			setLoading(null);
		}
	}

	return (
		<KeyboardAvoidingView
			style={styles.container}
			behavior={Platform.OS === 'ios' ? 'padding' : undefined}
		>
			<View style={styles.inner}>
				<View style={styles.brandWrap}>
					<Text style={styles.brandMark}>· moodlit ·</Text>
					<Text style={styles.title}>다시 오셨어요</Text>
					<Text style={styles.subtitle}>
						오늘의 한 페이지를{'\n'}이어서 펼쳐볼까요.
					</Text>
				</View>

				<View style={styles.oauthGroup}>
					<Pressable
						style={[
							styles.oauthButton,
							loading === 'google' && styles.buttonDisabled,
						]}
						onPress={() => handleOAuth('google')}
						disabled={loading !== null}
					>
						{loading === 'google' ? (
							<ActivityIndicator color={colors.ink.primary} />
						) : (
							<Text style={styles.oauthText}>Google로 계속하기</Text>
						)}
					</Pressable>

					{Platform.OS === 'ios' && (
						<Pressable
							style={[
								styles.oauthButton,
								styles.appleButton,
								loading === 'apple' && styles.buttonDisabled,
							]}
							onPress={() => handleOAuth('apple')}
							disabled={loading !== null}
						>
							{loading === 'apple' ? (
								<ActivityIndicator color={colors.surface} />
							) : (
								<Text style={[styles.oauthText, styles.appleText]}>
									Apple로 계속하기
								</Text>
							)}
						</Pressable>
					)}
				</View>

				<View style={styles.dividerRow}>
					<View style={styles.divider} />
					<Text style={styles.dividerText}>또는</Text>
					<View style={styles.divider} />
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
						placeholder="비밀번호"
						placeholderTextColor={colors.ink.placeholder}
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						returnKeyType="go"
						onSubmitEditing={handleEmailLogin}
					/>

					<Pressable
						style={[
							styles.button,
							loading === 'email' && styles.buttonDisabled,
						]}
						onPress={handleEmailLogin}
						disabled={loading !== null}
					>
						{loading === 'email' ? (
							<ActivityIndicator color={colors.surface} />
						) : (
							<Text style={styles.buttonText}>로그인</Text>
						)}
					</Pressable>

					<Pressable
						onPress={() => router.replace('/(auth)/sign-up')}
						style={styles.switchButton}
					>
						<Text style={styles.switchText}>계정이 없으신가요? 회원가입</Text>
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
	brandWrap: {
		alignItems: 'center',
		marginBottom: spacing.xxxl + spacing.sm,
	},
	brandMark: {
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
	oauthGroup: { gap: spacing.md, marginBottom: spacing.xxl },
	oauthButton: {
		height: 54,
		borderWidth: 1,
		borderColor: colors.border.strong,
		borderRadius: radius.lg,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.surface,
	},
	appleButton: {
		backgroundColor: colors.ink.primary,
		borderColor: colors.ink.primary,
	},
	oauthText: {
		fontFamily: fonts.bodyMedium,
		fontSize: 15,
		color: colors.ink.primary,
	},
	appleText: { color: colors.surface },
	dividerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: spacing.xxl,
		gap: spacing.md,
	},
	divider: { flex: 1, height: 1, backgroundColor: colors.border.base },
	dividerText: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.ink.muted,
		letterSpacing: 1,
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
