import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { supabase } from '../../lib/supabase';

WebBrowser.maybeCompleteAuthSession();

const REDIRECT_URL = 'moodlit://auth/callback';

export default function LoginScreen() {
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [isSignUp, setIsSignUp] = useState(false);
	const [loading, setLoading] = useState<'email' | 'google' | 'apple' | null>(null);

	useEffect(() => {
		// deep link로 돌아온 OAuth 세션 처리
		supabase.auth.getSession();
	}, []);

	async function handleEmailAuth() {
		if (!email.trim() || !password.trim()) {
			Alert.alert('입력 오류', '이메일과 비밀번호를 입력해주세요.');
			return;
		}
		setLoading('email');
		try {
			if (isSignUp) {
				const { error } = await supabase.auth.signUp({
					email: email.trim(),
					password,
				});
				if (error) throw error;
				Alert.alert('회원가입 완료', '이메일을 확인해주세요.');
			} else {
				const { error } = await supabase.auth.signInWithPassword({
					email: email.trim(),
					password,
				});
				if (error) throw error;
			}
		} catch (err: unknown) {
			Alert.alert('오류', err instanceof Error ? err.message : '오류가 발생했습니다.');
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

			const result = await WebBrowser.openAuthSessionAsync(data.url, REDIRECT_URL);

			if (result.type === 'success') {
				const url = new URL(result.url);
				// URL fragment에서 토큰 추출 (#access_token=...&refresh_token=...)
				const params = new URLSearchParams(url.hash.slice(1));
				const accessToken = params.get('access_token');
				const refreshToken = params.get('refresh_token');

				if (accessToken && refreshToken) {
					await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
				}
			}
		} catch (err: unknown) {
			Alert.alert('오류', err instanceof Error ? err.message : '로그인에 실패했습니다.');
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
				<Text style={styles.title}>moodlit</Text>
				<Text style={styles.subtitle}>AI가 추천하는 나만의 책 무드</Text>

				<View style={styles.oauthGroup}>
					<Pressable
						style={[styles.oauthButton, loading === 'google' && styles.buttonDisabled]}
						onPress={() => handleOAuth('google')}
						disabled={loading !== null}
					>
						{loading === 'google' ? (
							<ActivityIndicator color="#1a1a1a" />
						) : (
							<Text style={styles.oauthText}>Google로 계속하기</Text>
						)}
					</Pressable>

					{Platform.OS === 'ios' && (
						<Pressable
							style={[styles.oauthButton, styles.appleButton, loading === 'apple' && styles.buttonDisabled]}
							onPress={() => handleOAuth('apple')}
							disabled={loading !== null}
						>
							{loading === 'apple' ? (
								<ActivityIndicator color="#fff" />
							) : (
								<Text style={[styles.oauthText, styles.appleText]}>Apple로 계속하기</Text>
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
						placeholderTextColor="#999"
						value={email}
						onChangeText={setEmail}
						keyboardType="email-address"
						autoCapitalize="none"
						autoCorrect={false}
					/>
					<TextInput
						style={styles.input}
						placeholder="비밀번호"
						placeholderTextColor="#999"
						value={password}
						onChangeText={setPassword}
						secureTextEntry
					/>

					<Pressable
						style={[styles.button, loading === 'email' && styles.buttonDisabled]}
						onPress={handleEmailAuth}
						disabled={loading !== null}
					>
						{loading === 'email' ? (
							<ActivityIndicator color="#fff" />
						) : (
							<Text style={styles.buttonText}>{isSignUp ? '회원가입' : '로그인'}</Text>
						)}
					</Pressable>

					<Pressable onPress={() => setIsSignUp(v => !v)} style={styles.switchButton}>
						<Text style={styles.switchText}>
							{isSignUp
								? '이미 계정이 있으신가요? 로그인'
								: '계정이 없으신가요? 회원가입'}
						</Text>
					</Pressable>
				</View>
			</View>
		</KeyboardAvoidingView>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	inner: {
		flex: 1,
		justifyContent: 'center',
		paddingHorizontal: 32,
	},
	title: {
		fontSize: 40,
		fontWeight: '700',
		color: '#1a1a1a',
		textAlign: 'center',
		marginBottom: 8,
	},
	subtitle: {
		fontSize: 14,
		color: '#666',
		textAlign: 'center',
		marginBottom: 40,
	},
	oauthGroup: { gap: 12, marginBottom: 24 },
	oauthButton: {
		height: 52,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: '#fff',
	},
	appleButton: {
		backgroundColor: '#1a1a1a',
		borderColor: '#1a1a1a',
	},
	oauthText: { fontSize: 15, fontWeight: '500', color: '#1a1a1a' },
	appleText: { color: '#fff' },
	dividerRow: {
		flexDirection: 'row',
		alignItems: 'center',
		marginBottom: 24,
		gap: 12,
	},
	divider: { flex: 1, height: 1, backgroundColor: '#e0e0e0' },
	dividerText: { fontSize: 13, color: '#999' },
	form: { gap: 12 },
	input: {
		height: 52,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 12,
		paddingHorizontal: 16,
		fontSize: 15,
		color: '#1a1a1a',
		backgroundColor: '#fafafa',
	},
	button: {
		height: 52,
		backgroundColor: '#1a1a1a',
		borderRadius: 12,
		alignItems: 'center',
		justifyContent: 'center',
		marginTop: 4,
	},
	buttonDisabled: { opacity: 0.5 },
	buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
	switchButton: { alignItems: 'center', paddingVertical: 8 },
	switchText: { color: '#666', fontSize: 14 },
});
