<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { Live } from '@/lib/peer';


const isJoined = ref(false)
const route = useRoute()

const peer = new Live(route.params.id as string)

</script>
<template>
    <div v-if="isJoined" class="relative h-full w-full"
        @click="($event.currentTarget as HTMLElement).requestFullscreen()">
        <AppVideo v-if="peer.screen" :src-object="peer.screen" class="absolute inset-0" />
        <AppVideo v-if="peer.camera" :src-object="peer.camera" :class="{
        'absolute bottom-0 right-0 w-320px': peer.screen,
        'w-full h-full': !peer.screen
    }" />
    </div>
    <AppBanner v-else @join="isJoined = true, peer.join(route.params.id as string)" />
</template>