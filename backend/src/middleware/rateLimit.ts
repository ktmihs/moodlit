const WINDOW_MS = 60_000; // 1분
const MAX_REQUESTS = 100;

const store = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string): {
	allowed: boolean;
	remaining: number;
	resetAt: number;
} {
	const now = Date.now();
	const entry = store.get(key);

	if (!entry || now > entry.resetAt) {
		const resetAt = now + WINDOW_MS;
		store.set(key, { count: 1, resetAt });
		return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt };
	}

	if (entry.count >= MAX_REQUESTS) {
		return { allowed: false, remaining: 0, resetAt: entry.resetAt };
	}

	entry.count += 1;
	return {
		allowed: true,
		remaining: MAX_REQUESTS - entry.count,
		resetAt: entry.resetAt,
	};
}
