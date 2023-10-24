import {jstsExtractor, svelteExtractor} from "svelte-i18n-lingui/extractor"
import languages from "./languages.ts"

export default {
    locales: languages,
    sourceLocale: "en",
    catalogs: [
        {
            path: "src/locales/{locale}",
            include: ["src"],
        },
    ],
    extractors: [jstsExtractor, svelteExtractor],
}
