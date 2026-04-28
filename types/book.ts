export interface Book {
	id: string;
	title: string;
	author: string | null;
	cover_image_url: string | null;
	genre: string | null;
	summary: string | null;
}

export interface UserBook {
	id: string;
	rank: number;
	start_date: string | null;
	end_date: string | null;
	created_at: string;
	books: Book;
}

export type ReadingStatus = 'want' | 'reading' | 'finished';

export type AiStatus = 'pending' | 'processing' | 'done' | 'failed' | null;

export interface Review {
	id: string;
	user_book_id: string;
	content: string | null;
	ai_status: AiStatus;
	rating: number | null;
	memo: string | null;
	sentences: string[];
}

export interface RecommendedBook {
	isbn: string | null;
	title: string;
	author: string | null;
	cover_image_url: string | null;
	reason: string | null;
	similarity: number | null;
}

export interface CalendarEvent {
	user_book_id: string;
	book: {
		id: string;
		title: string;
		author: string | null;
		cover_image_url: string | null;
	};
	start_date: string;
	end_date: string | null;
}

export interface CalendarData {
	events: CalendarEvent[];
	marked_dates: Record<string, { dots: { key: string; color: string }[] }>;
}
