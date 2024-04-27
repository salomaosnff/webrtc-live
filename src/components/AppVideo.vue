<script setup lang="ts">
defineProps<{
    srcObject?: MediaStream
}>()
</script>
<template>
    <video class="aspect-ratio-16/9 max-h-full bg-black" :srcObject.prop="srcObject" autoplay></video>
</template>