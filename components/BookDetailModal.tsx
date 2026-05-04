import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	KeyboardAvoidingView,
	Modal,
	Platform,
	Pressable,
	ScrollView,
	StyleSheet,
	Text,
	TextInput,
	View,
} from 'react-native';
import Toast from 'react-native-toast-message';
import { useBookDetail } from '../hooks/useBookDetail';
import { colors, fonts, radius, shadow, spacing } from '../lib/theme';
import type {
	AiStatus,
	ReadingStatus,
	RecommendedBook,
	UserBook,
} from '../types/book';

interface Props {
	userBook: UserBook | null;
	visible: boolean;
	onClose: () => void;
}

const STATUS_OPTIONS: { key: ReadingStatus; label: string }[] = [
	{ key: 'want', label: '읽고 싶어요' },
	{ key: 'reading', label: '읽는 중' },
	{ key: 'finished', label: '읽었어요' },
];

const TABS = ['상태', '문장', '리뷰'];

// ── 별점 ──
function StarRating({
	value,
	onChange,
}: {
	value: number;
	onChange: (v: number) => void;
}) {
	return (
		<View style={starStyles.row}>
			{[1, 2, 3, 4, 5].map(n => (
				<Pressable key={n} onPress={() => onChange(n)} hitSlop={8}>
					<Ionicons
						name={n <= value ? 'star' : 'star-outline'}
						size={30}
						color={n <= value ? colors.accent.base : colors.border.strong}
					/>
				</Pressable>
			))}
		</View>
	);
}

const starStyles = StyleSheet.create({
	row: { flexDirection: 'row', gap: 8 },
});

// ── 날짜 선택 필드 ──
function DateField({
	value,
	onChange,
}: {
	value: string | null;
	onChange: (d: string) => void;
}) {
	const [showPicker, setShowPicker] = useState(false);
	const [draft, setDraft] = useState(value ?? '');

	useEffect(() => {
		setDraft(value ?? '');
	}, [value]);

	const pickerDate = (() => {
		const d = new Date(value ?? '');
		return isNaN(d.getTime()) ? new Date() : d;
	})();

	const handlePickerChange = (_: unknown, selected?: Date) => {
		if (Platform.OS === 'android') setShowPicker(false);
		if (selected) {
			const str = selected.toISOString().split('T')[0];
			setDraft(str);
			onChange(str);
		}
	};

	const handleTextBlur = () => {
		if (/^\d{4}-\d{2}-\d{2}$/.test(draft)) {
			const d = new Date(draft);
			if (!isNaN(d.getTime())) {
				onChange(draft);
				return;
			}
		}
		setDraft(value ?? '');
	};

	return (
		<View style={pickerStyles.wrap}>
			<View style={pickerStyles.row}>
				<TextInput
					style={pickerStyles.textInput}
					value={draft}
					onChangeText={setDraft}
					onBlur={handleTextBlur}
					placeholder={'YYYY-MM-DD'}
					placeholderTextColor={colors.ink.placeholder}
					keyboardType={'numbers-and-punctuation'}
					maxLength={10}
					returnKeyType={'done'}
				/>
				<Pressable
					style={pickerStyles.calBtn}
					onPress={() => setShowPicker(v => !v)}
				>
					<Ionicons
						name={showPicker ? 'calendar' : 'calendar-outline'}
						size={18}
						color={showPicker ? colors.accent.deep : colors.ink.secondary}
					/>
				</Pressable>
			</View>

			{showPicker && Platform.OS === 'ios' && (
				<DateTimePicker
					value={pickerDate}
					mode={'date'}
					display={'inline'}
					onChange={handlePickerChange}
					locale={'ko-KR'}
					accentColor={colors.accent.base}
					style={pickerStyles.inlinePicker}
				/>
			)}
			{showPicker && Platform.OS === 'android' && (
				<DateTimePicker
					value={pickerDate}
					mode={'date'}
					display={'default'}
					onChange={handlePickerChange}
				/>
			)}
		</View>
	);
}

const pickerStyles = StyleSheet.create({
	wrap: { marginBottom: spacing.xl },
	row: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
	},
	textInput: {
		flex: 1,
		height: 44,
		borderWidth: 1,
		borderColor: colors.border.base,
		borderRadius: radius.md,
		paddingHorizontal: spacing.lg,
		fontFamily: fonts.body,
		fontSize: 14,
		color: colors.ink.primary,
		backgroundColor: colors.surface,
	},
	calBtn: {
		width: 44,
		height: 44,
		borderWidth: 1,
		borderColor: colors.border.base,
		borderRadius: radius.md,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.surface,
	},
	inlinePicker: { marginTop: spacing.sm },
});

