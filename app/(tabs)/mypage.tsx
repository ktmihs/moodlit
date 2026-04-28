import { Ionicons } from '@expo/vector-icons';
import Constants from 'expo-constants';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	Alert,
	KeyboardAvoidingView,
	Linking,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { colors, fonts, radius, shadow, spacing } from '../../lib/theme';

const SUPPORT_EMAIL = 'yellowgreen423@gmail.com';
const PRIVACY_URL = 'https://mood-lit-backend.fly.dev/privacy';
const TERMS_URL = 'https://mood-lit-backend.fly.dev/terms';

const APP_VERSION = Constants.expoConfig?.version ?? '1.0.0';
const DISPLAY_NAME_MAX = 20;

async function signOut() {
	const { error } = await supabase.auth.signOut();
	if (error) throw error;
}

async function deleteAccount() {
	const { error } = await supabase.functions.invoke('delete-account', {
		method: 'POST',
	});
	if (error) throw error;
	// Edge Function이 auth.users를 삭제했지만 클라이언트에 남아있는 토큰은 별도로 비워준다
	await supabase.auth.signOut();
}

async function openExternal(url: string) {
	try {
		const canOpen = await Linking.canOpenURL(url);
		if (!canOpen) throw new Error('지원하지 않는 링크입니다.');
		await Linking.openURL(url);
	} catch {
		Toast.show({ type: 'error', text1: '링크를 열 수 없습니다.' });
	}
}

