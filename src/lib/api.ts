const TMDB_API_KEY = import.meta.env.VITE_TMDB_API_KEY;
const RAWG_API_KEY = import.meta.env.VITE_RAWG_API_KEY;
// Google Books API key is optional for public data but recommended
const GOOGLE_BOOKS_API_KEY = import.meta.env.VITE_GOOGLE_BOOKS_API_KEY;

export interface SearchResult {
  id: string | number;
  title: string;
  image?: string;
  year?: string;
  type: 'movie' | 'book' | 'game' | 'show';
  description?: string;
}

export const api = {
  async searchMovies(query: string): Promise<SearchResult[]> {
    if (!TMDB_API_KEY) {
      console.warn('TMDB API Key missing');
      return [];
    }
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      return data.results.map((movie: any) => ({
        id: movie.id,
        title: movie.title,
        image: movie.poster_path ? `https://image.tmdb.org/t/p/w200${movie.poster_path}` : undefined,
        year: movie.release_date ? movie.release_date.split('-')[0] : undefined,
        type: 'movie',
        description: movie.overview
      }));
    } catch (error) {
      console.error('Error searching movies:', error);
      return [];
    }
  },

  async searchShows(query: string): Promise<SearchResult[]> {
    if (!TMDB_API_KEY) {
      console.warn('TMDB API Key missing');
      return [];
    }
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/search/tv?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      return data.results.map((show: any) => ({
        id: show.id,
        title: show.name,
        image: show.poster_path ? `https://image.tmdb.org/t/p/w200${show.poster_path}` : undefined,
        year: show.first_air_date ? show.first_air_date.split('-')[0] : undefined,
        type: 'show',
        description: show.overview
      }));
    } catch (error) {
      console.error('Error searching shows:', error);
      return [];
    }
  },

  async searchBooks(query: string): Promise<SearchResult[]> {
    try {
      const keyParam = GOOGLE_BOOKS_API_KEY ? `&key=${GOOGLE_BOOKS_API_KEY}` : '';
      const res = await fetch(
        `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}${keyParam}`
      );
      const data = await res.json();
      return (data.items || []).map((book: any) => ({
        id: book.id,
        title: book.volumeInfo.title,
        image: book.volumeInfo.imageLinks?.thumbnail,
        year: book.volumeInfo.publishedDate ? book.volumeInfo.publishedDate.split('-')[0] : undefined,
        type: 'book',
        description: book.volumeInfo.description
      }));
    } catch (error) {
      console.error('Error searching books:', error);
      return [];
    }
  },

  async searchGames(query: string): Promise<SearchResult[]> {
    if (!RAWG_API_KEY) {
      console.warn('RAWG API Key missing');
      return [];
    }
    try {
      const res = await fetch(
        `https://api.rawg.io/api/games?key=${RAWG_API_KEY}&search=${encodeURIComponent(query)}`
      );
      const data = await res.json();
      return data.results.map((game: any) => ({
        id: game.id,
        title: game.name,
        image: game.background_image,
        year: game.released ? game.released.split('-')[0] : undefined,
        type: 'game',
        description: '' // RAWG list endpoint doesn't return description usually
      }));
    } catch (error) {
      console.error('Error searching games:', error);
      return [];
    }
  }
};
