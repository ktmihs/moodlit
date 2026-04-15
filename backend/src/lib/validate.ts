import type { NextFunction, Request, Response } from 'express';
import { ZodSchema } from 'zod';
import { apiError, ErrorCode } from './errors';

interface ValidateTargets {
	body?: ZodSchema;
	query?: ZodSchema;
	params?: ZodSchema;
}

export function validate(schemas: ValidateTargets) {
	return (req: Request, res: Response, next: NextFunction) => {
		for (const [key, schema] of Object.entries(schemas) as [
			keyof ValidateTargets,
			ZodSchema,
		][]) {
			const result = schema.safeParse(req[key]);
			if (!result.success) {
				const message = result.error.issues
					.map(e => `${e.path.map(String).join('.')}: ${e.message}`)
					.join(', ');
				return void apiError(res, ErrorCode.VALIDATION_ERROR, message);
			}
			req[key] = result.data;
		}
		next();
	};
}
