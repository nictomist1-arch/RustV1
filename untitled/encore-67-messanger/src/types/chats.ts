export type ChatKind = "chat" | "channel";

export interface ChatCreate{
    kind: ChatKind;
    title: string;
    participantIds: number[];
}

export interface Chat{
    id: number;
    title: string;
    subtitle: string;
    unread_count: number;
    kind: ChatKind;
    owner_id: number | null;
}
