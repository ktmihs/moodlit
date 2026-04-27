import { Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../../lib/supabase';

export default function AuthCallback() {
	const params = useLocalSearchParams();

	useEffect(() => {
		const run = async () => {
			// 비밀번호 재설정 플로우는 type=recovery 로 식별한다
			const type = params.type as string | undefined;
			const isRecovery = type === 'recovery';

			const code = params.code as string | undefined;
			if (code) {
				const { error } = await supabase.auth.exchangeCodeForSession(code);
				if (!error) {
					router.replace(
						(isRecovery ? '/(auth)/reset-password' : '/(tabs)') as Href,
					);
					return;
				}
			}

			const accessToken = params.access_token as string | undefined;
			const refreshToken = params.refresh_token as string | undefined;
			if (accessToken && refreshToken) {
				const { error } = await supabase.auth.setSession({
					access_token: accessToken,
					refresh_token: refreshToken,
				});
				if (!error) {
					router.replace(
						(isRecovery ? '/(auth)/reset-password' : '/(tabs)') as Href,
					);
					return;
				}
			}

			router.replace('/(auth)/login' as Href);
		};
		run();
	}, [params]);

	return (
		<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
			<ActivityIndicator size="large" />
		</View>
	);
}
