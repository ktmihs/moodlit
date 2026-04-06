export type ReadingStatus = 'want_to_read' | 'reading' | 'completed';

export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          display_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          updated_at?: string;
        };
      };
      books: {
        Row: {
          id: string;
          isbn: string | null;
          title: string;
          author: string | null;
          publisher: string | null;
          published_date: string | null;
          description: string | null;
          cover_image_url: string | null;
          genre: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          isbn?: string | null;
          title: string;
          author?: string | null;
          publisher?: string | null;
          published_date?: string | null;
          description?: string | null;
          cover_image_url?: string | null;
          genre?: string | null;
          created_at?: string;
        };
        Update: {
          isbn?: string | null;
          title?: string;
          author?: string | null;
          publisher?: string | null;
          published_date?: string | null;
          description?: string | null;
          cover_image_url?: string | null;
          genre?: string | null;
        };
      };
      user_books: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          status: ReadingStatus;
          rating: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          status?: ReadingStatus;
          rating?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          status?: ReadingStatus;
          rating?: number | null;
          updated_at?: string;
        };
      };
      reviews: {
        Row: {
          id: string;
          user_id: string;
          book_id: string;
          content: string;
          mood: string | null;
          embedding: number[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          book_id: string;
          content: string;
          mood?: string | null;
          embedding?: number[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content?: string;
          mood?: string | null;
          embedding?: number[] | null;
          updated_at?: string;
        };
      };
      genre_colors: {
        Row: {
          id: string;
          genre: string;
          color: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          genre: string;
          color: string;
          created_at?: string;
        };
        Update: {
          color?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      reading_status: ReadingStatus;
    };
  };
}
