import {defineConfig} from "vite"
import legacy from "@rollup/plugin-legacy"
import checker from "vite-plugin-checker"

export default defineConfig({
    plugins: [
        legacy({
            "./external/v86/build/libv86.js": "V86Starter",
            //"./src/testy.js": "testy",
        }),
        checker({typescript: true}),
    ],
})
