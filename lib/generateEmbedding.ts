import { supabase } from './supabase';

export async function generateEmbedding(reviewId: string, content: string) {
	const { error } = await supabase.functions.invoke('generate-embedding', {
		body: { review_id: reviewId, content },
	});

	if (error) throw new Error(`임베딩 생성 실패: ${error.message}`);
}
