export interface Artist {
    name: string;
    day: string;
    genre: string;
    image: string;
    color: 'primary' | 'accent-cyan' | 'accent-gold';
}

export interface NewsItem {
    id: number;
    category: string;
    title: string;
    excerpt: string;
    image: string;
    color: 'primary' | 'accent-cyan';
}

export interface TicketOption {
    id: string;
    name: string;
    price: number;
}