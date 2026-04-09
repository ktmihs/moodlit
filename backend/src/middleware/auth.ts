import { createClient, SupabaseClient } from '@supabase/supabase-js';

export async function getUserClient(
	authorization: string | undefined,
) {
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
