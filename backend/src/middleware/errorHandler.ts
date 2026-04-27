import type { NextFunction, Request, Response } from 'express';
import { apiError, ErrorCode } from '../lib/errors';

export function errorHandler(
	err: Error,
	req: Request,
	res: Response,

	_next: NextFunction,
) {
	console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
	console.error(err.stack);

	apiError(res, ErrorCode.INTERNAL_ERROR, '서버 오류가 발생했습니다.');
}
