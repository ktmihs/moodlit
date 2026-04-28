import { Ionicons } from '@expo/vector-icons';
import { Redirect, Tabs } from 'expo-router';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
	useAnimatedStyle,
	useSharedValue,
	withSpring,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '../../hooks/useAuth';
import { colors, fonts } from '../../lib/theme';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

interface TabIconProps {
	name: IoniconsName;
	focused: boolean;
	color: string;
	size: number;
}

function TabIcon({ name, focused, color, size }: TabIconProps) {
	const scale = useSharedValue(focused ? 1 : 0.85);

	useEffect(() => {
		scale.value = withSpring(focused ? 1 : 0.85, {
			damping: 12,
			stiffness: 180,
		});
	}, [focused, scale]);

	const animatedStyle = useAnimatedStyle(() => ({
		transform: [{ scale: scale.value }],
	}));

	return (
		<View style={styles.iconWrapper}>
			<Animated.View style={animatedStyle}>
				<Ionicons name={name} size={size} color={color} />
			</Animated.View>
			{focused && <View style={[styles.dot, { backgroundColor: color }]} />}
		</View>
	);
}

export default function TabLayout() {
	const { session, loading } = useAuth();
	const insets = useSafeAreaInsets();

	if (!loading && !session) return <Redirect href={'/(auth)/login' as never} />;

	return (
		<Tabs
			screenOptions={{
				headerShown: false,
				tabBarActiveTintColor: colors.ink.primary,
				tabBarInactiveTintColor: colors.ink.muted,
				tabBarShowLabel: true,
				tabBarStyle: [
					styles.tabBar,
					{
						height: 80 + insets.bottom,
						paddingBottom: insets.bottom + 10,
					},
				],
				tabBarLabelStyle: styles.tabLabel,
			}}
		>
			<Tabs.Screen
				name="index"
				options={{
					title: '서재',
					tabBarIcon: ({ focused, color, size }) => (
						<TabIcon
							name={focused ? 'book' : 'book-outline'}
							focused={focused}
							color={color}
							size={size}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="search"
				options={{
					title: '발견',
					tabBarIcon: ({ focused, color, size }) => (
						<TabIcon
							name={focused ? 'search' : 'search-outline'}
							focused={focused}
							color={color}
							size={size}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="calendar"
				options={{
					title: '나의 기록',
					tabBarIcon: ({ focused, color, size }) => (
						<TabIcon
							name={focused ? 'calendar' : 'calendar-outline'}
							focused={focused}
							color={color}
							size={size}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="recommend"
				options={{
					title: '추천',
					tabBarIcon: ({ focused, color, size }) => (
						<TabIcon
							name={focused ? 'sparkles' : 'sparkles-outline'}
							focused={focused}
							color={color}
							size={size}
						/>
					),
				}}
			/>
			<Tabs.Screen
				name="mypage"
				options={{
					title: '무드',
					tabBarIcon: ({ focused, color, size }) => (
						<TabIcon
							name={focused ? 'person' : 'person-outline'}
							focused={focused}
							color={color}
							size={size}
						/>
					),
				}}
			/>
		</Tabs>
	);
}

const styles = StyleSheet.create({
	tabBar: {
		backgroundColor: colors.surface,
		borderTopWidth: 1,
		borderTopColor: colors.border.base,
		paddingTop: 8,
		elevation: 0,
		shadowOpacity: 0,
	},
	tabLabel: {
		fontSize: 11,
		fontFamily: fonts.bodyMedium,
		letterSpacing: 0.2,
		marginTop: 4,
		includeFontPadding: false,
	},
	iconWrapper: {
		width: 28,
		height: 28,
		alignItems: 'center',
		justifyContent: 'center',
	},
	dot: {
		position: 'absolute',
		bottom: -6,
		width: 4,
		height: 4,
		borderRadius: 2,
	},
});
