import { Href, Redirect, Stack } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { BrandIntro } from '../components/BrandIntro';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAppFonts } from '../hooks/useAppFonts';
import { useAuth } from '../hooks/useAuth';
import { useFeatureIntroFlag } from '../hooks/useFeatureIntroFlag';
import { colors } from '../lib/theme';

export default function RootLayout() {
	const { session, loading: authLoading } = useAuth();
	const fontsLoaded = useAppFonts();
	const { status: introStatus } = useFeatureIntroFlag();
	const [introDone, setIntroDone] = useState(false);

	const initializing =
		authLoading || !fontsLoaded || introStatus === 'loading';

	if (initializing) {
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

	if (!introDone) {
		return <BrandIntro onFinish={() => setIntroDone(true)} />;
	}

	let target: Href | null = null;
	if (!session) {
		target = '/(auth)/welcome' as Href;
	} else if (introStatus === 'unseen') {
		target = '/onboarding' as Href;
	}

	return (
		<ErrorBoundary>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(auth)" />
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="auth/callback" />
				<Stack.Screen name="onboarding" />
				{target && <Redirect href={target} />}
			</Stack>
			<Toast />
		</ErrorBoundary>
	);
}
