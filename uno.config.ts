import { defineConfig, presetTypography, presetUno, presetWebFonts } from 'unocss'

export default defineConfig({
    presets: [
        presetUno(),
        presetTypography(),
        presetWebFonts({
            fonts: {
                sans: 'Roboto',
                mono: ['Fira Code', 'Fira Mono:400,700'],
            },
        })
    ]
})