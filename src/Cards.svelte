<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher()

    import {Card} from "./cards.ts"
    import CardSvelte from "./Card.svelte"

    export let hand: Card[] = []

    export let files: {[path: string]: string}
    export let index: {[path: string]: string}
    export let enemies: {[path: string]: string}

    let slots = ["1", "2", "3"]

    function drop(e: DragEvent, slotIndex: number) {
        console.log("drop", slotIndex)
        e.preventDefault()
        const cardIndex = parseInt(e.dataTransfer?.getData("text/plain") ?? "")
        if (cardIndex >= 0 && cardIndex < hand.length) {
            dispatch("drag", {cardIndex, slotIndex})
        }
    }
</script>

<div id="wrapper">
    <h2>Enemy cards</h2>

    <div class="cards">
    {#each slots as slot, i}
        <div class="slot"  on:dragover={e => e.preventDefault()} on:drop={e => drop(e, i)}><span>{enemies[slot] ?? "–"}</span></div>
    {/each}
    </div>

    <h2>Working directory</h2>

    <div class="cards">
    {#each slots as slot, i}
        <div class="slot"  on:dragover={e => e.preventDefault()} on:drop={e => drop(e, i)}><span>{files[slot] ?? "–"}</span></div>
    {/each}
    </div>

    <h2>Index</h2>

    <div class="cards">
    {#each slots as slot, i}
        <div class="slot"  on:dragover={e => e.preventDefault()} on:drop={e => drop(e, i)}><span>{index[slot] ?? "–"}</span></div>
    {/each}
    </div>

    <h2>Hand</h2>

    <div class="cards">
    {#each hand as card, index}
        <CardSvelte {card} {index} />
    {/each}
    </div>

</div>

<style>
    #wrapper {
        padding: 1em;
    }
    .slot {
        width: 10em;
        height: 15em;
        background: beige;
        display: inline-flex;
        justify-content: center;
        align-items: center;
        margin: 0.5em;
    }
    .slot span {
        display: block;
        text-align: center;
        font-size: 200%;
    }
    .cards {
        display: flex;
        flex-wrap: wrap;
    }
</style>
