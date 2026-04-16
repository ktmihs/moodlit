import Toast from 'react-native-toast-message';

const API_ERROR_MESSAGES: Record<string, string> = {
	UNAUTHORIZED: '로그인이 필요합니다.',
	FORBIDDEN: '접근 권한이 없습니다.',
	NOT_FOUND: '요청한 항목을 찾을 수 없습니다.',
	CONFLICT: '이미 서재에 추가된 책입니다.',
	VALIDATION_ERROR: '입력값을 확인해주세요.',
	MISSING_PARAM: '필수 항목이 누락됐습니다.',
	RATE_LIMITED: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
	GOOGLE_BOOKS_ERROR: '도서 정보를 불러올 수 없습니다.',
	INTERNAL_ERROR: '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
};

interface ApiErrorBody {
	error?: {
		code?: string;
		message?: string;
	};
}

export async function handleApiResponse(res: Response): Promise<void> {
	if (res.ok) return;

	let code: string | undefined;
	let message: string | undefined;

	try {
		const body: ApiErrorBody = await res.json();
		code = body.error?.code;
		message = body.error?.message;
	} catch {
		// JSON 파싱 실패 시 기본 메시지 사용
	}

	const koreanMessage =
		(code && API_ERROR_MESSAGES[code]) ?? message ?? '오류가 발생했습니다.';

	throw new ApiError(koreanMessage, code);
}

export class ApiError extends Error {
	constructor(
		message: string,
		public readonly code?: string,
	) {
		super(message);
	}
}

export function showApiError(err: unknown): void {
	const message = err instanceof Error ? err.message : '오류가 발생했습니다.';
	Toast.show({ type: 'error', text1: message });
}
