import { GowunDodum_400Regular } from '@expo-google-fonts/gowun-dodum';
import {
	NotoSansKR_400Regular,
	NotoSansKR_500Medium,
	NotoSansKR_700Bold,
} from '@expo-google-fonts/noto-sans-kr';
import { useFonts } from 'expo-font';
import { Href, Redirect, Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
	const { session, loading } = useAuth();
	const [fontsLoaded] = useFonts({
		GowunDodum_400Regular,
		NotoSansKR_400Regular,
		NotoSansKR_500Medium,
		NotoSansKR_700Bold,
	});

	useEffect(() => {
		if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
	}, [fontsLoaded]);

	if (loading || !fontsLoaded) {
		return (
			<View
				style={{
					flex: 1,
					alignItems: 'center',
					justifyContent: 'center',
					backgroundColor: colors.bg.canvas,
				}}
			>
				<ActivityIndicator size="large" color={colors.ink.primary} />
			</View>
		);
	}

	return (
		<>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(auth)" />
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="auth/callback" />
				{!session && <Redirect href={'/(auth)/login' as Href} />}
			</Stack>
			<Toast />
		</>
	);
}
