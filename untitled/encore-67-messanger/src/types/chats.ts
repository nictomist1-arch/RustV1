export interface ChatCreate{
    title: string;
    participantIds: number[];
}

export interface Chat{
    id: number;
    title: string;
    subtitle: string;
    unread_count: number;
}
