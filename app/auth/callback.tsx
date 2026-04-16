import { Href, router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { supabase } from '../../lib/supabase';

// moodlit://auth/callback#access_token=...&refresh_token=...
export default function AuthCallback() {
	const params = useLocalSearchParams();

	useEffect(() => {
		const accessToken = params.access_token as string | undefined;
		const refreshToken = params.refresh_token as string | undefined;

		if (accessToken && refreshToken) {
			supabase.auth
				.setSession({ access_token: accessToken, refresh_token: refreshToken })
				.then(() => router.replace('/(tabs)'));
		} else {
			router.replace('/(auth)/login' as Href);
		}
	}, [params]);

	return (
		<View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
			<ActivityIndicator size="large" />
		</View>
	);
}
