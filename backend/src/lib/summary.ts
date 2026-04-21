import { getAdminClient } from '../middleware/auth';

const SUMMARY_BATCH = 20;

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateSummaryIfNeeded(bookId: string): Promise<void> {
	const admin = getAdminClient();

	const { data: book } = await admin
		.from('books')
		.select('id, title, author, description, summary')
		.eq('id', bookId)
		.single();

	if (!book || book.summary) return;
	if (!book.description && !book.title) return;

	const prompt = [
		book.title && `제목: ${book.title}`,
		book.author && `저자: ${book.author}`,
		book.description && `설명: ${book.description}`,
	]
		.filter(Boolean)
		.join('\n');

	const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
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
						'주어진 책 정보를 바탕으로 핵심을 두 문장으로 요약하세요. 첫 문장은 책의 내용을, 두 번째 문장은 독자에게 주는 가치를 담으세요. 부드럽고 자연스러운 한국어로 작성하세요.',
				},
				{ role: 'user', content: prompt },
			],
			max_tokens: 150,
			temperature: 0.4,
		}),
	});

	if (!openaiRes.ok) return;

	const json = await openaiRes.json();
	const summary: string = json.choices?.[0]?.message?.content?.trim() ?? '';

	if (summary) {
		await admin.from('books').update({ summary }).eq('id', bookId);
	}
}

// summary 없는 books를 배치로 처리
export async function runBookSummaryWorker(): Promise<{
	processed: number;
	failed: number;
}> {
	const admin = getAdminClient();

	const { data: books } = await admin
		.from('books')
		.select('id, title, author, description, summary')
		.is('summary', null)
		.not('description', 'is', null)
		.neq('description', '')
		.limit(SUMMARY_BATCH);

	if (!books || books.length === 0) return { processed: 0, failed: 0 };

	let processed = 0;
	let failed = 0;

	for (const book of books as {
		id: string;
		title: string;
		author: string | null;
		description: string | null;
		summary: string | null;
	}[]) {
		try {
			await generateSummaryIfNeeded(book.id);
			processed++;
			await sleep(300);
		} catch (err) {
			console.error(`[Summary Worker] 책 ${book.id} 처리 실패:`, err);
			failed++;
		}
	}

	console.log(`[Summary Worker] 완료 — 성공: ${processed}, 실패: ${failed}`);
	return { processed, failed };
}
