import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCalendar } from '../../hooks/useCalendar';
import { colors, fonts, radius, spacing } from '../../lib/theme';
import type { CalendarEvent } from '../../types/book';

// ── 선택 날짜 도서 카드 ──
function BookCard({ event }: { event: CalendarEvent }) {
	return (
		<View style={cardStyles.row}>
			<View style={cardStyles.thumb}>
				{event.book.cover_image_url ? (
					<Image
						source={{ uri: event.book.cover_image_url }}
						style={cardStyles.thumbImg}
						contentFit="cover"
					/>
				) : (
					<View style={[cardStyles.thumbImg, cardStyles.thumbPlaceholder]} />
				)}
			</View>
			<View style={cardStyles.info}>
				<Text style={cardStyles.title} numberOfLines={2}>
					{event.book.title}
				</Text>
				{event.book.author && (
					<Text style={cardStyles.author} numberOfLines={1}>
						{event.book.author}
					</Text>
				)}
				<Text style={cardStyles.period}>
					{event.start_date}
					{event.end_date
						? event.end_date !== event.start_date
							? ` ~ ${event.end_date}`
							: ''
						: ' ~ 읽는 중'}
				</Text>
			</View>
		</View>
	);
}

const cardStyles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		gap: spacing.md,
		paddingVertical: spacing.md,
		borderBottomWidth: 1,
		borderBottomColor: colors.border.base,
	},
	thumb: {
		width: 48,
		height: 68,
		borderRadius: radius.sm,
		overflow: 'hidden',
		backgroundColor: colors.bg.subtle,
	},
	thumbImg: { width: '100%', height: '100%' },
	thumbPlaceholder: { backgroundColor: colors.accent.soft },
	info: { flex: 1, justifyContent: 'center', gap: 3 },
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
	},
	period: {
		fontFamily: fonts.body,
		fontSize: 11,
		color: colors.ink.muted,
		marginTop: 4,
		letterSpacing: 0.3,
	},
});

// ── 캘린더 스크린 ──
export default function CalendarScreen() {
	const insets = useSafeAreaInsets();
	const { loading, currentMonth, periodMarks, fetchMonth, getEventsForDate } =
		useCalendar();
	const [selectedDate, setSelectedDate] = useState<string>('');

	// useFocusEffect deps 에 currentMonth 를 넣으면 fetchMonth → setCurrentMonth → 재실행으로 중복 호출됨
	const currentMonthRef = useRef(currentMonth);
	currentMonthRef.current = currentMonth;

	useFocusEffect(
		useCallback(() => {
			fetchMonth(currentMonthRef.current);
			return () => {
				setSelectedDate('');
			};
		}, [fetchMonth]),
	);

	const handleMonthChange = (month: { dateString: string }) => {
		const ym = month.dateString.slice(0, 7);
		fetchMonth(ym);
	};

	const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

	const markedDates = selectedDate
		? {
				...periodMarks,
				[selectedDate]: {
					...(periodMarks[selectedDate] ?? { periods: [] }),
					selected: true,
					selectedColor: colors.accent.soft,
				},
			}
		: periodMarks;

	return (
		<View style={[styles.container, { paddingTop: insets.top }]}>
			<View style={styles.header}>
				<Text style={styles.eyebrow}>당신의 독서 여정</Text>
				<Text style={styles.headerTitle}>독서의 흐름</Text>
			</View>

			<View style={styles.calendarWrap}>
				<Calendar
					markingType="multi-period"
					markedDates={markedDates}
					onDayPress={day => setSelectedDate(day.dateString)}
					onMonthChange={handleMonthChange}
					theme={{
						backgroundColor: colors.surface,
						calendarBackground: colors.surface,
						textSectionTitleColor: colors.ink.muted,
						selectedDayBackgroundColor: colors.accent.base,
						selectedDayTextColor: colors.surface,
						todayTextColor: colors.accent.deep,
						todayBackgroundColor: colors.accent.soft,
						dayTextColor: colors.ink.primary,
						textDisabledColor: colors.border.strong,
						dotColor: colors.accent.base,
						selectedDotColor: colors.surface,
						arrowColor: colors.ink.primary,
						monthTextColor: colors.ink.primary,
						textDayFontFamily: fonts.body,
						textMonthFontFamily: fonts.display,
						textDayHeaderFontFamily: fonts.bodyMedium,
						textDayFontSize: 14,
						textMonthFontSize: 18,
						textDayHeaderFontSize: 11,
					}}
					style={styles.calendar}
				/>
			</View>

			{loading && (
				<ActivityIndicator
					style={styles.loader}
					size="small"
					color={colors.ink.muted}
				/>
			)}

			<ScrollView
				style={styles.list}
				contentContainerStyle={styles.listContent}
				showsVerticalScrollIndicator={false}
			>
				{selectedDate ? (
					<>
						<Text style={styles.dateLabel}>{selectedDate}</Text>
						{selectedEvents.length === 0 ? (
							<Text style={styles.empty}>이 날은 비어 있어요</Text>
						) : (
							selectedEvents.map(ev => (
								<BookCard key={ev.user_book_id} event={ev} />
							))
						)}
					</>
				) : (
					<Text style={styles.hint}>
						날짜를 짚어보면{'\n'}그날의 한 권이 펼쳐져요
					</Text>
				)}
			</ScrollView>
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
	calendarWrap: {
		marginHorizontal: spacing.lg,
		borderRadius: radius.lg,
		backgroundColor: colors.surface,
		borderWidth: 1,
		borderColor: colors.border.base,
		overflow: 'hidden',
	},
	calendar: {},
	loader: { marginTop: spacing.md },
	list: { flex: 1 },
	listContent: {
		padding: spacing.xxl,
		paddingBottom: spacing.xxxl + 8,
	},
	dateLabel: {
		fontFamily: fonts.display,
		fontSize: 15,
		color: colors.ink.primary,
		marginBottom: spacing.md,
		letterSpacing: 0.5,
	},
	empty: {
		fontFamily: fonts.body,
		fontSize: 13,
		color: colors.ink.muted,
		textAlign: 'center',
		marginTop: spacing.xxl,
	},
	hint: {
		fontFamily: fonts.display,
		fontSize: 16,
		color: colors.ink.muted,
		textAlign: 'center',
		marginTop: spacing.xxl + spacing.md,
		lineHeight: 26,
	},
});
