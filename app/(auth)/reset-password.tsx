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
	weak_password: '비밀번호는 6자 이상이어야 합니다.',
	same_password: '이전과 다른 비밀번호로 설정해주세요.',
	over_request_rate_limit: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
};

function toKoreanError(err: unknown): string {
	const code = (err as { code?: string })?.code;
	if (code && AUTH_ERROR_CODES[code]) return AUTH_ERROR_CODES[code];
	return err instanceof Error ? err.message : '오류가 발생했습니다.';
}

export default function ResetPasswordScreen() {
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [loading, setLoading] = useState(false);
	const confirmRef = useRef<TextInput>(null);

	async function handleSubmit() {
		if (password.length < 6) {
			Toast.show({ type: 'error', text1: '비밀번호는 6자 이상이어야 합니다.' });
			return;
		}
		if (password !== confirm) {
			Toast.show({ type: 'error', text1: '비밀번호가 일치하지 않습니다.' });
			return;
		}

		setLoading(true);
		try {
			const { error } = await supabase.auth.updateUser({ password });
			if (error) throw error;

			// 새 비밀번호로 다시 로그인하도록 세션을 정리한다
			await supabase.auth.signOut();

			Toast.show({
				type: 'success',
				text1: '비밀번호가 변경됐어요. 새 비밀번호로 로그인해주세요.',
			});
			router.replace('/(auth)/login');
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
					<Text style={styles.title}>새 비밀번호 설정</Text>
					<Text style={styles.subtitle}>
						앞으로 사용하실 비밀번호를{'\n'}입력해주세요.
					</Text>
				</View>

				<View style={styles.form}>
					<TextInput
						style={styles.input}
						placeholder="새 비밀번호 (6자 이상)"
						placeholderTextColor={colors.ink.placeholder}
						value={password}
						onChangeText={setPassword}
						secureTextEntry
						autoFocus
						returnKeyType="next"
						onSubmitEditing={() => confirmRef.current?.focus()}
						blurOnSubmit={false}
					/>
					<TextInput
						ref={confirmRef}
						style={styles.input}
						placeholder="비밀번호 확인"
						placeholderTextColor={colors.ink.placeholder}
						value={confirm}
						onChangeText={setConfirm}
						secureTextEntry
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
							<Text style={styles.buttonText}>비밀번호 변경</Text>
						)}
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
});
