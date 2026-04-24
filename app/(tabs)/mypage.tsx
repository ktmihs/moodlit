import { Ionicons } from '@expo/vector-icons';
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
import { colors, fonts, radius, shadow, spacing } from '../../lib/theme';

async function signOut() {
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
}

async function deleteAccount() {
	const {
		data: { session },
	} = await supabase.auth.getSession();
	if (!session) throw new Error('로그인이 필요합니다.');

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
				<Text style={styles.eyebrow}>당신의 결</Text>
				<Text style={styles.headerTitle}>나의 무드</Text>
			</View>

			<View style={styles.profileCard}>
				<View style={styles.avatar}>
					<Ionicons name="leaf-outline" size={28} color={colors.accent.deep} />
				</View>
				<View style={{ flex: 1 }}>
					<Text style={styles.profileName}>독자님</Text>
					<Text style={styles.profileHint}>천천히, 깊이 읽고 있어요</Text>
				</View>
			</View>

			<Text style={styles.sectionTitle}>계정</Text>
			<View style={styles.section}>
				<Pressable
					style={[styles.row, loading === 'signout' && styles.rowDisabled]}
					onPress={handleSignOut}
					disabled={loading !== null}
				>
					<View style={styles.rowLeft}>
						<Ionicons
							name="log-out-outline"
							size={18}
							color={colors.ink.secondary}
						/>
						<Text style={styles.rowLabel}>로그아웃</Text>
					</View>
					{loading === 'signout' ? (
						<ActivityIndicator size="small" color={colors.ink.muted} />
					) : (
						<Ionicons
							name="chevron-forward"
							size={18}
							color={colors.ink.muted}
						/>
					)}
				</Pressable>

				<View style={styles.divider} />

				<Pressable
					style={[styles.row, loading === 'delete' && styles.rowDisabled]}
					onPress={confirmDeleteAccount}
					disabled={loading !== null}
				>
					<View style={styles.rowLeft}>
						<Ionicons
							name="trash-outline"
							size={18}
							color={colors.state.danger}
						/>
						<Text style={[styles.rowLabel, styles.destructive]}>
							계정 탈퇴
						</Text>
					</View>
					{loading === 'delete' ? (
						<ActivityIndicator size="small" color={colors.state.danger} />
					) : (
						<Ionicons
							name="chevron-forward"
							size={18}
							color={colors.state.danger}
						/>
					)}
				</Pressable>
			</View>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: colors.bg.canvas },
	header: {
		paddingHorizontal: spacing.xxl,
		paddingTop: spacing.lg,
		paddingBottom: spacing.lg,
	},
	eyebrow: {
		fontFamily: fonts.body,
		fontSize: 11,
		color: colors.accent.deep,
		letterSpacing: 1.5,
		textTransform: 'uppercase',
		marginBottom: 4,
	},
	headerTitle: {
		fontFamily: fonts.display,
		fontSize: 28,
		color: colors.ink.primary,
		letterSpacing: 0.3,
	},
	profileCard: {
		marginHorizontal: spacing.xxl,
		marginTop: spacing.sm,
		marginBottom: spacing.xxl,
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.lg,
		padding: spacing.xl,
		backgroundColor: colors.surface,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border.base,
		...shadow.card,
	},
	avatar: {
		width: 52,
		height: 52,
		borderRadius: radius.pill,
		backgroundColor: colors.accent.soft,
		alignItems: 'center',
		justifyContent: 'center',
	},
	profileName: {
		fontFamily: fonts.display,
		fontSize: 18,
		color: colors.ink.primary,
		marginBottom: 2,
	},
	profileHint: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.ink.secondary,
	},
	sectionTitle: {
		fontFamily: fonts.bodyMedium,
		fontSize: 11,
		color: colors.ink.muted,
		letterSpacing: 1.2,
		textTransform: 'uppercase',
		paddingHorizontal: spacing.xxl,
		marginBottom: spacing.sm,
	},
	section: {
		marginHorizontal: spacing.xxl,
		backgroundColor: colors.surface,
		borderRadius: radius.lg,
		borderWidth: 1,
		borderColor: colors.border.base,
		overflow: 'hidden',
	},
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		justifyContent: 'space-between',
		paddingHorizontal: spacing.xl,
		paddingVertical: spacing.lg,
	},
	rowLeft: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.md,
	},
	rowDisabled: { opacity: 0.5 },
	rowLabel: {
		fontFamily: fonts.body,
		fontSize: 15,
		color: colors.ink.primary,
	},
	divider: {
		height: 1,
		backgroundColor: colors.border.base,
		marginHorizontal: spacing.xl,
	},
	destructive: { color: colors.state.danger },
});