export default function MyPageScreen() {
	const insets = useSafeAreaInsets();
	const { session } = useAuth();
	const [displayName, setDisplayName] = useState<string | null>(null);
	const [loading, setLoading] = useState<'signout' | 'delete' | null>(null);
	const [editVisible, setEditVisible] = useState(false);
	const [editDraft, setEditDraft] = useState('');
	const [editSaving, setEditSaving] = useState(false);

	const email = session?.user?.email ?? '';
	const userId = session?.user?.id;

	useEffect(() => {
		if (!userId) return;

		let cancelled = false;
		(async () => {
			const { data } = await supabase
				.from('users')
				.select('display_name')
				.eq('id', userId)
				.maybeSingle();
			const row = data as { display_name: string | null } | null;
			if (!cancelled) setDisplayName(row?.display_name ?? null);
		})();

		return () => {
			cancelled = true;
		};
	}, [userId]);

	function openEdit() {
		setEditDraft(displayName ?? '');
		setEditVisible(true);
	}

	async function handleSaveName() {
		if (!userId) return;
		const next = editDraft.trim();
		const nextValue =
			next.length === 0 ? null : next.slice(0, DISPLAY_NAME_MAX);

		setEditSaving(true);
		try {
			// Database 타입 정의에 Relationships 필드가 없어 update payload 가

			const { error } = await (supabase as any)
				.from('users')
				.update({ display_name: nextValue })
				.eq('id', userId);
			if (error) throw error;
			setDisplayName(nextValue);
			setEditVisible(false);
			Toast.show({ type: 'success', text1: '이름이 변경됐어요.' });
		} catch (err: unknown) {
			Toast.show({
				type: 'error',
				text1: err instanceof Error ? err.message : '이름 변경에 실패했습니다.',
			});
		} finally {
			setEditSaving(false);
		}
	}

	async function handleSignOut() {
		setLoading('signout');
		try {
			await signOut();
			router.replace('/(auth)/welcome' as never);
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
		const message =
			'정말로 계정을 삭제하시겠습니까?\n독서 기록·리뷰가 모두 영구 삭제되며 되돌릴 수 없습니다.';

		if (Platform.OS === 'web') {
			if (window.confirm(message)) handleDeleteAccount();
			return;
		}
		Alert.alert('계정 탈퇴', message, [
			{ text: '취소', style: 'cancel' },
			{ text: '탈퇴', style: 'destructive', onPress: handleDeleteAccount },
		]);
	}

	async function handleDeleteAccount() {
		setLoading('delete');
		try {
			await deleteAccount();
			Toast.show({ type: 'success', text1: '계정이 삭제되었습니다.' });
			router.replace('/(auth)/welcome' as never);
		} catch (err: unknown) {
			Toast.show({
				type: 'error',
				text1: err instanceof Error ? err.message : '계정 탈퇴에 실패했습니다.',
			});
		} finally {
			setLoading(null);
		}
	}

	const profileTitle = displayName?.trim() || '독자님';

	return (
		<ScrollView
			style={[styles.container, { paddingTop: insets.top }]}
			contentContainerStyle={{ paddingBottom: spacing.xxxl }}
			showsVerticalScrollIndicator={false}
		>
			<View style={styles.header}>
				<Text style={styles.eyebrow}>당신의 결</Text>
				<Text style={styles.headerTitle}>나의 무드</Text>
			</View>

			<Pressable style={styles.profileCard} onPress={openEdit}>
				<View style={styles.avatar}>
					<Ionicons name="leaf-outline" size={28} color={colors.accent.deep} />
				</View>
				<View style={{ flex: 1 }}>
					<Text style={styles.profileName} numberOfLines={1}>
						{profileTitle}
					</Text>
					{email ? (
						<Text style={styles.profileEmail} numberOfLines={1}>
							{email}
						</Text>
					) : (
						<Text style={styles.profileHint}>천천히, 깊이 읽고 있어요</Text>
					)}
				</View>
				<Ionicons name="pencil-outline" size={18} color={colors.ink.muted} />
			</Pressable>

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
						<Text style={[styles.rowLabel, styles.destructive]}>계정 탈퇴</Text>
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

			<Text style={styles.sectionTitle}>지원</Text>
			<View style={styles.section}>
				<Pressable
					style={styles.row}
					onPress={() => openExternal(`mailto:${SUPPORT_EMAIL}`)}
				>
					<View style={styles.rowLeft}>
						<Ionicons
							name="mail-outline"
							size={18}
							color={colors.ink.secondary}
						/>
						<Text style={styles.rowLabel}>문의하기</Text>
					</View>
					<Ionicons name="open-outline" size={16} color={colors.ink.muted} />
				</Pressable>
			</View>

			<Text style={styles.sectionTitle}>법적 고지</Text>
			<View style={styles.section}>
				<Pressable style={styles.row} onPress={() => openExternal(PRIVACY_URL)}>
					<View style={styles.rowLeft}>
						<Ionicons
							name="shield-checkmark-outline"
							size={18}
							color={colors.ink.secondary}
						/>
						<Text style={styles.rowLabel}>개인정보처리방침</Text>
					</View>
					<Ionicons name="open-outline" size={16} color={colors.ink.muted} />
				</Pressable>

				<View style={styles.divider} />

				<Pressable style={styles.row} onPress={() => openExternal(TERMS_URL)}>
					<View style={styles.rowLeft}>
						<Ionicons
							name="document-text-outline"
							size={18}
							color={colors.ink.secondary}
						/>
						<Text style={styles.rowLabel}>이용약관</Text>
					</View>
					<Ionicons name="open-outline" size={16} color={colors.ink.muted} />
				</Pressable>
			</View>

			<Text style={styles.versionText}>moodlit · v{APP_VERSION}</Text>

			<Modal
				visible={editVisible}
				transparent
				animationType="fade"
				onRequestClose={() => !editSaving && setEditVisible(false)}
			>
				<KeyboardAvoidingView
					style={styles.modalBackdrop}
					behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				>
					<Pressable
						style={StyleSheet.absoluteFill}
						onPress={() => !editSaving && setEditVisible(false)}
					/>
					<View style={styles.modalCard}>
						<Text style={styles.modalTitle}>이름 변경</Text>
						<Text style={styles.modalHint}>
							{'프로필에 표시될 이름이에요. 비워두면 "독자님"으로 보여요.'}
						</Text>
						<TextInput
							style={styles.modalInput}
							value={editDraft}
							onChangeText={setEditDraft}
							placeholder="이름"
							placeholderTextColor={colors.ink.placeholder}
							maxLength={DISPLAY_NAME_MAX}
							autoFocus
							returnKeyType="done"
							onSubmitEditing={handleSaveName}
							editable={!editSaving}
						/>
						<View style={styles.modalActions}>
							<Pressable
								style={[styles.modalButton, styles.modalCancel]}
								onPress={() => setEditVisible(false)}
								disabled={editSaving}
							>
								<Text style={styles.modalCancelText}>취소</Text>
							</Pressable>
							<Pressable
								style={[
									styles.modalButton,
									styles.modalSave,
									editSaving && styles.rowDisabled,
								]}
								onPress={handleSaveName}
								disabled={editSaving}
							>
								{editSaving ? (
									<ActivityIndicator color={colors.surface} />
								) : (
									<Text style={styles.modalSaveText}>저장</Text>
								)}
							</Pressable>
						</View>
					</View>
				</KeyboardAvoidingView>
			</Modal>
		</ScrollView>
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
	profileEmail: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.ink.secondary,
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
		marginTop: spacing.lg,
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
	versionText: {
		marginTop: spacing.xxl,
		textAlign: 'center',
		fontFamily: fonts.body,
		fontSize: 11,
		color: colors.ink.muted,
		letterSpacing: 1.5,
	},
	modalBackdrop: {
		flex: 1,
		backgroundColor: colors.overlay,
		justifyContent: 'center',
		paddingHorizontal: spacing.xxl,
	},
	modalCard: {
		backgroundColor: colors.surface,
		borderRadius: radius.lg,
		padding: spacing.xxl,
		gap: spacing.md,
		...shadow.card,
	},
	modalTitle: {
		fontFamily: fonts.display,
		fontSize: 20,
		color: colors.ink.primary,
		letterSpacing: 0.3,
	},
	modalHint: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.ink.secondary,
		lineHeight: 18,
		marginBottom: spacing.xs,
	},
	modalInput: {
		height: 48,
		borderWidth: 1,
		borderColor: colors.border.base,
		borderRadius: radius.md,
		paddingHorizontal: spacing.lg,
		fontSize: 15,
		fontFamily: fonts.body,
		color: colors.ink.primary,
		backgroundColor: colors.bg.subtle,
	},
	modalActions: {
		flexDirection: 'row',
		gap: spacing.md,
		marginTop: spacing.sm,
	},
	modalButton: {
		flex: 1,
		height: 48,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
	},
	modalCancel: {
		backgroundColor: colors.bg.subtle,
	},
	modalCancelText: {
		fontFamily: fonts.bodyMedium,
		fontSize: 14,
		color: colors.ink.secondary,
	},
	modalSave: {
		backgroundColor: colors.ink.primary,
	},
	modalSaveText: {
		fontFamily: fonts.bodyBold,
		fontSize: 14,
		color: colors.surface,
		letterSpacing: 0.5,
	},
});
