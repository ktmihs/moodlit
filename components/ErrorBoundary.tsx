import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, fonts, radius, spacing } from '../lib/theme';

interface Props {
	children: React.ReactNode;
	fallback?: (error: Error, reset: () => void) => React.ReactNode;
	onError?: (error: Error, info: React.ErrorInfo) => void;
}

interface State {
	error: Error | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
	state: State = { error: null };

	static getDerivedStateFromError(error: Error): State {
		return { error };
	}

	componentDidCatch(error: Error, info: React.ErrorInfo) {
		this.props.onError?.(error, info);
		if (__DEV__) {
			console.error('[ErrorBoundary]', error, info.componentStack);
		}
	}

	reset = () => this.setState({ error: null });

	render() {
		const { error } = this.state;
		if (!error) return this.props.children;

		if (this.props.fallback) return this.props.fallback(error, this.reset);

		return (
			<View style={styles.container}>
				<View style={styles.card}>
					<Text style={styles.mark}>· moodlit ·</Text>
					<Text style={styles.title}>잠시 책장이 흔들렸어요</Text>
					<Text style={styles.message}>
						예상치 못한 오류가 발생했습니다.{'\n'}
						다시 시도해주세요.
					</Text>
					{__DEV__ && (
						<Text style={styles.debug} numberOfLines={6}>
							{error.message}
						</Text>
					)}
					<Pressable style={styles.button} onPress={this.reset}>
						<Text style={styles.buttonText}>다시 시도</Text>
					</Pressable>
				</View>
			</View>
		);
	}
}

const styles = StyleSheet.create({
	container: {
		flex: 1,
		alignItems: 'center',
		justifyContent: 'center',
		backgroundColor: colors.bg.canvas,
		paddingHorizontal: spacing.xxxl,
	},
	card: {
		width: '100%',
		alignItems: 'center',
		paddingVertical: spacing.xxxl,
	},
	mark: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.accent.deep,
		letterSpacing: 3,
		marginBottom: spacing.lg,
	},
	title: {
		fontFamily: fonts.display,
		fontSize: 24,
		color: colors.ink.primary,
		textAlign: 'center',
		marginBottom: spacing.md,
		letterSpacing: 0.3,
	},
	message: {
		fontFamily: fonts.body,
		fontSize: 14,
		color: colors.ink.secondary,
		textAlign: 'center',
		lineHeight: 22,
		marginBottom: spacing.xl,
	},
	debug: {
		fontFamily: fonts.body,
		fontSize: 12,
		color: colors.state.danger,
		textAlign: 'center',
		backgroundColor: colors.bg.subtle,
		borderRadius: radius.md,
		padding: spacing.md,
		marginBottom: spacing.xl,
		alignSelf: 'stretch',
	},
	button: {
		height: 50,
		paddingHorizontal: spacing.xxl,
		backgroundColor: colors.ink.primary,
		borderRadius: radius.lg,
		alignItems: 'center',
		justifyContent: 'center',
	},
	buttonText: {
		fontFamily: fonts.bodyBold,
		color: colors.surface,
		fontSize: 15,
		letterSpacing: 0.5,
	},
});
