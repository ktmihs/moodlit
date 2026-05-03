import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import cron from 'node-cron';
import { runAiWorker } from './lib/worker';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { rateLimitMiddleware } from './middleware/rateLimit';
import aiWorkerRouter from './routes/aiWorker';
import booksRouter from './routes/books';
import calendarRouter from './routes/calendar';
import legalRouter from './routes/legal';
import recommendationsRouter from './routes/recommendations';
import reviewsRouter from './routes/reviews';
import searchBooksRouter from './routes/searchBooks';
import userBooksRouter from './routes/userBooks';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN ?? 'http://localhost:8081')
	.split(',')
	.map(o => o.trim());

const corsOptions = cors({
	origin: (origin, callback) => {
		if (!origin || allowedOrigins.includes(origin)) {
			callback(null, true);
		} else {
			callback(new Error('Not allowed by CORS'));
		}
	},
	credentials: true,
});

const globalRateLimit = rateLimit({
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
});

app.set('trust proxy', 1);
app.use(helmet());
app.use(corsOptions);
app.use(globalRateLimit);
app.use(express.json());
app.use((_req, res, next) => {
	res.setHeader('Cache-Control', 'no-store');
	next();
});

app.use('/ai-worker', aiWorkerRouter);

app.use(legalRouter);

app.use(requireAuth);
app.use(rateLimitMiddleware);

app.use('/books', booksRouter);
app.use('/calendar', calendarRouter);
app.use('/recommendations', recommendationsRouter);
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