// ── 탭 1: 상태 ──
function StatusTab({
	status,
	startDate,
	endDate,
	saving,
	summary,
	onStatusChange,
	onStartChange,
	onEndChange,
	onSave,
}: {
	status: ReadingStatus;
	startDate: string | null;
	endDate: string | null;
	saving: boolean;
	summary: string | null;
	onStatusChange: (s: ReadingStatus) => void;
	onStartChange: (d: string) => void;
	onEndChange: (d: string) => void;
	onSave: () => void;
}) {
	return (
		<ScrollView contentContainerStyle={styles.tabContent}>
			<Text style={styles.sectionLabel}>독서 상태</Text>
			<View style={styles.statusRow}>
				{STATUS_OPTIONS.map(({ key, label }) => (
					<Pressable
						key={key}
						style={[styles.statusBtn, status === key && styles.statusBtnActive]}
						onPress={() => onStatusChange(key)}
					>
						<Text
							style={[
								styles.statusBtnText,
								status === key && styles.statusBtnTextActive,
							]}
						>
							{label}
						</Text>
					</Pressable>
				))}
			</View>

			{(status === 'reading' || status === 'finished') && (
				<>
					<Text style={styles.sectionLabel}>시작일</Text>
					<DateField value={startDate} onChange={onStartChange} />
				</>
			)}

			{status === 'finished' && (
				<>
					<Text style={styles.sectionLabel}>완료일</Text>
					<DateField value={endDate} onChange={onEndChange} />
				</>
			)}

			<Pressable
				style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
				onPress={onSave}
				disabled={saving}
			>
				{saving ? (
					<ActivityIndicator color={colors.surface} size="small" />
				) : (
					<Text style={styles.saveBtnText}>저장</Text>
				)}
			</Pressable>

			{summary && (
				<View style={styles.summarySection}>
					<View style={styles.summaryHeader}>
						<View style={styles.summaryDot} />
						<Text style={styles.sectionLabel}>책 한눈에</Text>
					</View>
					<Text style={styles.summaryText}>{summary}</Text>
				</View>
			)}
		</ScrollView>
	);
}

// ── 탭 2: 문장 ──
function SentencesTab({
	sentences,
	onChange,
}: {
	sentences: string[];
	onChange: (s: string[]) => void;
}) {
	const [input, setInput] = useState('');

	const add = () => {
		const trimmed = input.trim();
		if (!trimmed) return;
		onChange([...sentences, trimmed]);
		setInput('');
	};

	const remove = (idx: number) => {
		onChange(sentences.filter((_, i) => i !== idx));
	};

	return (
		<View style={styles.tabContent}>
			<View style={styles.sentenceInputRow}>
				<TextInput
					style={styles.sentenceInput}
					value={input}
					onChangeText={setInput}
					placeholder="마음에 남은 문장을 적어보세요"
					placeholderTextColor={colors.ink.placeholder}
					multiline
					returnKeyType="done"
					blurOnSubmit
				/>
				<Pressable
					style={[styles.addBtn, !input.trim() && styles.addBtnDisabled]}
					onPress={add}
					disabled={!input.trim()}
				>
					<Text style={styles.addBtnText}>추가</Text>
				</Pressable>
			</View>

			<ScrollView
				style={styles.sentenceList}
				showsVerticalScrollIndicator={false}
			>
				{sentences.length === 0 ? (
					<Text style={styles.emptyHint}>
						문장을 모아두면{'\n'}나만의 책이 완성돼요
					</Text>
				) : (
					sentences.map((s, idx) => (
						<View key={idx} style={styles.sentenceItem}>
							<View style={styles.sentenceQuoteBar} />
							<Text style={styles.sentenceText}>{s}</Text>
							<Pressable onPress={() => remove(idx)} hitSlop={8}>
								<Ionicons
									name="close-circle"
									size={18}
									color={colors.ink.muted}
								/>
							</Pressable>
						</View>
					))
				)}
			</ScrollView>
		</View>
	);
}

