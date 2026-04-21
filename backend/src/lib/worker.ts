import { getAdminClient } from '../middleware/auth.js';

const MAX_BATCH = 10;

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

async function withBackoff<T>(
	fn: () => Promise<T>,
	maxRetries = 5,
): Promise<T> {
	for (let attempt = 0; attempt <= maxRetries; attempt++) {
		try {
			return await fn();
		} catch (err: unknown) {
			if (attempt === maxRetries) throw err;
			const isRateLimit =
				err instanceof Error &&
				(err.message.includes('429') || err.message.includes('rate'));
			const baseDelay = isRateLimit ? 2000 : 1000;
			await sleep(baseDelay * Math.pow(2, attempt) + Math.random() * 500);
		}
	}
	throw new Error('최대 재시도 횟수 초과');
}

// Step 1: GPT-4o-mini 로 키워드 25개 추출
async function extractKeywords(content: string): Promise<string[]> {
	return withBackoff(async () => {
		const res = await fetch('https://api.openai.com/v1/chat/completions', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'gpt-4o-mini',
				messages: [
					{
						role: 'system',
						content:
							'독자의 독서 감상을 읽고 관련 키워드를 15개 추출하세요. 장르, 주제, 감정, 문체, 연관 작가/작품 등 다양한 관점을 포함하세요. 쉼표로만 구분하여 응답하고 다른 텍스트는 포함하지 마세요.',
					},
					{ role: 'user', content },
				],
				max_tokens: 400,
				temperature: 0.2,
			}),
		});

		if (res.status === 429) throw new Error('429: Rate limit exceeded');
		if (!res.ok) {
			const err = await res.json();
			throw new Error(`OpenAI 오류: ${JSON.stringify(err)}`);
		}

		const json = await res.json();
		const text: string = json.choices?.[0]?.message?.content?.trim() ?? '';

		return text
			.split(/[,，\n]/)
			.map((k: string) => k.trim())
			.filter(Boolean)
			.slice(0, 15);
	});
}

// Step 2: text-embedding-3-small 임베딩 생성 (exponential backoff 적용)
async function generateEmbedding(input: string): Promise<number[]> {
	return withBackoff(async () => {
		const res = await fetch('https://api.openai.com/v1/embeddings', {
			method: 'POST',
			headers: {
				Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				model: 'text-embedding-3-small',
				input,
				dimensions: 1536,
			}),
		});

		if (res.status === 429) throw new Error('429: Rate limit exceeded');
		if (!res.ok) {
			const err = await res.json();
			throw new Error(`OpenAI 임베딩 오류: ${JSON.stringify(err)}`);
		}

		const json = await res.json();
		return json.data[0].embedding as number[];
	});
}

// 리뷰 1건 처리: Step1(키워드) → Step2(임베딩)
async function processReview(reviewId: string, content: string): Promise<void> {
	const supabase = getAdminClient();

	await supabase
		.from('reviews')
		.update({ ai_status: 'processing' })
		.eq('id', reviewId);

	try {
		const keywords = await extractKeywords(content);
		const embeddingInput = keywords.join(', ') + '\n\n' + content;
		const embedding = await generateEmbedding(embeddingInput);

		await supabase
			.from('reviews')
			.update({ keywords, embedding, ai_status: 'done' })
			.eq('id', reviewId);
	} catch (err) {
		await supabase
			.from('reviews')
			.update({ ai_status: 'failed' })
			.eq('id', reviewId);
		throw err;
	}
}

// 일일 AI 처리 Worker: pending 리뷰를 배치로 처리
export async function runAiWorker(): Promise<{
	processed: number;
	failed: number;
}> {
	const supabase = getAdminClient();

	const { data: pending } = await supabase
		.from('reviews')
		.select('id, content')
		.eq('ai_status', 'pending')
		.not('content', 'is', null)
		.neq('content', '')
		.limit(MAX_BATCH);

	if (!pending || pending.length === 0) {
		return { processed: 0, failed: 0 };
	}

	let processed = 0;
	let failed = 0;

	for (const row of pending as { id: string; content: string }[]) {
		try {
			await processReview(row.id, row.content);
			processed++;
			await sleep(300); // API rate limit 방지
		} catch (err) {
			console.error(`[AI Worker] 리뷰 ${row.id} 처리 실패:`, err);
			failed++;
		}
	}

	console.log(`[AI Worker] 완료 — 성공: ${processed}, 실패: ${failed}`);
	return { processed, failed };
}
