import type { Message, Signaling } from "./signaling";

export class BroadcastSignaling implements Signaling {
    #channel: BroadcastChannel;
    id = crypto.randomUUID();

    constructor(liveId: string, private readonly isClient = false) {
        this.#channel = new BroadcastChannel(`live-${liveId}`);
    }

    close(): void {
        this.#channel.close();
    }

    send(message: Message): void {
        this.#channel.postMessage(JSON.stringify([message, this.isClient ? this.id : undefined]));
    }

    onMessage(callback: (message: Message, clientId?: string) => void) {
        const listener = (event: MessageEvent) => {
            const [message, clientId] = JSON.parse(event.data) as [Message, string | undefined];

            if (this.isClient && clientId) {
                return;
            }

            callback(message, clientId);
        }

        this.#channel.addEventListener('message', listener);

        return () => this.#channel.removeEventListener('message', listener)
    }
}