// ── 추천 책 카드 ──
function RecommendationCard({ item }: { item: RecommendedBook }) {
	return (
		<View style={recStyles.card}>
			<View style={recStyles.thumb}>
				{item.cover_image_url ? (
					<Image
						source={{ uri: item.cover_image_url }}
						style={recStyles.thumbImg}
						contentFit="cover"
					/>
				) : (
					<View style={[recStyles.thumbImg, recStyles.thumbPlaceholder]} />
				)}
			</View>
			<View style={recStyles.info}>
				<Text style={recStyles.title} numberOfLines={2}>
					{item.title}
				</Text>
				{item.author && (
					<Text style={recStyles.author} numberOfLines={1}>
						{item.author}
					</Text>
				)}
				{item.reason && (
					<Text style={recStyles.reason} numberOfLines={1}>
						{item.reason}
					</Text>
				)}
			</View>
		</View>
	);
}

const recStyles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		gap: spacing.md,
		paddingVertical: spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: colors.border.base,
	},
	thumb: {
		width: 46,
		height: 64,
		borderRadius: radius.sm,
		overflow: 'hidden',
		backgroundColor: colors.bg.subtle,
	},
	thumbImg: { width: '100%', height: '100%' },
	thumbPlaceholder: { backgroundColor: colors.accent.soft },
	info: { flex: 1, justifyContent: 'center' },
	title: {
		fontFamily: fonts.bodyMedium,
		fontSize: 14,
		color: colors.ink.primary,
		lineHeight: 20,
	},
	author: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.ink.secondary,
		marginTop: 2,
	},
	reason: {
		fontFamily: fonts.body,
		fontSize: 11,
		color: colors.accent.deep,
		marginTop: 4,
		fontStyle: 'italic',
	},
});

// ── 탭 3: 리뷰 ──
function ReviewTab({
	content,
	rating,
	memo,
	saving,
	recommendations,
	fetchingRecs,
	hasContent,
	aiStatus,
	onContentChange,
	onRatingChange,
	onMemoChange,
	onSave,
	onFetchRecommendations,
}: {
	content: string;
	rating: number;
	memo: string;
	aiStatus: AiStatus;
	saving: boolean;
	recommendations: RecommendedBook[];
	fetchingRecs: boolean;
	hasContent: boolean;
	onContentChange: (c: string) => void;
	onRatingChange: (r: number) => void;
	onMemoChange: (m: string) => void;
	onSave: () => void;
	onFetchRecommendations: () => void;
}) {
	return (
		<ScrollView contentContainerStyle={styles.tabContent}>
			<Text style={styles.sectionLabel}>별점</Text>
			<StarRating value={rating} onChange={onRatingChange} />

			<Text style={[styles.sectionLabel, { marginTop: spacing.xxl }]}>
				한줄 감상
			</Text>
			<TextInput
				style={styles.contentInput}
				value={content}
				onChangeText={onContentChange}
				placeholder="이 책이 남긴 한 문장 (AI 추천에 활용돼요)"
				placeholderTextColor={colors.ink.placeholder}
				multiline
				textAlignVertical="top"
			/>

			<Text style={[styles.sectionLabel, { marginTop: spacing.lg }]}>메모</Text>
			<TextInput
				style={styles.memoInput}
				value={memo}
				onChangeText={onMemoChange}
				placeholder="떠오른 생각을 자유롭게 적어보세요"
				placeholderTextColor={colors.ink.placeholder}
				multiline
				textAlignVertical="top"
			/>

			<Pressable
				style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
				onPress={onSave}
				disabled={saving}
			>
				{saving ? (
					<ActivityIndicator color={colors.surface} size="small" />
				) : (
					<Text style={styles.saveBtnText}>저장</Text>
				)}
			</Pressable>

			{hasContent && (
				<View style={styles.recSection}>
					<View style={styles.summaryHeader}>
						<View style={styles.summaryDot} />
						<Text style={styles.recTitle}>당신을 위한 다음 책</Text>
					</View>

					{recommendations.length === 0 ? (
						<Pressable
							style={[
								styles.recBtn,
								(fetchingRecs ||
									aiStatus === 'pending' ||
									aiStatus === 'processing') &&
									styles.recBtnDisabled,
							]}
							onPress={onFetchRecommendations}
							disabled={
								fetchingRecs ||
								aiStatus === 'pending' ||
								aiStatus === 'processing'
							}
						>
							{fetchingRecs ? (
								<ActivityIndicator size="small" color={colors.ink.secondary} />
							) : (
								<Text style={styles.recBtnText}>다음 책 추천 받기</Text>
							)}
						</Pressable>
					) : (
						<>
							{recommendations.map((item, i) => (
								<RecommendationCard
									key={`${item.isbn ?? ''}-${i}`}
									item={item}
								/>
							))}
						</>
					)}
				</View>
			)}
		</ScrollView>
	);
}

