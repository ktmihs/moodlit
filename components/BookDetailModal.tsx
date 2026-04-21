import { Ionicons } from '@expo/vector-icons';
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
import { useBookDetail } from '../hooks/useBookDetail';
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
						size={32}
						color={n <= value ? '#f5a623' : '#ccc'}
					/>
				</Pressable>
			))}
		</View>
	);
}

const starStyles = StyleSheet.create({
	row: { flexDirection: 'row', gap: 8 },
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
					<TextInput
						style={styles.dateInput}
						value={startDate ?? ''}
						onChangeText={onStartChange}
						placeholder="YYYY-MM-DD"
						placeholderTextColor="#bbb"
						maxLength={10}
					/>
				</>
			)}

			{status === 'finished' && (
				<>
					<Text style={styles.sectionLabel}>완료일</Text>
					<TextInput
						style={styles.dateInput}
						value={endDate ?? ''}
						onChangeText={onEndChange}
						placeholder="YYYY-MM-DD"
						placeholderTextColor="#bbb"
						maxLength={10}
					/>
				</>
			)}

			<Pressable
				style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
				onPress={onSave}
				disabled={saving}
			>
				{saving ? (
					<ActivityIndicator color="#fff" size="small" />
				) : (
					<Text style={styles.saveBtnText}>저장</Text>
				)}
			</Pressable>

			{/* AI 책 요약 섹션 */}
			{summary && (
				<View style={styles.summarySection}>
					<Text style={styles.sectionLabel}>AI 책 요약</Text>
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
					placeholder="인상 깊은 문장을 입력하세요"
					placeholderTextColor="#bbb"
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
					<Text style={styles.emptyHint}>저장된 문장이 없어요</Text>
				) : (
					sentences.map((s, idx) => (
						<View key={idx} style={styles.sentenceItem}>
							<Text style={styles.sentenceText}>{s}</Text>
							<Pressable onPress={() => remove(idx)} hitSlop={8}>
								<Ionicons name="close-circle" size={18} color="#ccc" />
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
			</View>
		</View>
	);
}

const recStyles = StyleSheet.create({
	card: {
		flexDirection: 'row',
		gap: 12,
		paddingVertical: 10,
		borderBottomWidth: 1,
		borderBottomColor: '#f5f5f5',
	},
	thumb: {
		width: 44,
		height: 62,
		borderRadius: 4,
		overflow: 'hidden',
		backgroundColor: '#f0f0f0',
	},
	thumbImg: { width: '100%', height: '100%' },
	thumbPlaceholder: { backgroundColor: '#e8e0d5' },
	info: { flex: 1, justifyContent: 'center' },
	title: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', lineHeight: 20 },
	author: { fontSize: 12, color: '#888', marginTop: 2 },
});

// ── 탭 3: 리뷰 ──
function ReviewTab({
	content,
	rating,
	memo,
	aiStatus,
	saving,
	recommendations,
	fetchingRecs,
	hasMoreRecs,
	hasContent,
	onContentChange,
	onRatingChange,
	onMemoChange,
	onSave,
	onFetchRecommendations,
	onLoadMore,
}: {
	content: string;
	rating: number;
	memo: string;
	aiStatus: AiStatus;
	saving: boolean;
	recommendations: RecommendedBook[];
	fetchingRecs: boolean;
	hasMoreRecs: boolean;
	hasContent: boolean;
	onContentChange: (c: string) => void;
	onRatingChange: (r: number) => void;
	onMemoChange: (m: string) => void;
	onSave: () => void;
	onFetchRecommendations: () => void;
	onLoadMore: () => void;
}) {
	return (
		<ScrollView contentContainerStyle={styles.tabContent}>
			<Text style={styles.sectionLabel}>별점</Text>
			<StarRating value={rating} onChange={onRatingChange} />

			<Text style={[styles.sectionLabel, { marginTop: 24 }]}>한줄 감상</Text>
			<TextInput
				style={styles.contentInput}
				value={content}
				onChangeText={onContentChange}
				placeholder="책에 대한 감상을 한 문장으로 (AI 추천에 활용됩니다)"
				placeholderTextColor="#bbb"
				multiline
				textAlignVertical="top"
			/>

			<Text style={[styles.sectionLabel, { marginTop: 16 }]}>메모</Text>
			<TextInput
				style={styles.memoInput}
				value={memo}
				onChangeText={onMemoChange}
				placeholder="책에 대한 생각을 자유롭게 적어보세요"
				placeholderTextColor="#bbb"
				multiline
				textAlignVertical="top"
			/>

			<Pressable
				style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
				onPress={onSave}
				disabled={saving}
			>
				{saving ? (
					<ActivityIndicator color="#fff" size="small" />
				) : (
					<Text style={styles.saveBtnText}>저장</Text>
				)}
			</Pressable>

			{/* AI 추천 섹션 */}
			{hasContent && (
				<View style={styles.recSection}>
					<View style={styles.recHeader}>
						<Text style={styles.recTitle}>AI 추천 책</Text>
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
								<ActivityIndicator size="small" color="#1a1a1a" />
							) : (
								<Text style={styles.recBtnText}>추천 책 불러오기</Text>
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
							{hasMoreRecs && (
								<Pressable
									style={styles.recBtn}
									onPress={onLoadMore}
									disabled={fetchingRecs}
								>
									{fetchingRecs ? (
										<ActivityIndicator size="small" color="#1a1a1a" />
									) : (
										<Text style={styles.recBtnText}>더보기</Text>
									)}
								</Pressable>
							)}
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
		hasMoreRecs,
		updateStatus,
		saveDates,
		saveReview,
		fetchRecommendations,
		loadMoreRecommendations,
	} = useBookDetail(userBook);

	// review 로드 시 로컬 상태 초기화
	useEffect(() => {
		setSentences(review?.sentences ?? []);
		setRating(review?.rating ?? 0);
		setMemo(review?.memo ?? '');
		setContent(review?.content ?? '');
	}, [review]);

	// localBook 변경 시 날짜 동기화
	useEffect(() => {
		setStartDate(localBook?.start_date ?? null);
		setEndDate(localBook?.end_date ?? null);
	}, [localBook]);

	// 모달 열릴 때 탭 리셋
	useEffect(() => {
		if (visible) setActiveTab(0);
	}, [visible]);

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
					{/* 핸들 */}
					<View style={styles.handle} />

					{/* 책 헤더 */}
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
								<Text style={styles.bookGenre}>{userBook.books.genre}</Text>
							)}
						</View>
						<Pressable onPress={onClose} hitSlop={12} style={styles.closeBtn}>
							<Ionicons name="close" size={22} color="#666" />
						</Pressable>
					</View>

					{/* 탭 바 */}
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

					{/* 탭 콘텐츠 */}
					{loading ? (
						<ActivityIndicator style={styles.loader} size="large" />
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
									hasMoreRecs={hasMoreRecs}
									hasContent={!!review?.content}
									onContentChange={setContent}
									onRatingChange={setRating}
									onMemoChange={setMemo}
									onSave={handleSave}
									onFetchRecommendations={fetchRecommendations}
									onLoadMore={loadMoreRecommendations}
								/>
							)}
						</>
					)}
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const SHEET_HEIGHT = '85%';

const styles = StyleSheet.create({
	overlay: { flex: 1, justifyContent: 'flex-end' },
	backdrop: {
		...StyleSheet.absoluteFillObject,
		backgroundColor: 'rgba(0,0,0,0.4)',
	},
	sheet: {
		height: SHEET_HEIGHT,
		backgroundColor: '#fff',
		borderTopLeftRadius: 20,
		borderTopRightRadius: 20,
		overflow: 'hidden',
	},
	handle: {
		width: 36,
		height: 4,
		borderRadius: 2,
		backgroundColor: '#ddd',
		alignSelf: 'center',
		marginTop: 10,
		marginBottom: 4,
	},

	// 책 헤더
	bookHeader: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		paddingHorizontal: 20,
		paddingVertical: 14,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
		gap: 12,
	},
	bookThumb: {
		width: 50,
		height: 72,
		borderRadius: 4,
		overflow: 'hidden',
		backgroundColor: '#f0f0f0',
	},
	bookThumbImg: { width: '100%', height: '100%' },
	bookThumbPlaceholder: { backgroundColor: '#e8e0d5' },
	bookInfo: { flex: 1 },
	bookTitle: {
		fontSize: 15,
		fontWeight: '600',
		color: '#1a1a1a',
		lineHeight: 22,
	},
	bookGenre: { fontSize: 12, color: '#999', marginTop: 4 },
	closeBtn: { padding: 2 },

	// 탭 바
	tabBar: {
		flexDirection: 'row',
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	tabItem: {
		flex: 1,
		alignItems: 'center',
		paddingVertical: 12,
	},
	tabLabel: { fontSize: 14, color: '#999', fontWeight: '500' },
	tabLabelActive: { color: '#1a1a1a', fontWeight: '700' },
	tabIndicator: {
		position: 'absolute',
		bottom: 0,
		height: 2,
		width: '60%',
		backgroundColor: '#1a1a1a',
		borderRadius: 1,
	},

	// 탭 공통
	tabContent: { padding: 20, paddingBottom: 40 },
	sectionLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: '#555',
		marginBottom: 10,
	},
	loader: { marginTop: 40 },

	// 상태 탭
	statusRow: { flexDirection: 'row', gap: 8, marginBottom: 20 },
	statusBtn: {
		flex: 1,
		paddingVertical: 10,
		borderRadius: 8,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		alignItems: 'center',
	},
	statusBtnActive: { backgroundColor: '#1a1a1a', borderColor: '#1a1a1a' },
	statusBtnText: { fontSize: 13, color: '#555', fontWeight: '500' },
	statusBtnTextActive: { color: '#fff' },
	dateInput: {
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 10,
		fontSize: 15,
		color: '#1a1a1a',
		marginBottom: 20,
	},

	// 문장 탭
	sentenceInputRow: {
		flexDirection: 'row',
		gap: 8,
		paddingHorizontal: 20,
		paddingTop: 16,
	},
	sentenceInput: {
		flex: 1,
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 10,
		fontSize: 14,
		color: '#1a1a1a',
		maxHeight: 80,
	},
	addBtn: {
		backgroundColor: '#1a1a1a',
		borderRadius: 8,
		paddingHorizontal: 14,
		justifyContent: 'center',
	},
	addBtnDisabled: { backgroundColor: '#ccc' },
	addBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
	sentenceList: { paddingHorizontal: 20, marginTop: 12 },
	sentenceItem: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 8,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f5f5f5',
	},
	sentenceText: { flex: 1, fontSize: 14, color: '#333', lineHeight: 20 },
	emptyHint: {
		textAlign: 'center',
		color: '#bbb',
		fontSize: 14,
		marginTop: 40,
	},

	// 리뷰 탭
	contentInput: {
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 14,
		color: '#1a1a1a',
		height: 80,
		marginBottom: 4,
	},
	memoInput: {
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 14,
		color: '#1a1a1a',
		height: 100,
		marginBottom: 24,
	},
	saveBtn: {
		backgroundColor: '#1a1a1a',
		borderRadius: 10,
		paddingVertical: 14,
		alignItems: 'center',
	},
	saveBtnDisabled: { backgroundColor: '#ccc' },
	saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },

	// AI 추천 섹션
	recSection: {
		marginTop: 28,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
		paddingTop: 20,
	},
	recHeader: { marginBottom: 12 },
	recTitle: {
		fontSize: 15,
		fontWeight: '700',
		color: '#1a1a1a',
		marginBottom: 8,
	},
	recBtn: {
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		paddingVertical: 12,
		alignItems: 'center',
		marginTop: 8,
	},
	recBtnDisabled: { borderColor: '#e0e0e0', opacity: 0.4 },
	recBtnText: { fontSize: 14, color: '#555', fontWeight: '500' },
	recRefreshBtn: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
		marginTop: 12,
		alignSelf: 'center',
	},
	recRefreshText: { fontSize: 12, color: '#888' },
	recHint: { fontSize: 13, color: '#aaa', marginTop: 8, lineHeight: 20 },

	// AI 요약 섹션
	summarySection: {
		marginTop: 28,
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
		paddingTop: 20,
	},
	summaryLoading: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		marginTop: 8,
	},
	summaryLoadingText: { fontSize: 13, color: '#888' },
	summaryText: {
		fontSize: 14,
		color: '#333',
		lineHeight: 22,
		marginTop: 8,
		backgroundColor: '#f8f8f8',
		borderRadius: 8,
		padding: 14,
	},
});
