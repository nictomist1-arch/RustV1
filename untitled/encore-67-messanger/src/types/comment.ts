export interface PostComment{
    id: number;
    message_id: number;
    author_id: number;
    author_name: string;
    author_avatar: string | null;
    body: string;
    created_at: string;
}
