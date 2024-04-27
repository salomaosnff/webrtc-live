import { reactive, shallowRef, watch } from "vue";
import type { Signaling } from "./signaling";
import { WebSocketSignal } from "./websocket";

export class Live {
    peerId = crypto.randomUUID()
    signal: Signaling
    pc!: RTCPeerConnection
    streams: Map<string, MediaStream> = reactive(new Map())
    dataChannels: Map<string, RTCDataChannel> = reactive(new Map())
    metadata = reactive<Record<string, any>>({})

    get camera() {
        return Array.from(this.streams.values()).find(stream => stream.getVideoTracks().length === 1 && stream.getAudioTracks().length === 1)
    }

    get screen() {
        return Array.from(this.streams.values()).find(stream => stream.getAudioTracks().length === 0)
    }

    createConnection() {
        this.pc = new RTCPeerConnection()
        const candidatesQueue: RTCIceCandidate[] = []

        this.pc.oniceconnectionstatechange = () => {
            console.log('ICE state: ', this.pc.iceConnectionState);
        }

        this.pc.onsignalingstatechange = async () => {
            if (this.pc.signalingState === 'stable') {
                while (candidatesQueue.length) {
                    const candidate = candidatesQueue.shift()
                    await this.pc.addIceCandidate(candidate)
                }
            }
        }

        this.pc.onicecandidate = event => {
            if (event.candidate) {
                this.signal.send({
                    type: 'candidate',
                    candidate: event.candidate,
                    to: `streamer-${this.liveId}`
                })
            }
        }

        this.pc.ontrack = event => {
            const stream = event.streams[0]

            if (!this.streams.has(stream.id)) {
                this.streams.set(stream.id, stream)
            }
        }

        this.signal.onMessage(async message => {
            if (message.type === 'start') {
                this.join(message.stream)
                return;
            }
            if (message.type === 'offer') {
                await this.pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
                const answer = await this.pc.createAnswer()
                await this.pc.setLocalDescription(answer)

                this.signal.send({
                    type: 'answer',
                    sdp: answer,
                    to: `streamer-${this.liveId}`
                })
                return;
            }

            if (message.type === 'answer') {
                await this.pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
                return;
            }

            if (message.type === 'candidate') {
                if (!message.candidate) {
                    return;
                }

                if (this.pc.signalingState === 'stable') {
                    await this.pc.addIceCandidate(new RTCIceCandidate(message.candidate))
                } else {
                    candidatesQueue.push(message.candidate)
                }


                return;
            }
        })

        this.pc.ondatachannel = event => {
            const channel = event.channel

            if (channel.label === 'metadata') {
                channel.onmessage = event => {
                    const data = JSON.parse(event.data)
                    Object.assign(this.metadata, data)
                }
            }

            this.dataChannels.set(channel.label, channel)
        }

        this.pc.addEventListener('connectionstatechange', () => {
            if (this.pc.connectionState === 'disconnected') {
                this.createConnection()
            }
        })
    }

    constructor(public readonly liveId: string) {
        console.log(`Peer ID: ${this.peerId}`)
        this.signal = new WebSocketSignal(this.peerId)
        this.createConnection()
    }

    join(stream: string) {
        this.signal.send({ type: 'join', stream })
    }
}

export class Stream {
    signal: Signaling
    connections: Map<string, RTCPeerConnection> = new Map()
    camera = shallowRef<MediaStream>()
    screen = shallowRef<MediaStream>()
    #candidatesQueue: Record<string, RTCIceCandidate[]> = {}
    #dataChannels: Map<string, RTCDataChannel> = new Map()
    #metadata: Record<string, any> = {}

    updateMetadata(metadata: Record<string, any>) {
        this.#metadata = {
            ...metadata,
        }
        const metadataChannel = this.#dataChannels.get('metadata')

        if (!metadataChannel) {
            return;
        }

