<script>
    import CardSvelte from "./Card.svelte"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()

    export let choices
</script>

<div id="decision-container">
    <h1>Pick a card!</h1>
    <div id="cards">
        {#each choices as card}
            <div class="choice" on:click={() => dispatch("choice", card)}>
                <CardSvelte {card} clickable={true} />
            </div>
        {/each}
    </div>
</div>

<style>
    #decision-container {
        background: #1a1a1a;
        height: 100vh;
        padding: 1em;
    }
    h1 {
        color: white;
        text-align: center;
        font-size: 300%;
    }
    #cards {
        display: flex;
        justify-content: space-around;
    }
</style>
