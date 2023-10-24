<script lang="ts">

	import { locale } from 'svelte-i18n-lingui';
	import languages from "../languages.ts"

	let selected = 'en' 
	$: setLocale(selected)
    
    async function setLocale(lang) {
		const { messages } = await import(`./locales/${lang}.ts`);
		locale.set(lang, messages);
		console.log(locale)
	}
	
</script>

<div id="lang-switch">
	<select bind:value={selected}> 
		{#each languages as l}
			<option value="{l}">{l}</option> 
        {/each}
    </select>
</div>

<style>
#lang-switch{
	position: absolute;
	bottom: 10px;
	right: 10px;
	z-index: 10;
}
</style>
