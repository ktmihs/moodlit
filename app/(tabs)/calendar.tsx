import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import {
	ActivityIndicator,
	ScrollView,
	StyleSheet,
	Text,
	View,
} from 'react-native';
import { Calendar } from 'react-native-calendars';
import { useCalendar } from '../../hooks/useCalendar';
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
					{event.end_date && event.end_date !== event.start_date
						? ` ~ ${event.end_date}`
						: ''}
				</Text>
			</View>
		</View>
	);
}

const cardStyles = StyleSheet.create({
	row: {
		flexDirection: 'row',
		gap: 12,
		paddingVertical: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f5f5f5',
	},
	thumb: {
		width: 46,
		height: 64,
		borderRadius: 4,
		overflow: 'hidden',
		backgroundColor: '#f0f0f0',
	},
	thumbImg: { width: '100%', height: '100%' },
	thumbPlaceholder: { backgroundColor: '#e8e0d5' },
	info: { flex: 1, justifyContent: 'center', gap: 2 },
	title: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', lineHeight: 20 },
	author: { fontSize: 12, color: '#888' },
	period: { fontSize: 11, color: '#bbb', marginTop: 4 },
});

// ── 캘린더 스크린 ──
export default function CalendarScreen() {
	const { loading, currentMonth, periodMarks, fetchMonth, getEventsForDate } =
		useCalendar();
	const [selectedDate, setSelectedDate] = useState<string>('');

	useEffect(() => {
		fetchMonth(currentMonth);
	}, []); // eslint-disable-line react-hooks/exhaustive-deps

	const handleMonthChange = (month: { dateString: string }) => {
		const ym = month.dateString.slice(0, 7);
		fetchMonth(ym);
	};

	const selectedEvents = selectedDate ? getEventsForDate(selectedDate) : [];

	// 선택된 날짜에 selected 오버레이 추가
	const markedDates = selectedDate
		? {
				...periodMarks,
				[selectedDate]: {
					...(periodMarks[selectedDate] ?? { periods: [] }),
					selected: true,
					selectedColor: 'rgba(0,0,0,0.12)',
				},
			}
		: periodMarks;

	return (
		<View style={styles.container}>
			<View style={styles.header}>
				<Text style={styles.headerTitle}>독서의 흐름</Text>
			</View>

			<Calendar
				markingType="multi-period"
				markedDates={markedDates}
				onDayPress={day => setSelectedDate(day.dateString)}
				onMonthChange={handleMonthChange}
				theme={{
					backgroundColor: '#fff',
					calendarBackground: '#fff',
					textSectionTitleColor: '#888',
					selectedDayBackgroundColor: '#1a1a1a',
					selectedDayTextColor: '#fff',
					todayTextColor: '#1a1a1a',
					todayBackgroundColor: '#f0f0f0',
					dayTextColor: '#1a1a1a',
					textDisabledColor: '#ddd',
					dotColor: '#1a1a1a',
					selectedDotColor: '#fff',
					arrowColor: '#1a1a1a',
					monthTextColor: '#1a1a1a',
					textDayFontWeight: '400',
					textMonthFontWeight: '700',
					textDayHeaderFontWeight: '600',
					textDayFontSize: 14,
					textMonthFontSize: 16,
				}}
				style={styles.calendar}
			/>

			{loading && (
				<ActivityIndicator style={styles.loader} size="small" color="#888" />
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
							<Text style={styles.empty}>이 날은 독서 기록이 없어요</Text>
						) : (
							selectedEvents.map(ev => (
								<BookCard key={ev.user_book_id} event={ev} />
							))
						)}
					</>
				) : (
					<Text style={styles.hint}>
						날짜를 선택하면 읽은 책을 볼 수 있어요
					</Text>
				)}
			</ScrollView>
		</View>
	);
}

const styles = StyleSheet.create({
	container: { flex: 1, backgroundColor: '#fff' },
	header: {
		paddingHorizontal: 20,
		paddingTop: 56,
		paddingBottom: 12,
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	headerTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
	calendar: {
		borderBottomWidth: 1,
		borderBottomColor: '#f0f0f0',
	},
	loader: { marginTop: 12 },
	list: { flex: 1 },
	listContent: { padding: 20, paddingBottom: 40 },
	dateLabel: {
		fontSize: 13,
		fontWeight: '600',
		color: '#555',
		marginBottom: 12,
	},
	empty: { fontSize: 14, color: '#bbb', textAlign: 'center', marginTop: 24 },
	hint: {
		fontSize: 14,
		color: '#bbb',
		textAlign: 'center',
		marginTop: 40,
		lineHeight: 22,
	},
});