// ── 메인 모달 ──
export function BookDetailModal({ userBook, visible, onClose }: Props) {
	const [activeTab, setActiveTab] = useState(0);
	const [sentences, setSentences] = useState<string[]>([]);
	const [rating, setRating] = useState(0);
	const [memo, setMemo] = useState('');
	const [content, setContent] = useState('');
	const [startDate, setStartDate] = useState<string | null>(null);
	const [endDate, setEndDate] = useState<string | null>(null);

	const {
		review,
		loading,
		saving,
		status,
		localBook,
		recommendations,
		fetchingRecs,
		updateStatus,
		saveDates,
		saveReview,
		fetchRecommendations,
	} = useBookDetail(userBook);

	useEffect(() => {
		setSentences(review?.sentences ?? []);
		setRating(review?.rating ?? 0);
		setMemo(review?.memo ?? '');
		setContent(review?.content ?? '');
	}, [review]);

	useEffect(() => {
		setStartDate(localBook?.start_date ?? null);
		setEndDate(localBook?.end_date ?? null);
	}, [localBook]);

	useEffect(() => {
		if (visible) setActiveTab(0);
	}, [visible]);

	useEffect(() => {
		if (
			activeTab === 2 &&
			review?.content &&
			recommendations.length === 0 &&
			!fetchingRecs
		) {
			fetchRecommendations();
		}
	}, [activeTab, review?.id]); // eslint-disable-line react-hooks/exhaustive-deps

	const handleStatusChange = async (s: ReadingStatus) => {
		await updateStatus(s);
	};

	const handleSave = () => saveReview(rating || null, memo, sentences, content);

	if (!userBook) return null;

	return (
		<Modal
			visible={visible}
			animationType="slide"
			transparent
			onRequestClose={onClose}
		>
			<KeyboardAvoidingView
				behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
				style={styles.overlay}
			>
				<Pressable style={styles.backdrop} onPress={onClose} />

				<View style={styles.sheet}>
					<View style={styles.handle} />

					<View style={styles.bookHeader}>
						<View style={styles.bookThumb}>
							{userBook.books.cover_image_url ? (
								<Image
									source={{ uri: userBook.books.cover_image_url }}
									style={styles.bookThumbImg}
									contentFit="cover"
								/>
							) : (
								<View
									style={[styles.bookThumbImg, styles.bookThumbPlaceholder]}
								/>
							)}
						</View>
						<View style={styles.bookInfo}>
							<Text style={styles.bookTitle} numberOfLines={3}>
								{userBook.books.title}
							</Text>
							{userBook.books.genre && (
								<View style={styles.genreChip}>
									<Text style={styles.bookGenre}>{userBook.books.genre}</Text>
								</View>
							)}
						</View>
						<Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
							<Ionicons name="close" size={22} color={colors.ink.secondary} />
						</Pressable>
					</View>

					<View style={styles.tabBar}>
						{TABS.map((label, i) => (
							<Pressable
								key={i}
								style={styles.tabItem}
								onPress={() => setActiveTab(i)}
							>
								<Text
									style={[
										styles.tabLabel,
										activeTab === i && styles.tabLabelActive,
									]}
								>
									{label}
								</Text>
								{activeTab === i && <View style={styles.tabIndicator} />}
							</Pressable>
						))}
					</View>

					{loading ? (
						<ActivityIndicator
							style={styles.loader}
							size="large"
							color={colors.ink.primary}
						/>
					) : (
						<>
							{activeTab === 0 && (
								<StatusTab
									status={status}
									startDate={startDate}
									endDate={endDate}
									saving={saving}
									summary={localBook?.books.summary ?? null}
									onStatusChange={handleStatusChange}
									onStartChange={setStartDate}
									onEndChange={setEndDate}
									onSave={() => saveDates(startDate, endDate)}
								/>
							)}
							{activeTab === 1 && (
								<SentencesTab sentences={sentences} onChange={setSentences} />
							)}
							{activeTab === 2 && (
								<ReviewTab
									content={content}
									rating={rating}
									memo={memo}
									aiStatus={review?.ai_status ?? null}
									saving={saving}
									recommendations={recommendations}
									fetchingRecs={fetchingRecs}
									hasContent={!!review?.content}
									onContentChange={setContent}
									onRatingChange={setRating}
									onMemoChange={setMemo}
									onSave={handleSave}
									onFetchRecommendations={fetchRecommendations}
								/>
							)}
						</>
					)}
				</View>
			</KeyboardAvoidingView>
			<Toast />
		</Modal>
	);
}

