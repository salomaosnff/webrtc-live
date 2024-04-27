<script setup lang="ts">
import { useRoute } from 'vue-router';
import { Stream } from '@/lib/peer';

const route = useRoute()
const stream = new Stream(route.params.id as string)

</script>
<template>
    <div class="bg-black w-full h-full">
        <div v-if="stream.camera.value" class="relative h-full aspect-ratio-16/9 bg-black mx-auto">
            <AppVideo muted class="absolute inset-0" v-if="stream.screen.value" :src-object="stream.screen.value" />
            <AppVideo muted v-if="stream.camera.value" :src-object="stream.camera.value" :class="{
            'absolute bottom-0 right-0 w-320px': stream.screen.value,
            'w-full h-full': !stream.screen.value
        }" />
            <div class="absolute bottom-0 left-0 w-full flex gap-2 justify-center">
                <button class="pa-2" @click="stream.toggleMute()">Microfone</button>
                <button class="pa-2" @click="stream.toggleCamera()">Câmera</button>
                <button class="pa-2" @click="stream.toggleScreen()">Tela</button>
            </div>
        </div>
        <AppBanner v-else @stream="stream.start(route.params.id as string)" />
    </div>
</template>