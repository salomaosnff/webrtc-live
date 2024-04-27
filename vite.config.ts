import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import VueDevTools from 'vite-plugin-vue-devtools'
import Router from 'unplugin-vue-router/vite'
import UnoCSS from 'unocss/vite'
import Components from 'unplugin-vue-components/vite'
import mkcert from 'vite-plugin-mkcert'


// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    Router(),
    Components({
      dirs: ['src/components'],
    }),
    VueDevTools(),
    UnoCSS(),
    mkcert({
      savePath: './ssl',
      keyFileName: 'key.pem',
      certFileName: 'cert.pem',
      hosts: ['localhost'],
    })
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
