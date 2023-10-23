<script lang="ts">
    import { createEventDispatcher } from 'svelte';
    const dispatch = createEventDispatcher()

    import {Battle, Card, CreatureCard} from "./cards.ts"
    import CardSvelte from "./Card.svelte"

    export let battle: Battle
    export let indexSlots: (CreatureCard | null)[] = []

    function drop(e: DragEvent, slotIndex: number) {
        console.log("drop", slotIndex)
        e.preventDefault()
        const cardIndex = parseInt(e.dataTransfer?.getData("text/plain") ?? "")
        if (cardIndex >= 0 && cardIndex < battle.hand.length) {
            dispatch("drag", {cardIndex, slotIndex})
        }
    }

    function endTurn() {
        dispatch("endTurn")
    }
</script>

<div id="wrapper">
    {#if battle}
        <h2>Event log</h2>

        <div id="log">
            <ul>
                {#each [...battle.eventLog].reverse() as event}
                    <li>{event}</li>
                {/each}
            </ul>
        </div>

        <h2>Enemy cards (enemy health: {battle.enemyHealth}) </h2>

        <div class="cards">
            {#each battle.enemySlots as slot, index}
                <CardSvelte card={slot} {index} on:dragover={e => e.preventDefault()} on:drop={e => drop(e, index)} />
            {/each}
        </div>

        <h2>Working directory (your health: {battle.health}, energy: {battle.energy}/{battle.maxEnergy})</h2>

        <div class="cards">
            {#each battle.slots as slot, index}
                <CardSvelte card={slot} {index} on:dragover={e => e.preventDefault()} on:drop={e => drop(e, index)} />
            {/each}
        </div>

        <h2>Index</h2>

        <div class="cards">
            {#each indexSlots as slot, index}
                <CardSvelte card={slot} {index} on:dragover={e => e.preventDefault()} on:drop={e => drop(e, index)} />
            {/each}
        </div>

        <h2>Hand</h2>

        <div class="cards">
            {#each battle.hand as card, index}
                <CardSvelte {card} {index} />
            {/each}
        </div>

        <div class="button" on:click={endTurn}>
            ✨ End turn
        </div>
    {/if}
</div>

<style>
    #wrapper {
        padding: 1em;
    }
    #log {
        height: 7em;
        overflow-y: scroll;
    }
    .cards {
        display: flex;
        flex-wrap: wrap;
    }
    .button {
        padding: 0.5em;
        border-radius: 0.5em;
        background-color: #eee;
        color: black;
        display: inline-block;
        margin-top: 1em;
    }
    .button:hover {
        cursor: pointer;
        box-shadow: 0 1px 0.2em rgba(0, 0, 0, 0.2);
    }
    .button:active {
        background-color: #ddd;
        box-shadow: 0 0 0.2em rgba(0, 0, 0, 0.2);
    }

</style>