        if (metadataChannel.readyState === 'open') {
            metadataChannel.send(JSON.stringify(this.#metadata))
            return;
        }

        metadataChannel.addEventListener('open', () => {
            metadataChannel.send(JSON.stringify(this.#metadata))
        }, { once: true })
    }

    constructor(public liveId: string) {
        this.signal = new WebSocketSignal(`streamer-${liveId}`)

        watch([
            this.camera,
            this.screen
        ], ([camera, screen]) => {
            this.updateMetadata({ streams: { camera: camera?.id, screen: screen?.id } })
        }, {
            flush: 'post'
        })

        this.signal.onMessage(async message => {
            if (message.type === 'join' && message.peer) {
                this.#createPeerConnection(message.peer)
                return;
            }


            if (message.type === "answer" && message.peer) {
                const pc = this.connections.get(message.peer)

                if (pc) {
                    await pc.setRemoteDescription(new RTCSessionDescription(message.sdp))
                }
                return;
            }

            if (message.type === 'candidate' && message.peer) {
                const pc = this.connections.get(message.peer)

                if (!pc) {
                    return;
                }

                if (pc.signalingState === 'stable') {
                    await pc.addIceCandidate(new RTCIceCandidate(message.candidate))
                }

                this.#candidatesQueue[message.peer] ??= []
                this.#candidatesQueue[message.peer].push(message.candidate)
            }
        })
    }

    #createPeerConnection(peerId: string) {
        console.log('Creating peer connection with: ', peerId)
        const pc = new RTCPeerConnection()
        const dc = pc.createDataChannel('metadata')

        dc.onopen = () => {
            dc.send(JSON.stringify(this.#metadata))
        }

        dc.onopen = () => {
            dc.send(JSON.stringify({ streams: { camera: this.camera.value?.id, screen: this.screen.value?.id } }))
        }

        this.connections.set(peerId, pc)

        if (this.camera.value) {
            this.camera.value.getTracks().forEach(track => pc.addTrack(track, this.camera.value as MediaStream))
        }

        if (this.screen.value) {
            this.screen.value.getTracks().forEach(track => pc.addTrack(track, this.screen.value as MediaStream))
        }

        pc.onsignalingstatechange = async () => {
            if (pc.signalingState === 'stable') {
                const candidates = this.#candidatesQueue[peerId] ?? []

                while (candidates.length) {
                    const candidate = candidates.shift()
                    await pc.addIceCandidate(candidate)
                }

                delete this.#candidatesQueue[peerId]
            }
        }

        pc.onicecandidate = event => {
            if (event.candidate) {
                this.signal.send({
                    type: 'candidate',
                    candidate: event.candidate,
                    to: peerId,
                })
            }
        }

        pc.onconnectionstatechange = () => {
            if (pc.connectionState === 'disconnected') {
                this.connections.delete(peerId)
            }
        }

        pc.onnegotiationneeded = async () => {
            const offer = await pc.createOffer()
            await pc.setLocalDescription(offer)

            this.signal.send({
                type: 'offer',
                sdp: offer,
                to: peerId,
            })
        }

        return pc
    }

    addTrackToPeers(track: MediaStreamTrack, stream: MediaStream) {
        for (const pc of this.connections.values()) {
            pc.addTrack(track, stream)
        }
    }

    replaceTrackInPeers(oldTrack: MediaStreamTrack, newTrack: MediaStreamTrack) {
        for (const pc of this.connections.values()) {
            pc.getSenders().find(sender => sender.track?.id === oldTrack.id)?.replaceTrack(newTrack)
        }
    }

    async start(stream: string) {
        this.camera.value = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })

        this.signal.send({ type: 'start', stream })
    }

    async toggleMute() {
        const audioTracks = this.camera.value?.getAudioTracks()

        if (!audioTracks?.length) {
            return;
        }

        audioTracks.forEach(track => track.enabled = !track.enabled)
    }

    async toggleCamera() {
        const videoTracks = this.camera.value?.getVideoTracks()

        if (!videoTracks?.length) {
            return;
        }

        videoTracks.forEach(track => track.enabled = !track.enabled)
    }

    async toggleScreen() {
        const videoTracks = this.screen.value?.getVideoTracks()

        if (!videoTracks?.length) {
            this.screen.value = await navigator.mediaDevices.getDisplayMedia({ video: true })
            this.screen.value.getTracks().forEach(track => this.addTrackToPeers(track, this.screen.value as MediaStream))
            return
        }

        videoTracks.forEach(track => track.enabled = !track.enabled)
    }
}