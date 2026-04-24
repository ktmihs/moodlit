import { Href, Redirect, Stack } from 'expo-router';
import { ActivityIndicator, View } from 'react-native';
import Toast from 'react-native-toast-message';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { useAppFonts } from '../hooks/useAppFonts';
import { useAuth } from '../hooks/useAuth';
import { colors } from '../lib/theme';

export default function RootLayout() {
	const { session, loading } = useAuth();
	const fontsLoaded = useAppFonts();

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
		<ErrorBoundary>
			<Stack screenOptions={{ headerShown: false }}>
				<Stack.Screen name="(auth)" />
				<Stack.Screen name="(tabs)" />
				<Stack.Screen name="auth/callback" />
				{!session && <Redirect href={'/(auth)/login' as Href} />}
			</Stack>
			<Toast />
		</ErrorBoundary>
	);
}
