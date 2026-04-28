import { router } from 'expo-router';
import { useRef, useState } from 'react';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	ScrollView,
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

interface FieldErrors {
	nickname?: string;
	email?: string;
	password?: string;
	confirm?: string;
}

export default function SignUpScreen() {
	const [nickname, setNickname] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');
	const [errors, setErrors] = useState<FieldErrors>({});
	const [loading, setLoading] = useState(false);

	const emailRef = useRef<TextInput>(null);
	const passwordRef = useRef<TextInput>(null);
	const confirmRef = useRef<TextInput>(null);

	function validate(): boolean {
		const errs: FieldErrors = {};

		const nick = nickname.trim();
		if (!nick) errs.nickname = '닉네임을 입력해주세요.';
		else if (nick.length < 2) errs.nickname = '닉네임은 2자 이상이어야 합니다.';
		else if (nick.length > 10) errs.nickname = '닉네임은 10자 이하여야 합니다.';

		const mail = email.trim();
		if (!mail) errs.email = '이메일을 입력해주세요.';
		else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))
			errs.email = '올바른 이메일 형식이 아닙니다.';

		if (!password) errs.password = '비밀번호를 입력해주세요.';
		else if (password.length < 6)
			errs.password = '비밀번호는 6자 이상이어야 합니다.';

		if (!confirm) errs.confirm = '비밀번호를 한 번 더 입력해주세요.';
		else if (confirm !== password)
			errs.confirm = '비밀번호가 일치하지 않습니다.';

		setErrors(errs);
		return Object.keys(errs).length === 0;
	}

	async function handleSignUp() {
		if (!validate()) return;

		setLoading(true);
		try {
			const trimmedEmail = email.trim();
			const trimmedNick = nickname.trim();

			const { error } = await supabase.auth.signUp({
				email: trimmedEmail,
				password,
				options: {
					data: { full_name: trimmedNick },
				},
			});
			if (error) throw error;

			setPassword('');
			setConfirm('');
			router.replace({
				pathname: '/(auth)/registration-success',
				params: { email: trimmedEmail },
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
			<ScrollView
				contentContainerStyle={styles.inner}
				keyboardShouldPersistTaps={'handled'}
				showsVerticalScrollIndicator={false}
			>
				<View style={styles.header}>
					<Text style={styles.mark}>· moodlit ·</Text>
					<Text style={styles.title}>가입하고 시작하기</Text>
					<Text style={styles.subtitle}>이메일로 moodlit을 시작해보세요.</Text>
				</View>

				<View style={styles.form}>
					<View style={styles.fieldWrap}>
						<Text style={styles.label}>닉네임</Text>
						<TextInput
							style={[styles.input, !!errors.nickname && styles.inputError]}
							placeholder={'어떻게 불러드릴까요? (2~10자)'}
							placeholderTextColor={colors.ink.placeholder}
							value={nickname}
							onChangeText={v => {
								setNickname(v);
								if (errors.nickname)
									setErrors(e => ({ ...e, nickname: undefined }));
							}}
							autoCorrect={false}
							maxLength={10}
							returnKeyType={'next'}
							onSubmitEditing={() => emailRef.current?.focus()}
							blurOnSubmit={false}
						/>
						{!!errors.nickname && (
							<Text style={styles.errorText}>{errors.nickname}</Text>
						)}
					</View>

					<View style={styles.fieldWrap}>
						<Text style={styles.label}>이메일</Text>
						<TextInput
							ref={emailRef}
							style={[styles.input, !!errors.email && styles.inputError]}
							placeholder={'로그인에 사용할 이메일을 입력해주세요'}
							placeholderTextColor={colors.ink.placeholder}
							value={email}
							onChangeText={v => {
								setEmail(v);
								if (errors.email) setErrors(e => ({ ...e, email: undefined }));
							}}
							keyboardType={'email-address'}
							autoCapitalize={'none'}
							autoCorrect={false}
							returnKeyType={'next'}
							onSubmitEditing={() => passwordRef.current?.focus()}
							blurOnSubmit={false}
						/>
						{!!errors.email && (
							<Text style={styles.errorText}>{errors.email}</Text>
						)}
					</View>

					<View style={styles.sectionDivider}>
						<View style={styles.dividerLine} />
						<Text style={styles.dividerLabel}>비밀번호 설정</Text>
						<View style={styles.dividerLine} />
					</View>

					<View style={styles.fieldWrap}>
						<Text style={styles.label}>비밀번호</Text>
						<TextInput
							ref={passwordRef}
							style={[styles.input, !!errors.password && styles.inputError]}
							placeholder={'영문, 숫자 조합 6자 이상을 권장해요'}
							placeholderTextColor={colors.ink.placeholder}
							value={password}
							onChangeText={v => {
								setPassword(v);
								if (errors.password)
									setErrors(e => ({ ...e, password: undefined }));
							}}
							secureTextEntry
							returnKeyType={'next'}
							onSubmitEditing={() => confirmRef.current?.focus()}
							blurOnSubmit={false}
						/>
						{!!errors.password && (
							<Text style={styles.errorText}>{errors.password}</Text>
						)}
					</View>

					<View style={styles.fieldWrap}>
						<Text style={styles.label}>비밀번호 확인</Text>
						<TextInput
							ref={confirmRef}
							style={[styles.input, !!errors.confirm && styles.inputError]}
							placeholder={'위 비밀번호를 한 번 더 입력해주세요'}
							placeholderTextColor={colors.ink.placeholder}
							value={confirm}
							onChangeText={v => {
								setConfirm(v);
								if (errors.confirm)
									setErrors(e => ({ ...e, confirm: undefined }));
							}}
							secureTextEntry
							returnKeyType={'go'}
							onSubmitEditing={handleSignUp}
						/>
						{!!errors.confirm && (
							<Text style={styles.errorText}>{errors.confirm}</Text>
						)}
					</View>

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
			</ScrollView>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg.canvas },
	inner: {
		flexGrow: 1,
		justifyContent: 'center',
		paddingHorizontal: spacing.xxxl,
		paddingVertical: spacing.xxxl,
	},
	header: {
		alignItems: 'center',
		marginBottom: spacing.xxxl,
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
	fieldWrap: { gap: 6 },
	label: {
		fontFamily: fonts.bodyMedium,
		fontSize: 12,
		color: colors.ink.secondary,
		letterSpacing: 0.3,
	},
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
	inputError: {
		borderColor: colors.state.danger,
	},
	errorText: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.state.danger,
		paddingHorizontal: spacing.xs,
	},
	sectionDivider: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.md,
		marginVertical: spacing.xs,
	},
	dividerLine: { flex: 1, height: 1, backgroundColor: colors.border.base },
	dividerLabel: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.ink.muted,
		letterSpacing: 0.5,
	},
	button: {
		height: 54,
		backgroundColor: colors.ink.primary,
		borderRadius: radius.lg,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: spacing.sm,
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
