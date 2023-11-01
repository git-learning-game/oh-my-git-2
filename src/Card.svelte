<script lang="ts">
    import {Card, CreatureCard, CommandCard, EffectCard} from "./cards.ts"
    import EmojiNumber from "./EmojiNumber.svelte"
    import {t} from "svelte-i18n-lingui"

    export let card: Card | null = null
    export let index: number | null = null
    export let playable = false
    export let clickable = false
    export let hand = false
    export let placeholderEmoji: string | null = null
    export let showCost = false

    // When language is switched, re-render card.
    $: $t, (card = card)

    function dragStart(e: DragEvent) {
        if (index != null) {
            e.dataTransfer?.setData("text/plain", index.toString())
            console.log("drag", index)
        }
    }

    let fontSize: number
    $: if (card) {
        if (card.getName().length > 15) {
            fontSize = 80
        } else if (card.getName().length > 10) {
            fontSize = 100
        } else {
            fontSize = 130
        }
    }
</script>

<div
    class="slot"
    draggable={playable}
    class:hand
    class:card
    class:playable
    class:clickable
    class:show-cost={showCost}
    on:dragstart={(e) => dragStart(e)}
    on:dragover
    on:drop
    on:click
    on:keydown={(e) => {
        if (e.key === "Enter") {
            e.preventDefault()
            e.stopPropagation()
            e.target?.dispatchEvent(new MouseEvent("click"))
        }
    }}
    role="button"
    tabindex="0"
>
    {#if card}
        {#if showCost}
            <span class="emoji energy"
                ><EmojiNumber number={card.energy} emoji="🔷" /></span
            >
        {/if}

        <div class="card-header">
            <div id="name" style="font-size: {fontSize}%">
                {#if card instanceof CommandCard}
                    <code>{card.getName()}</code>
                {:else}
                    {card.getName()}
                {/if}
            </div>
        </div>
        <div class="card-body">
            {card.getDescription()}
        </div>
        {#if card instanceof CreatureCard}
            <div class="attack">
                <EmojiNumber number={card.attack} emoji={"⚔️"} color="black" />
            </div>
            <div class="health">
                <EmojiNumber number={card.health} emoji={"🩸"} />
            </div>
        {/if}
    {:else if placeholderEmoji}
        <span class="placeholder">{placeholderEmoji}</span>
    {/if}
</div>

<style>
    .slot {
        width: 10em;
        height: 13em;
        background: #aaa;
        border-radius: 1em;
        padding: 0.5em;
        display: inline-flex;
        flex-direction: column;
        position: relative;
        user-select: none;
    }
    code {
        background: #111;
        color: white;
        padding: 0.3em 0.6em;
        border-radius: 0.3em;
    }
    .energy {
        position: absolute;
        top: -0.8em;
        left: -0.5em;
        font-weight: bold;
    }
    .slot:not(.card) {
        opacity: 0.5;
    }
    .hand {
        transition: transform 0.1s;
    }
    .hand:hover {
        transition-timing-function: ease-out;
        transform: scale(1.3);
        transform-origin: center bottom;
        z-index: 10;
    }
    .card {
        background: white;
        color: black;
        position: relative;
        box-shadow: 0 0 0.5em rgba(0, 0, 0, 0.2);
    }
    .emoji {
        font-size: 150%;
    }
    .card.show-cost .card-header {
        margin-left: 1.5em;
    }
    .card-header {
        font-weight: bold;
        display: flex;
        align-items: center;
        margin-bottom: 1em;
        overflow-wrap: anywhere;
    }
    #name {
        font-size: 150%;
    }
    .playable {
        border: solid #225cba 5px;
        cursor: move;
    }
    .clickable {
        cursor: pointer;
    }
    .attack,
    .health {
        position: absolute;
        bottom: -0.5em;
        font-size: 150%;
        font-weight: bold;
    }
    .attack {
        left: -0.5em;
    }
    .health {
        right: -0.5em;
    }
    .card-body {
        max-height: 8em;
        overflow: auto;
    }
    .placeholder {
        font-size: 600%;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: grayscale(100%);
        opacity: 0.5;
    }
</style>
