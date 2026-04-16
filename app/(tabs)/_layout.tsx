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
				tabBarActiveTintColor: '#1a1a1a',
				tabBarInactiveTintColor: '#aaa',
				tabBarStyle: [
					styles.tabBar,
					{
						height: 52 + insets.bottom,
						paddingBottom: insets.bottom,
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
					title: '검색',
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
		</Tabs>
	);
}

const styles = StyleSheet.create({
	tabBar: {
		backgroundColor: '#fff',
		borderTopWidth: 1,
		borderTopColor: '#f0f0f0',
		paddingTop: 8,
		elevation: 0,
		shadowOpacity: 0,
	},
	tabLabel: {
		fontSize: 11,
		fontWeight: '500',
		marginTop: 2,
	},
	iconWrapper: {
		alignItems: 'center',
		gap: 3,
	},
	dot: {
		width: 4,
		height: 4,
		borderRadius: 2,
	},
});
