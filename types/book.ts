export interface Book {
	id: string;
	title: string;
	cover_image_url: string | null;
	genre: string | null;
}

export interface UserBook {
	id: string;
	rank: number;
	start_date: string | null;
	end_date: string | null;
	books: Book;
}
