import { GowunDodum_400Regular } from '@expo-google-fonts/gowun-dodum';
import {
	NotoSansKR_400Regular,
	NotoSansKR_500Medium,
	NotoSansKR_700Bold,
} from '@expo-google-fonts/noto-sans-kr';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

SplashScreen.preventAutoHideAsync().catch(() => {});

export function useAppFonts() {
	const [fontsLoaded, fontError] = useFonts({
		GowunDodum_400Regular,
		NotoSansKR_400Regular,
		NotoSansKR_500Medium,
		NotoSansKR_700Bold,
	});

	useEffect(() => {
		if (fontsLoaded || fontError) {
			SplashScreen.hideAsync().catch(() => {});
		}
	}, [fontsLoaded, fontError]);

	return fontsLoaded;
}
