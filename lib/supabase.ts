import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';
import type { Database } from './database.types';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

// 웹에서는 SecureStore가 동작하지 않으므로 localStorage로 폴백
const ExpoSecureStoreAdapter =
	Platform.OS === 'web'
		? {
				getItem: (key: string) => Promise.resolve(localStorage.getItem(key)),
				setItem: (key: string, value: string) => {
					localStorage.setItem(key, value);
					return Promise.resolve();
				},
				removeItem: (key: string) => {
					localStorage.removeItem(key);
					return Promise.resolve();
				},
			}
		: {
				getItem: (key: string) => SecureStore.getItemAsync(key),
				setItem: (key: string, value: string) =>
					SecureStore.setItemAsync(key, value),
				removeItem: (key: string) => SecureStore.deleteItemAsync(key),
			};

export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey, {
	auth: {
		storage: ExpoSecureStoreAdapter,
		autoRefreshToken: true,
		persistSession: true,
		detectSessionInUrl: false,
	},
});
