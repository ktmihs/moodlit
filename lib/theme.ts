export const colors = {
	bg: {
		canvas: '#FAF6F0',
		subtle: '#F4EFE6',
	},
	surface: '#FFFFFF',
	ink: {
		primary: '#2C2A26',
		secondary: '#6B6359',
		muted: '#A39B91',
		placeholder: '#BDB4A8',
	},
	accent: {
		base: '#B5895E',
		soft: '#E8D4B8',
		deep: '#8E6740',
	},
	border: {
		base: '#EAE4D9',
		strong: '#D9D0BE',
	},
	state: {
		success: '#6B8E5A',
		danger: '#B85450',
	},
	overlay: 'rgba(44, 42, 38, 0.45)',
	shadow: 'rgba(44, 42, 38, 0.08)',
} as const;

export const fonts = {
	display: 'GowunDodum_400Regular',
	body: 'NotoSansKR_400Regular',
	bodyMedium: 'NotoSansKR_500Medium',
	bodyBold: 'NotoSansKR_700Bold',
} as const;

export const radius = {
	sm: 6,
	md: 10,
	lg: 14,
	xl: 20,
	pill: 999,
} as const;

export const spacing = {
	xs: 4,
	sm: 8,
	md: 12,
	lg: 16,
	xl: 20,
	xxl: 24,
	xxxl: 32,
} as const;

export const shadow = {
	soft: {
		shadowColor: '#2C2A26',
		shadowOpacity: 0.08,
		shadowRadius: 12,
		shadowOffset: { width: 0, height: 4 },
		elevation: 3,
	},
	card: {
		shadowColor: '#2C2A26',
		shadowOpacity: 0.06,
		shadowRadius: 8,
		shadowOffset: { width: 0, height: 2 },
		elevation: 2,
	},
} as const;
