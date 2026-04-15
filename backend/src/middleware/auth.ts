import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { NextFunction, Request, Response } from 'express';
import { apiError, ErrorCode } from '../lib/errors';

export async function getUserClient(authorization: string | undefined) {
	if (!authorization) return null;

	const supabase = createClient(
		process.env.SUPABASE_URL!,
		process.env.SUPABASE_ANON_KEY!,
		{ global: { headers: { Authorization: authorization } } },
	);

	const {
		data: { user },
		error,
	} = await supabase.auth.getUser();
	if (error || !user) return null;

	return { supabase, user };
}

type AuthContext = NonNullable<Awaited<ReturnType<typeof getUserClient>>>;

declare global {
	namespace Express {
		interface Request {
			auth: AuthContext;
		}
	}
}

export async function requireAuth(
	req: Request,
	res: Response,
	next: NextFunction,
) {
	const auth = await getUserClient(req.headers.authorization);
	if (!auth)
		return void apiError(res, ErrorCode.UNAUTHORIZED, '로그인이 필요합니다.');
	req.auth = auth;
	next();
}

let serviceClient: SupabaseClient | null = null;

export function getAdminClient() {
	if (!serviceClient) {
		serviceClient = createClient(
			process.env.SUPABASE_URL!,
			process.env.SUPABASE_SERVICE_ROLE_KEY!,
		);
	}
	return serviceClient;
}
