import { WebSocketServer, WebSocket, AddressInfo } from 'ws'
import { createServer } from 'https'
import { readFile } from 'fs/promises'

const server = createServer({
    cert: await readFile('../ssl/cert.pem'),
    key: await readFile('../ssl/key.pem'),
})

const wss = new WebSocketServer({
    server
})

const peers = new Map<string, WebSocket>()
const lives = new Map<string, Set<WebSocket>>()
const startedLives = new Set<string>()

wss.on('connection', (ws, req) => {
    const peerId = new URL(req.url ?? '/', 'http://localhost').searchParams.get('peer')

    if (!peerId) {
        ws.close()
        return
    }

    peers.set(peerId, ws)

    let currentLive: string | null = null

    ws.on('message', data => {
        const message = JSON.parse(data.toString())

        if (typeof message.to === 'string' && message.to !== peerId) {
            const peer = peers.get(message.to)

            if (peer) {
                peer.send(JSON.stringify({
                    ...message,
                    peer: peerId
                }))
            }

            return;
        }

        if (message.type === 'start') {
            const live = lives.get(message.stream) ?? new Set()
            lives.set(message.stream, live)

            startedLives.add(message.stream)
            live.forEach(client => {
                ws.send(JSON.stringify({ type: 'join', stream: message.stream, peer: Array.from(peers).find(([, v]) => v === client)?.[0] }))
            })
            console.log(`Stream ${message.stream} started`)
            return;
        }

        if (message.type === 'join') {
            const live = lives.get(message.stream)

            if (live) {
                live.add(ws)
                currentLive = message.stream

                if (startedLives.has(message.stream)) {
                    const streamer = peers.get(`streamer-${message.stream}`)
                    streamer?.send(JSON.stringify({ ...message, peer: peerId }))
                }
            }

            console.log(`Peer ${peerId} joined stream ${message.stream}`)
            return;
        }
    })

    ws.on('close', () => {
        if (currentLive) {
            const live = lives.get(currentLive)

            if (live) {
                live.delete(ws)
            }
        }

        peers.delete(peerId)
    })
})

server.on('listening', () => {
    const address = wss.address() as AddressInfo
    console.log(`Server started on ws://${address.address}:${address.port}`)
})

server.listen(3000, '0.0.0.0')