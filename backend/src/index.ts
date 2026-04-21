import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import cron from 'node-cron';
import { runBookSummaryWorker } from './lib/summary';
import { runAiWorker } from './lib/worker';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { rateLimitMiddleware } from './middleware/rateLimit';
import booksRouter from './routes/books';
import calendarRouter from './routes/calendar';
import reviewsRouter from './routes/reviews';
import searchBooksRouter from './routes/searchBooks';
import userBooksRouter from './routes/userBooks';

const app = express();

app.use(helmet());
app.use(
	cors({
		origin: process.env.CORS_ORIGIN ?? 'http://localhost:8081',
		credentials: true,
	}),
);
app.use(
	rateLimit({
		windowMs: 60_000,
		max: 100,
		standardHeaders: true,
		legacyHeaders: false,
		message: {
			error: {
				code: 'RATE_LIMITED',
				message: '요청이 너무 많습니다. 잠시 후 다시 시도해주세요.',
			},
		},
	}),
);
app.use(express.json());

function workerAuth(
	req: import('express').Request,
	res: import('express').Response,
): boolean {
	const key = req.headers['x-worker-key'];
	if (!key || key !== process.env.WORKER_SECRET_KEY) {
		res
			.status(403)
			.json({ error: { code: 'FORBIDDEN', message: '접근 권한이 없습니다.' } });
		return false;
	}
	return true;
}

// AI Worker 수동 실행
app.post('/ai-worker/run', async (req, res) => {
	if (!workerAuth(req, res)) return;
	try {
		const result = await runAiWorker();
		res.json({ success: true, ...result });
	} catch (err) {
		res
			.status(500)
			.json({ error: { code: 'INTERNAL_ERROR', message: String(err) } });
	}
});

// 기존 책 요약 일괄 생성
app.post('/ai-worker/run-book-summary', async (req, res) => {
	if (!workerAuth(req, res)) return;
	try {
		const result = await runBookSummaryWorker();
		res.json({ success: true, ...result });
	} catch (err) {
		res
			.status(500)
			.json({ error: { code: 'INTERNAL_ERROR', message: String(err) } });
	}
});

app.use(requireAuth);
app.use(rateLimitMiddleware);

app.use('/books', booksRouter);
app.use('/calendar', calendarRouter);
app.use('/search-books', searchBooksRouter);
app.use('/reviews', reviewsRouter);
app.use('/user-books', userBooksRouter);
app.use(errorHandler);

const port = parseInt(process.env.PORT ?? '3000');

app.listen(port, () => {
	console.log(`Server running on port ${port}`);

	// 매일 오전 2시 UTC: pending 리뷰 AI 처리
	cron.schedule('0 2 * * *', () => {
		console.log('[AI Worker] 일일 배치 시작');
		runAiWorker().catch(err => console.error('[AI Worker] 배치 실패:', err));
	});
});
