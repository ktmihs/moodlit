import { Image } from 'expo-image';
import { useRef, useState } from 'react';
import {
	LayoutAnimation,
	Platform,
	StyleSheet,
	Text,
	UIManager,
	View,
	useWindowDimensions,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import type { SwipeableMethods } from 'react-native-gesture-handler/ReanimatedSwipeable';
import ReanimatedSwipeable from 'react-native-gesture-handler/ReanimatedSwipeable';
import Animated, {
	runOnJS,
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';
import { deriveStatus } from '../hooks/useBookDetail';
import { colors, fonts, radius, shadow } from '../lib/theme';
import type { ReadingStatus, UserBook } from '../types/book';

if (
	Platform.OS === 'android' &&
	UIManager.setLayoutAnimationEnabledExperimental
) {
	UIManager.setLayoutAnimationEnabledExperimental(true);
}

const NUM_COLS = 3;
const H_PAD = 12;
const CARD_GAP = 12;

interface Props {
	data: UserBook[];
	editMode: boolean;
	onReorder: (newData: UserBook[]) => void;
	onDelete: (item: UserBook) => void;
	onPress: (item: UserBook) => void;
}

interface DragState {
	activeId: string;
	startAbsX: number;
	startAbsY: number;
	cardW: number;
	cardH: number;
	targetIndex: number;
}

export function DraggableGrid({
	data,
	editMode,
	onReorder,
	onDelete,
	onPress,
}: Props) {
	const { width: screenWidth } = useWindowDimensions();
	const cardWidth =
		(screenWidth - H_PAD * 2 - CARD_GAP * (NUM_COLS - 1)) / NUM_COLS;

	const [items, setItems] = useState<UserBook[]>(() => [...data]);
	const [dragState, setDragState] = useState<DragState | null>(null);

	const itemsRef = useRef<UserBook[]>([...data]);
	const dragStateRef = useRef<DragState | null>(null);

	const containerRef = useRef<View>(null);
	const containerX = useRef(0);
	const containerY = useRef(0);
	const cellLayouts = useRef<
		Map<string, { x: number; y: number; w: number; h: number }>
	>(new Map());

	// Ghost card position (follows finger)
	const ghostX = useSharedValue(0);
	const ghostY = useSharedValue(0);
	const ghostScale = useSharedValue(1);

	// Sync with prop changes when not dragging
	const prevData = useRef(data);
	if (prevData.current !== data && !dragStateRef.current) {
		prevData.current = data;
		itemsRef.current = [...data];
		setItems([...data]);
	}

	const measureContainer = () => {
		containerRef.current?.measureInWindow((x, y) => {
			containerX.current = x;
			containerY.current = y;
		});
	};

	const getTargetIndex = (absX: number, absY: number): number => {
		let best = -1;
		let bestDist = Infinity;
		const cx = absX;
		const cy = absY;

		cellLayouts.current.forEach((layout, id) => {
			// Skip the dragged card itself
			if (id === dragStateRef.current?.activeId) return;
			const itemCx = containerX.current + layout.x + layout.w / 2;
			const itemCy = containerY.current + layout.y + layout.h / 2;
			const dist = Math.hypot(cx - itemCx, cy - itemCy);
			if (dist < bestDist) {
				bestDist = dist;
				best = itemsRef.current.findIndex(i => i.id === id);
			}
		});

		return best < 0 ? (dragStateRef.current?.targetIndex ?? 0) : best;
	};

	const startDrag = (
		id: string,
		absX: number,
		absY: number,
		cardW: number,
		cardH: number,
	) => {
		measureContainer();
		const sourceIndex = itemsRef.current.findIndex(i => i.id === id);
		const state: DragState = {
			activeId: id,
			startAbsX: absX,
			startAbsY: absY,
			cardW,
			cardH,
			targetIndex: sourceIndex,
		};
		dragStateRef.current = state;
		ghostX.value = absX - cardW / 2;
		ghostY.value = absY - cardH / 2;
		ghostScale.value = withSpring(1.06);
		setDragState(state);
	};

	const updateDrag = (absX: number, absY: number) => {
		if (!dragStateRef.current) return;
		ghostX.value = absX - dragStateRef.current.cardW / 2;
		ghostY.value = absY - dragStateRef.current.cardH / 2;

		const target = getTargetIndex(absX, absY);
		if (target !== dragStateRef.current.targetIndex) {
			LayoutAnimation.configureNext({
				duration: 180,
				update: { type: 'easeInEaseOut' },
			});
			dragStateRef.current = { ...dragStateRef.current, targetIndex: target };
			setDragState(prev => (prev ? { ...prev, targetIndex: target } : prev));
		}
	};

	const endDrag = () => {
		if (!dragStateRef.current) return;
		const { activeId, targetIndex } = dragStateRef.current;
		ghostScale.value = withSpring(1);

		// Build final order: remove active, insert at target
		const sourceIndex = itemsRef.current.findIndex(i => i.id === activeId);
		const next = [...itemsRef.current];
		const [moved] = next.splice(sourceIndex, 1);
		next.splice(targetIndex, 0, moved);

		itemsRef.current = next;
		dragStateRef.current = null;
		setItems(next);
		setDragState(null);
		onReorder(next);
	};

	// Build display items: replace activeId with placeholder, insert placeholder at target
	const activeItem = dragState
		? items.find(i => i.id === dragState.activeId)
		: null;

	type DisplayItem = UserBook | { __placeholder: true; id: string };
	const displayItems: DisplayItem[] = dragState
		? (() => {
				const without: DisplayItem[] = items.filter(
					i => i.id !== dragState.activeId,
				);
				without.splice(dragState.targetIndex, 0, {
					__placeholder: true,
					id: '__placeholder__',
				});
				return without;
			})()
		: items;

	const ghostStyle = useAnimatedStyle(() => ({
		position: 'absolute',
		left: ghostX.value,
		top: ghostY.value,
		width: dragState?.cardW ?? cardWidth,
		transform: [{ scale: ghostScale.value }],
		zIndex: 100,
		shadowColor: '#000',
		shadowOpacity: 0.25,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 4 },
		elevation: 12,
	}));

	return (
		<View ref={containerRef} style={styles.grid}>
			{displayItems.map(item => {
				if ('__placeholder' in item) {
					return (
						<View
							key="__placeholder__"
							style={[{ width: cardWidth }, styles.placeholder]}
						/>
					);
				}
				return (
					<GridItem
						key={item.id}
						item={item}
						cardWidth={cardWidth}
						editMode={editMode}
						isDragging={dragState?.activeId === item.id}
						onLayout={(x, y, w, h) => {
							cellLayouts.current.set(item.id, { x, y, w, h });
						}}
						onDragStart={(absX, absY, w, h) =>
							startDrag(item.id, absX, absY, w, h)
						}
						onDragMove={updateDrag}
						onDragEnd={endDrag}
						onDelete={() => onDelete(item)}
						onPress={() => onPress(item)}
					/>
				);
			})}

			{/* Ghost card follows finger */}
			{dragState && activeItem && (
				<Animated.View style={ghostStyle} pointerEvents="none">
					<CardContent item={activeItem} cardWidth={dragState.cardW} editing />
				</Animated.View>
			)}
		</View>
	);
}

// ── 상태 뱃지: 흰 글자와 강한 대비를 갖는 유기적 톤 팔레트 ──
const STATUS_BADGE: Record<ReadingStatus, { label: string; style: object }> = {
	want: { label: '읽고 싶어요', style: { backgroundColor: '#eedf9d' } },
	reading: { label: '읽는 중', style: { backgroundColor: '#f5bab1' } },
	finished: { label: '읽음', style: { backgroundColor: '#bbddeb' } },
};

function StatusBadge({ status }: { status: ReadingStatus }) {
	const { label, style } = STATUS_BADGE[status];
	return (
		<View style={[styles.badge, style]}>
			<Text style={styles.badgeText}>{label}</Text>
		</View>
	);
}

// ── Card content (shared between normal card and ghost) ──
function CardContent({
	item,
	cardWidth,
	editing = false,
}: {
	item: UserBook;
	cardWidth: number;
	editing?: boolean;
}) {
	const status = deriveStatus(item);
	return (
		<View style={{ width: cardWidth }}>
			<View style={[styles.coverWrapper, editing && styles.coverEditing]}>
				{item.books.cover_image_url ? (
					<Image
						source={{ uri: item.books.cover_image_url }}
						style={styles.cover}
						contentFit="cover"
					/>
				) : (
					<View style={[styles.cover, styles.coverPlaceholder]}>
						<Text style={styles.placeholderText} numberOfLines={3}>
							{item.books.title}
						</Text>
					</View>
				)}
				<StatusBadge status={status} />
			</View>
			<Text style={styles.bookTitle} numberOfLines={2}>
				{item.books.title}
			</Text>
		</View>
	);
}

// ── Individual grid item ──
function GridItem({
	item,
	cardWidth,
	editMode,
	isDragging,
	onLayout,
	onDragStart,
	onDragMove,
	onDragEnd,
	onDelete,
	onPress,
}: {
	item: UserBook;
	cardWidth: number;
	editMode: boolean;
	isDragging: boolean;
	onLayout: (x: number, y: number, w: number, h: number) => void;
	onDragStart: (absX: number, absY: number, w: number, h: number) => void;
	onDragMove: (absX: number, absY: number) => void;
	onDragEnd: () => void;
	onDelete: () => void;
	onPress: () => void;
}) {
	const swipeRef = useRef<SwipeableMethods>(null);
	const itemRef = useRef<View>(null);
	const isActiveSV = useSharedValue(0);

	const longPress = Gesture.LongPress()
		.minDuration(400)
		.onStart(e => {
			isActiveSV.value = 1;
			// Measure card dimensions then start drag
			runOnJS(() => {
				itemRef.current?.measureInWindow((ix, iy, iw, ih) => {
					// Use long press absolute position as finger position
					onDragStart(e.absoluteX, e.absoluteY, iw, ih);
				});
			})();
		});

	const pan = Gesture.Pan()
		.onUpdate(e => {
			if (isActiveSV.value === 0) return;
			runOnJS(onDragMove)(e.absoluteX, e.absoluteY);
		})
		.onFinalize(() => {
			if (isActiveSV.value === 0) return;
			isActiveSV.value = 0;
			runOnJS(onDragEnd)();
		});

	const tap = Gesture.Tap().onEnd(() => runOnJS(onPress)());

	const animStyle = useAnimatedStyle(() => ({
		opacity: isDragging ? 0 : 1, // hide original while ghost is shown
	}));

	const cardNode = (
		<GestureDetector
			gesture={editMode ? Gesture.Simultaneous(longPress, pan) : tap}
		>
			<View
				ref={itemRef}
				onLayout={e => {
					const { x, y, width, height } = e.nativeEvent.layout;
					onLayout(x, y, width, height);
				}}
			>
				<Animated.View style={animStyle}>
					<CardContent item={item} cardWidth={cardWidth} editing={editMode} />
				</Animated.View>
			</View>
		</GestureDetector>
	);

	if (editMode) {
		return (
			<ReanimatedSwipeable
				ref={swipeRef}
				renderRightActions={() => (
					<View style={styles.deleteAction}>
						<Text style={styles.deleteText}>삭제</Text>
					</View>
				)}
				rightThreshold={60}
				onSwipeableOpen={() => {
					swipeRef.current?.close();
					onDelete();
				}}
				friction={2}
			>
				{cardNode}
			</ReanimatedSwipeable>
		);
	}

	return cardNode;
}

const styles = StyleSheet.create({
	grid: {
		flexDirection: 'row',
		flexWrap: 'wrap',
		paddingHorizontal: H_PAD,
		paddingTop: 8,
		paddingBottom: 24,
		gap: CARD_GAP,
	},
	placeholder: {
		aspectRatio: 0.68,
		borderRadius: radius.sm,
		backgroundColor: colors.bg.subtle,
		borderWidth: 1.5,
		borderColor: colors.border.strong,
		borderStyle: 'dashed',
		marginBottom: 6 + 32,
	},
	coverWrapper: {
		borderRadius: radius.sm,
		overflow: 'hidden',
		aspectRatio: 0.68,
		backgroundColor: colors.bg.subtle,
		marginBottom: 8,
		...shadow.card,
	},
	coverEditing: {
		borderWidth: 1.5,
		borderColor: colors.accent.base,
	},
	cover: { width: '100%', height: '100%' },
	coverPlaceholder: {
		alignItems: 'center',
		justifyContent: 'center',
		padding: 8,
		backgroundColor: colors.accent.soft,
	},
	placeholderText: {
		fontFamily: fonts.bodyMedium,
		fontSize: 10,
		color: colors.accent.deep,
		textAlign: 'center',
	},
	bookTitle: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.ink.secondary,
		lineHeight: 17,
	},
	deleteAction: {
		backgroundColor: colors.state.danger,
		justifyContent: 'center',
		alignItems: 'center',
		width: 72,
		borderRadius: radius.sm,
		marginVertical: 4,
		marginRight: 4,
	},
	deleteText: {
		fontFamily: fonts.bodyBold,
		color: colors.surface,
		fontSize: 13,
		letterSpacing: 0.5,
	},
	badge: {
		position: 'absolute',
		top: 6,
		right: 6,
		paddingHorizontal: 7,
		paddingVertical: 3,
		borderRadius: radius.pill,
		borderWidth: 1.5,
		borderColor: colors.surface,
	},
	badgeText: {
		fontFamily: fonts.bodyMedium,
		fontSize: 9,
		fontWeight: 500,
		color: colors.ink.primary,
		letterSpacing: 0.3,
	},
});
