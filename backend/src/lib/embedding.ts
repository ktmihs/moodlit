import { getAdminClient } from '../middleware/auth';

export async function generateEmbedding(
	reviewId: string,
	content: string,
): Promise<void> {
	const openaiRes = await fetch('https://api.openai.com/v1/embeddings', {
		method: 'POST',
		headers: {
			Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
			'Content-Type': 'application/json',
		},
		body: JSON.stringify({
			model: 'text-embedding-3-small',
			input: content,
			dimensions: 1536,
		}),
	});

	if (!openaiRes.ok) {
		const err = await openaiRes.json();
		throw new Error(`OpenAI 오류: ${JSON.stringify(err)}`);
	}

	const { data } = await openaiRes.json();
	const embedding: number[] = data[0].embedding;

	const supabase = getAdminClient();
	const { error } = await supabase
		.from('reviews')
		.update({ embedding })
		.eq('id', reviewId);
	if (error) throw new Error(`DB 오류: ${error.message}`);
}
