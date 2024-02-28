<script lang="ts">
    import {locale} from "svelte-i18n-lingui"
    import languages from "../languages.ts"

    let selected = "de"
    $: setLocale(selected)

    async function setLocale(lang: string) {
        const {messages} = await import(`./locales/${lang}.ts`)
        locale.set(lang, messages)
    }
</script>

<div id="lang-switch">
    <select bind:value={selected}>
        {#each languages as l}
            <option value={l}>{l}</option>
        {/each}
    </select>
</div>

<style>
    #lang-switch {
        font-size: 100%;
        z-index: 10;
        margin: 0.5rem;
    }
    select {
        padding: 0.2em;
        border-radius: 0.4em;
        border-width: 0;
    }
</style>
