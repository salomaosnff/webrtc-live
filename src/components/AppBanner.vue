<script setup lang="ts">
defineProps<{
    onStream?(): void,
    onJoin?(): void,
}>()
</script>
<template>
    <div class="app-banner w-full h-full flex items-center justify-center bg-black color-white">
        <div class="flex">
            <!-- <img src="https://i.pravatar.cc/300" alt="Nome do Apresentador"
                class="rounded-full w-32 h-32 mx-auto mr-8" /> -->
            <div>
                <button v-if="onStream" class="btn btn-primary mt-8 bg-blue py-2 px-4 rounded-2"
                    @click="onStream">Iniciar
                    transmissão</button>
                <button v-else-if="onJoin" class="btn btn-primary mt-8 bg-blue py-2 px-4 rounded-2"
                    @click="onJoin">Entrar na transmissão</button>
            </div>
        </div>
    </div>
</template>

<style lang="scss"></style>