import {jstsExtractor, svelteExtractor} from "svelte-i18n-lingui/extractor"

export default {
    locales: ["en", "de"],
    sourceLocale: "en",
    catalogs: [
        {
            path: "src/locales/{locale}",
            include: ["src"],
        },
    ],
    extractors: [jstsExtractor, svelteExtractor],
}
