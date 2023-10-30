<script lang="ts">
    import {Card, CreatureCard, CommandCard, EffectCard} from "./cards.ts"
    import {t} from "svelte-i18n-lingui"

    export let card: Card | null
    export let index: number
    export let playable = false
    export let clickable = false
    export let hand = false

    // When language is switched, re-render card.
    $: {
        if ($t) {
            card = card
        }
    }

    function dragStart(e: DragEvent) {
        e.dataTransfer?.setData("text/plain", index.toString())
        console.log("drag", index)
    }
</script>

<div
    class="slot"
    draggable={playable}
    class:hand
    class:card
    class:playable
    class:clickable
    on:dragstart={(e) => dragStart(e)}
    on:dragover
    on:drop
    on:click
>
    {#if card}
        <div class="card-header">
            <h3>({card.energy}) {card.getName()}</h3>
        </div>
        {#if card instanceof CreatureCard}
            <div class="card-body">
                {card.effectDescription()}
            </div>
            <div class="attack">{card.attack}</div>
            <div class="health">{card.health}</div>
        {:else if card instanceof CommandCard}
            <div class="card-body">
                <code>{card.command.template}</code>
            </div>
        {:else if card instanceof EffectCard}
            <div class="card-body">
                {card.effectDescription()}
            </div>
        {/if}
    {/if}
</div>

<style>
    .slot {
        width: 10em;
        height: 13em;
        background: #aaa;
        border-radius: 1em;
        margin: 1em;
        padding: 0.5em;
        display: inline-block;
    }
    .card {
        background: white;
        position: relative;
        user-select: none;
    }
    .playable {
        border: solid blue 5px;
        cursor: move;
    }
    .clickable {
        cursor: pointer;
    }
    .attack,
    .health {
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
