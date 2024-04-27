import type { Message, Signaling } from "./signaling";

export class WebSocketSignal implements Signaling {
    #ws: WebSocket

    constructor(private readonly peerId: string) {
        this.#ws = new WebSocket(`wss://localhost:3000?peer=${peerId}`)
    }

    onMessage(callback: (message: Message, clientId?: string | undefined) => void): () => void {
        const listener = (event: MessageEvent) => {
            const message = JSON.parse(event.data) as Message
            callback(message)
        }

        this.#ws.addEventListener('message', listener)

        return () => this.#ws.removeEventListener('message', listener)
    }

    close(): void {
        this.#ws.close()
    }

    send(message: Message): void {
        this.#ws.send(JSON.stringify(message))
    }

    onConnect(callback: () => void): () => void {
        this.#ws.addEventListener('open', callback)

        return () => this.#ws.removeEventListener('open', callback)
    }
}