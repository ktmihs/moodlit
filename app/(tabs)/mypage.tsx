import { router } from 'expo-router';
import { useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	Platform,
	Pressable,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { supabase } from '../../lib/supabase';

async function signOut() {
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
}

async function deleteAccount() {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) throw new Error('로그인이 필요합니다.');

	// Supabase는 클라이언트에서 직접 계정 삭제 불가 → 백엔드 필요
	// 현재는 로그아웃으로 대체하고 추후 구현
	throw new Error('계정 탈퇴는 현재 준비 중입니다.');
}

export default function MyPageScreen() {
	const insets = useSafeAreaInsets();
	const [loading, setLoading] = useState<'signout' | 'delete' | null>(null);

	async function handleSignOut() {
		setLoading('signout');
		try {
			await signOut();
			router.replace('/(auth)/login' as never);
		} catch (err: unknown) {
			Toast.show({
				type: 'error',
				text1: err instanceof Error ? err.message : '로그아웃에 실패했습니다.',
			});
		} finally {
			setLoading(null);
		}
	}

	function confirmDeleteAccount() {
		if (Platform.OS === 'web') {
			// 웹에서는 window.confirm 사용
			if (
				window.confirm(
					'정말로 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
				)
			) {
				handleDeleteAccount();
			}
			return;
		}
		Alert.alert(
			'계정 탈퇴',
			'정말로 계정을 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.',
			[
				{ text: '취소', style: 'cancel' },
				{ text: '탈퇴', style: 'destructive', onPress: handleDeleteAccount },
			],
		);
	}

	async function handleDeleteAccount() {
		setLoading('delete');
		try {
			await deleteAccount();
			router.replace('/(auth)/login' as never);
		} catch (err: unknown) {
			Toast.show({
				type: 'error',
				text1: err instanceof Error ? err.message : '계정 탈퇴에 실패했습니다.',
			});
		} finally {
			setLoading(null);
		}
	}

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<Text style={styles.headerTitle}>나의 무드</Text>
			</View>

			<View style={styles.section}>
				<Pressable
					style={[styles.row, loading === 'signout' && styles.rowDisabled]}
					onPress={handleSignOut}
					disabled={loading !== null}
				>
					<Text style={styles.rowLabel}>로그아웃</Text>
					{loading === 'signout' ? (
						<ActivityIndicator size="small" color="#666" />
					) : (
						<Text style={styles.rowArrow}>›</Text>
					)}
				</Pressable>
			</View>

			<View style={styles.section}>
				<Pressable
					style={[styles.row, loading === 'delete' && styles.rowDisabled]}
					onPress={confirmDeleteAccount}
					disabled={loading !== null}
				>
					<Text style={[styles.rowLabel, styles.destructive]}>계정 탈퇴</Text>
					{loading === 'delete' ? (
						<ActivityIndicator size="small" color="#e53e3e" />
					) : (
						<Text style={[styles.rowArrow, styles.destructive]}>›</Text>
					)}
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#f8f8f8' },
	header: {
		paddingHorizontal: 20,
		paddingVertical: 16,
		backgroundColor: '#fff',
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	headerTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
	section: {
		marginTop: 24,
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderBottomWidth: 1,
		borderColor: '#f0f0f0',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: 20,
		paddingVertical: 16,
	},
	rowDisabled: { opacity: 0.5 },
	rowLabel: { fontSize: 16, color: '#1a1a1a' },
	rowArrow: { fontSize: 20, color: '#ccc' },
	destructive: { color: '#e53e3e' },
});
