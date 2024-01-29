<script lang="ts">
    import {t} from "svelte-i18n-lingui"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()

    import {Battle, Card} from "./cards.ts"
    import CardSvelte from "./Card.svelte"
    import EmojiNumber from "./EmojiNumber.svelte"

    export let battle: Battle

    function drop(e: DragEvent, slotIndex: number) {
        e.preventDefault()
        const cardIndex = parseInt(e.dataTransfer?.getData("text/plain") ?? "")
        if (cardIndex >= 0 && cardIndex < battle.hand.length) {
            dispatch("drag", {cardIndex, slotIndex})
        }
    }

    function clickSlot(_: MouseEvent, index: number) {
        dispatch("clickSlot", {index})
    }
</script>

<div id="wrapper">
    {#if battle}
        <div class="group">
            <div class="column-title">{$t`Working directory`}</div>
            <div class="cards">
                <!--{#each battle.slots as slot, index}
                    <CardSvelte
                        card={slot}
                        {index}
                        on:dragover={(e) => e.preventDefault()}
                        on:drop={(e) => drop(e, index)}
                        on:click={(e) => clickSlot(e, index)}
                        placeholderEmoji={["1️⃣", "2️⃣", "3️⃣"][index]}
                    />
                {/each}
                -->
            </div>
        </div>

        <div class="group">
            <div class="column-title">{$t`Index`}</div>
            <div class="cards">
                <!--{#each indexSlots as slot, index}
                    <CardSvelte
                        card={slot}
                        {index}
                        on:dragover={(e) => e.preventDefault()}
                        on:drop={(e) => drop(e, index)}
                        on:click={(e) => clickSlot(e, index)}
                        placeholderEmoji="📜"
                    />
                {/each}
                -->
            </div>
        </div>
    {/if}
</div>

<style>
    #wrapper {
        padding: 1em;
        display: flex;
        flex-direction: row-reverse;
        align-items: center;
        justify-content: center;
        gap: 1em;
    }
    .cards {
        display: flex;
        flex-direction: column;
        gap: 1em;
    }
    .column-title {
        font-weight: bold;
        text-align: center;
        margin-bottom: 0.5em;
        height: 1.5em;
        font-size: 120%;
    }
</style>
