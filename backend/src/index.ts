import cors from 'cors';
import 'dotenv/config';
import express from 'express';
import reviewsRouter from './routes/reviews';
import searchBooksRouter from './routes/searchBooks';
import userBooksRouter from './routes/userBooks';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/search-books', searchBooksRouter);
app.use('/reviews', reviewsRouter);
app.use('/user-books', userBooksRouter);

const port = parseInt(process.env.PORT ?? '3000');

app.listen(port, () => {
	console.log(`Server running on port ${port}`);
});
