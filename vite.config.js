import {defineConfig} from "vite"
import {svelte} from "@sveltejs/vite-plugin-svelte"
import legacy from "@rollup/plugin-legacy"
import checker from "vite-plugin-checker"

export default defineConfig({
    plugins: [
        legacy({
            "./public/v86/libv86.js": "V86Starter",
        }),
        checker({typescript: true}),
        svelte(),
    ],
})
