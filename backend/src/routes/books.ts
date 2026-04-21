import { Router } from 'express';
import { apiError, apiSuccess, ErrorCode } from '../lib/errors.js';
import { getAdminClient } from '../middleware/auth.js';

const router = Router();

// ── GET /books/:id/summary ── GPT-4o-mini 두 줄 요약 (캐시 우선)
router.get('/:id/summary', async (req, res) => {
	const { supabase } = req.auth;

	const { data: book, error } = await supabase
		.from('books')
		.select('id, title, author, description, summary')
		.eq('id', req.params.id)
		.single();

	if (error || !book)
		return void apiError(res, ErrorCode.NOT_FOUND, '책을 찾을 수 없습니다.');

	const b = book as {
		id: string;
		title: string;
		author: string | null;
		description: string | null;
		summary: string | null;
	};

	// 캐시된 요약이 있으면 바로 반환
	if (b.summary) return void apiSuccess(res, { summary: b.summary });

	if (!b.description && !b.title)
		return void apiError(
			res,
			ErrorCode.NOT_FOUND,
			'요약에 필요한 책 정보가 없습니다.',
		);

	const prompt = [
		b.title && `제목: ${b.title}`,
		b.author && `저자: ${b.author}`,
		b.description && `설명: ${b.description}`,
	]
		.filter(Boolean)
		.join('\n');

	try {
		const openaiRes = await fetch(
			'https://api.openai.com/v1/chat/completions',
			{
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
			},
		);

		if (!openaiRes.ok)
			return void apiError(
				res,
				ErrorCode.INTERNAL_ERROR,
				'AI 요약 생성에 실패했습니다.',
			);

		const json = await openaiRes.json();
		const summary: string = json.choices?.[0]?.message?.content?.trim() ?? '';

		// books UPDATE RLS 정책 없음 → admin client로 요약 캐시
		await getAdminClient().from('books').update({ summary }).eq('id', b.id);

		apiSuccess(res, { summary });
	} catch {
		apiError(
			res,
			ErrorCode.INTERNAL_ERROR,
			'AI 요약 생성 중 오류가 발생했습니다.',
		);
	}
});

export default router;
