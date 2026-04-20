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
import type { ReadingStatus, UserBook } from '../types/book';

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
	onStatusChange,
	onStartChange,
	onEndChange,
}: {
	status: ReadingStatus;
	startDate: string | null;
	endDate: string | null;
	onStatusChange: (s: ReadingStatus) => void;
	onStartChange: (d: string) => void;
	onEndChange: (d: string) => void;
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

// ── 탭 3: 리뷰 ──
function ReviewTab({
	rating,
	memo,
	saving,
	onRatingChange,
	onMemoChange,
	onSave,
}: {
	rating: number;
	memo: string;
	saving: boolean;
	onRatingChange: (r: number) => void;
	onMemoChange: (m: string) => void;
	onSave: () => void;
}) {
	return (
		<ScrollView contentContainerStyle={styles.tabContent}>
			<Text style={styles.sectionLabel}>별점</Text>
			<StarRating value={rating} onChange={onRatingChange} />

			<Text style={[styles.sectionLabel, { marginTop: 24 }]}>메모</Text>
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
		</ScrollView>
	);
}

// ── 메인 모달 ──
export function BookDetailModal({ userBook, visible, onClose }: Props) {
	const [activeTab, setActiveTab] = useState(0);
	const [sentences, setSentences] = useState<string[]>([]);
	const [rating, setRating] = useState(0);
	const [memo, setMemo] = useState('');
	const [startDate, setStartDate] = useState<string | null>(null);
	const [endDate, setEndDate] = useState<string | null>(null);

	const {
		review,
		loading,
		saving,
		status,
		localBook,
		updateStatus,
		saveReview,
	} = useBookDetail(userBook);

	// review 로드 시 로컬 상태 초기화
	useEffect(() => {
		setSentences(review?.sentences ?? []);
		setRating(review?.rating ?? 0);
		setMemo(review?.memo ?? '');
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

	const handleSave = () => saveReview(rating || null, memo, sentences);

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
									onStatusChange={handleStatusChange}
									onStartChange={setStartDate}
									onEndChange={setEndDate}
								/>
							)}
							{activeTab === 1 && (
								<SentencesTab sentences={sentences} onChange={setSentences} />
							)}
							{activeTab === 2 && (
								<ReviewTab
									rating={rating}
									memo={memo}
									saving={saving}
									onRatingChange={setRating}
									onMemoChange={setMemo}
									onSave={handleSave}
								/>
							)}
						</>
					)}
				</View>
			</KeyboardAvoidingView>
		</Modal>
	);
}

const SHEET_HEIGHT = '75%';

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
	memoInput: {
		borderWidth: 1,
		borderColor: '#e0e0e0',
		borderRadius: 8,
		paddingHorizontal: 14,
		paddingVertical: 12,
		fontSize: 14,
		color: '#1a1a1a',
		height: 120,
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
});
