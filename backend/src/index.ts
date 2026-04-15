import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import { rateLimit } from 'express-rate-limit';
import helmet from 'helmet';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';
import { rateLimitMiddleware } from './middleware/rateLimit';
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
app.use(requireAuth);
app.use(rateLimitMiddleware);

app.use('/search-books', searchBooksRouter);
app.use('/reviews', reviewsRouter);
app.use('/user-books', userBooksRouter);
app.use(errorHandler);

const port = parseInt(process.env.PORT ?? '3000');

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