const SHEET_HEIGHT = '88%';

const styles = StyleSheet.create({
	overlay: { flex: 1, justifyContent: 'flex-end' },
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: colors.overlay,
	},
	sheet: {
		height: SHEET_HEIGHT,
		backgroundColor: colors.bg.canvas,
		borderTopLeftRadius: radius.xl + 4,
		borderTopRightRadius: radius.xl + 4,
		overflow: 'hidden',
	},
	handle: {
		width: 40,
		height: 4,
		borderRadius: 2,
		backgroundColor: colors.border.strong,
		alignSelf: 'center',
		marginTop: spacing.md,
		marginBottom: spacing.sm,
	},

	// 책 헤더
	bookHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingHorizontal: spacing.xxl,
		paddingVertical: spacing.lg,
		borderBottomWidth: 1,
		borderBottomColor: colors.border.base,
		gap: spacing.lg,
	},
	bookThumb: {
		width: 56,
		height: 80,
		borderRadius: radius.sm,
		overflow: 'hidden',
		backgroundColor: colors.bg.subtle,
		...shadow.card,
	},
	bookThumbImg: { width: '100%', height: '100%' },
	bookThumbPlaceholder: { backgroundColor: colors.accent.soft },
	bookInfo: { flex: 1 },
	bookTitle: {
		fontFamily: fonts.display,
		fontSize: 17,
		color: colors.ink.primary,
		lineHeight: 24,
		letterSpacing: 0.2,
	},
	genreChip: {
		alignSelf: 'flex-start',
		paddingHorizontal: spacing.md,
		paddingVertical: 3,
		borderRadius: radius.pill,
		backgroundColor: colors.accent.soft,
		marginTop: spacing.sm,
	},
	bookGenre: {
		fontFamily: fonts.body,
		fontSize: 11,
		color: colors.accent.deep,
		letterSpacing: 0.3,
	},
	closeBtn: { padding: 2 },

	// 탭 바
	tabBar: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: colors.border.base,
		backgroundColor: colors.bg.canvas,
	},
	tabItem: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: spacing.md + 2,
	},
	tabLabel: {
		fontFamily: fonts.bodyMedium,
		fontSize: 13,
		color: colors.ink.muted,
		letterSpacing: 0.3,
	},
	tabLabelActive: {
		fontFamily: fonts.bodyBold,
		color: colors.ink.primary,
	},
	tabIndicator: {
		position: 'absolute',
		bottom: 0,
		height: 2,
		width: '50%',
		backgroundColor: colors.accent.base,
		borderRadius: 1,
	},

	// 탭 공통
	tabContent: {
		padding: spacing.xxl,
		paddingBottom: spacing.xxxl + 12,
	},
	sectionLabel: {
		fontFamily: fonts.bodyMedium,
		fontSize: 12,
		color: colors.ink.secondary,
		letterSpacing: 0.5,
		textTransform: 'uppercase',
		marginBottom: spacing.md,
	},
	loader: { marginTop: spacing.xxxl },

	// 상태 탭
	statusRow: {
		flexDirection: 'row',
		gap: spacing.sm,
		marginBottom: spacing.xl,
	},
	statusBtn: {
		flex: 1,
		paddingVertical: spacing.md,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border.base,
		backgroundColor: colors.surface,
		alignItems: 'center',
	},
	statusBtnActive: {
		backgroundColor: colors.ink.primary,
		borderColor: colors.ink.primary,
	},
	statusBtnText: {
		fontFamily: fonts.bodyMedium,
		fontSize: 13,
		color: colors.ink.secondary,
	},
	statusBtnTextActive: {
		fontFamily: fonts.bodyBold,
		color: colors.surface,
	},

	// 문장 탭
	sentenceInputRow: {
		flexDirection: 'row',
		gap: spacing.sm,
		paddingHorizontal: spacing.xxl,
		paddingTop: spacing.lg,
	},
	sentenceInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: colors.border.base,
		borderRadius: radius.md,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		fontSize: 14,
		fontFamily: fonts.body,
		color: colors.ink.primary,
		maxHeight: 100,
		backgroundColor: colors.surface,
	},
	addBtn: {
		backgroundColor: colors.ink.primary,
		borderRadius: radius.md,
		paddingHorizontal: spacing.lg,
		justifyContent: 'center',
	},
	addBtnDisabled: { backgroundColor: colors.border.strong },
	addBtnText: {
		fontFamily: fonts.bodyBold,
		color: colors.surface,
		fontSize: 13,
		letterSpacing: 0.3,
	},
	sentenceList: {
		paddingHorizontal: spacing.xxl,
		marginTop: spacing.md,
	},
	sentenceItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: spacing.md,
		paddingVertical: spacing.md,
		paddingHorizontal: spacing.lg,
		marginBottom: spacing.sm,
		backgroundColor: colors.surface,
		borderRadius: radius.md,
		borderWidth: 1,
		borderColor: colors.border.base,
	},
	sentenceQuoteBar: {
		width: 3,
		alignSelf: 'stretch',
		borderRadius: 2,
		backgroundColor: colors.accent.base,
	},
	sentenceText: {
		flex: 1,
		fontFamily: fonts.body,
		fontSize: 14,
		color: colors.ink.primary,
		lineHeight: 22,
	},
	emptyHint: {
		textAlign: 'center',
		fontFamily: fonts.display,
		color: colors.ink.muted,
		fontSize: 15,
		lineHeight: 24,
		marginTop: spacing.xxxl,
	},

	// 리뷰 탭
	contentInput: {
		borderWidth: 1,
		borderColor: colors.border.base,
		borderRadius: radius.md,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		fontSize: 14,
		fontFamily: fonts.body,
		color: colors.ink.primary,
		height: 80,
		marginBottom: 4,
		backgroundColor: colors.surface,
	},
	memoInput: {
		borderWidth: 1,
		borderColor: colors.border.base,
		borderRadius: radius.md,
		paddingHorizontal: spacing.lg,
		paddingVertical: spacing.md,
		fontSize: 14,
		fontFamily: fonts.body,
		color: colors.ink.primary,
		height: 110,
		marginBottom: spacing.xxl,
		backgroundColor: colors.surface,
	},
	saveBtn: {
		backgroundColor: colors.ink.primary,
		borderRadius: radius.lg,
		paddingVertical: spacing.md + 2,
		alignItems: 'center',
	},
	saveBtnDisabled: { backgroundColor: colors.border.strong },
	saveBtnText: {
		fontFamily: fonts.bodyBold,
		color: colors.surface,
		fontSize: 15,
		letterSpacing: 0.5,
	},

	// AI 추천 섹션
	recSection: {
		marginTop: spacing.xxl + spacing.xs,
		borderTopWidth: 1,
		borderTopColor: colors.border.base,
		paddingTop: spacing.xl,
	},
	recTitle: {
		fontFamily: fonts.display,
		fontSize: 17,
		color: colors.ink.primary,
		letterSpacing: 0.3,
	},
	recBtn: {
		borderWidth: 1,
		borderColor: colors.accent.base,
		borderRadius: radius.lg,
		paddingVertical: spacing.md + 2,
		alignItems: 'center',
		marginTop: spacing.md,
		backgroundColor: colors.surface,
	},
	recBtnDisabled: { opacity: 0.4 },
	recBtnText: {
		fontFamily: fonts.bodyMedium,
		fontSize: 13,
		color: colors.accent.deep,
		letterSpacing: 0.5,
	},

	// 책 요약 섹션
	summarySection: {
		marginTop: spacing.xxl + spacing.xs,
		borderTopWidth: 1,
		borderTopColor: colors.border.base,
		paddingTop: spacing.xl,
	},
	summaryHeader: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: spacing.sm,
		marginBottom: spacing.md,
	},
	summaryDot: {
		width: 6,
		height: 6,
		borderRadius: 3,
		backgroundColor: colors.accent.base,
	},
	summaryText: {
		fontFamily: fonts.body,
		fontSize: 14,
		color: colors.ink.primary,
		lineHeight: 24,
		backgroundColor: colors.surface,
		borderRadius: radius.md,
		padding: spacing.lg,
		borderWidth: 1,
		borderColor: colors.border.base,
	},
});
