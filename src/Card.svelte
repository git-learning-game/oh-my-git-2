<script lang="ts">
    import {Card, CreatureCard, CommandCard} from "./cards.ts"

    export let card: Card | null
    export let index: number

    function dragStart(e: DragEvent) {
        e.dataTransfer?.setData("text/plain", index.toString())
        console.log("drag", index)
    }
</script>

<div class="card" draggable="true" on:dragstart={e => dragStart(e)} on:dragover on:drop>
    {#if card}
        <div class="card-header">
            <h3>({card.energy}) {card.name}</h3>
        </div>
        {#if card instanceof CreatureCard}
            <div class="card-body">
                {card.effectDescription()}
            </div>
            <div class="attack"> {card.attack} </div>
            <div class="health"> {card.health} </div>
        {:else if card instanceof CommandCard}
            <div class="card-body">
                <code>{card.command.template}</code>
            </div>
        {/if}
    {:else}
        –
    {/if}
</div>

<style>
    .card {
        width: 10em;
        height: 10em;
        background: white;
        border-radius: 1em;
        display: inline-block;
        margin: 1em;
        padding: 0.5em;
        position: relative;
        cursor: move;
    }
    .attack, .health {
        position: absolute;
        bottom: 0.5em;
        font-size: 150%;
        font-weight: bold;
    }
    .attack {
        left: 0.5em;
    }
    .health {
        right: 0.5em;
    }
</style>
