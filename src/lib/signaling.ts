interface BaseMessage {
    to: string;
}

interface Offer extends BaseMessage {
    type: 'offer';
    sdp: RTCSessionDescriptionInit
}

interface Answer extends BaseMessage {
    type: 'answer';
    sdp: RTCSessionDescriptionInit
    peer?: string;
}

interface Candidate extends BaseMessage {
    type: 'candidate';
    candidate: RTCIceCandidate;
    peer?: string;
}

interface JoinMessage {
    type: 'join';
    stream: string;
    peer?: string;
}

interface StartMessage {
    type: 'start';
    stream: string;
}

export type Message = (Offer | Answer | Candidate | StartMessage | JoinMessage) & {
    is_audience?: true
};

export interface Signaling {
    send(message: Message): void;
    onMessage(callback: (message: Message, clientId?: string) => void): () => void;
    close(): void;
}