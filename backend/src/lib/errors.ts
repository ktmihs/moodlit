import type { Response } from 'express';

export const ErrorCode = {
	UNAUTHORIZED: 'UNAUTHORIZED',
	FORBIDDEN: 'FORBIDDEN',
	VALIDATION_ERROR: 'VALIDATION_ERROR',
	MISSING_PARAM: 'MISSING_PARAM',
	NOT_FOUND: 'NOT_FOUND',
	CONFLICT: 'CONFLICT',
	GOOGLE_BOOKS_ERROR: 'GOOGLE_BOOKS_ERROR',
	INTERNAL_ERROR: 'INTERNAL_ERROR',
	RATE_LIMITED: 'RATE_LIMITED',
} as const;

export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];

const statusMap: Record<ErrorCode, number> = {
	UNAUTHORIZED: 401,
	FORBIDDEN: 403,
	VALIDATION_ERROR: 422,
	MISSING_PARAM: 400,
	NOT_FOUND: 404,
	CONFLICT: 409,
	GOOGLE_BOOKS_ERROR: 502,
	INTERNAL_ERROR: 500,
	RATE_LIMITED: 429,
};

export function apiError(
	res: Response,
	code: ErrorCode,
	message: string,
	extra?: object,
): void {
	res.status(statusMap[code]).json({ error: { code, message, ...extra } });
}

export function apiSuccess(res: Response, data: unknown, status = 200): void {
	res.status(status).json(data);
}
