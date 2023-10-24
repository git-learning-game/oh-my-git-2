<script>
	import CardSvelte from "./Card.svelte"
	import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()
    
	export let choices
</script>

<div id="decision-container">
	{#each choices as card}
		<div class="choice" on:click={ () => dispatch("choice", card) }>
			<CardSvelte {card}/>
		</div>
	{/each}
</div>

<style>
	#decision-container{
		display: flex;
		justify-content: space-around;
	}
</style>
