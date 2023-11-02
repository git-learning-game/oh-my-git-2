<script lang="ts">
    import {t} from "svelte-i18n-lingui"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()

    import {Battle, Card, CreatureCard} from "./cards.ts"
    import CardSvelte from "./Card.svelte"
    import EmojiNumber from "./EmojiNumber.svelte"

    export let battle: Battle
    export let indexSlots: (CreatureCard | null)[] = [null, null, null]

    function drop(e: DragEvent, slotIndex: number) {
        console.log("drop", slotIndex)
        e.preventDefault()
        const cardIndex = parseInt(e.dataTransfer?.getData("text/plain") ?? "")
        console.log(`from ${cardIndex} to ${slotIndex}`)
        if (cardIndex >= 0 && cardIndex < battle.hand.length) {
            dispatch("drag", {cardIndex, slotIndex})
        }
    }

    function clickSlot(_: MouseEvent, index: number) {
        dispatch("clickSlot", {index})
    }
</script>

<div id="header">
    <div class="half">
        <div class="player">
            {$t`You`}
            <EmojiNumber number={battle.health} emoji={"🩸"} />
        </div>
    </div>
    <div class="half">
        <div class="player">
            {$t`Enemy`}
            <EmojiNumber number={battle.enemyHealth} emoji={"🩸"} />
        </div>
    </div>
</div>
<div id="wrapper">
    {#if battle}
        <div class="group">
            <div class="column-title"></div>

            <div class="cards">
                {#each battle.enemyUpcomingSlots as slot}
                    <CardSvelte card={slot} placeholderEmoji="⬅️" />
                {/each}
            </div>
        </div>

        <div id="arena">
            <div class="group">
                <div class="column-title"></div>
                <div class="cards">
                    {#each battle.enemySlots as slot}
                        <CardSvelte card={slot} />
                    {/each}
                </div>
            </div>

            <div id="separator">⚡</div>

            <div class="group">
                <div class="column-title">Working directory</div>
                <div class="cards">
                    {#each battle.slots as slot, index}
                        <CardSvelte
                            card={slot}
                            {index}
                            on:dragover={(e) => e.preventDefault()}
                            on:drop={(e) => drop(e, index)}
                            on:click={(e) => clickSlot(e, index)}
                            placeholderEmoji={["1️⃣", "2️⃣", "3️⃣"][index]}
                        />
                    {/each}
                </div>
            </div>
        </div>

        <div class="group">
            <div class="column-title">Index</div>
            <div class="cards">
                {#each indexSlots as slot, index}
                    <CardSvelte
                        card={slot}
                        {index}
                        on:dragover={(e) => e.preventDefault()}
                        on:drop={(e) => drop(e, index)}
                        on:click={(e) => clickSlot(e, index)}
                        placeholderEmoji="📜"
                    />
                {/each}
            </div>
        </div>
    {/if}
</div>

<style>
    #header {
        display: flex;
        font-size: 2em;
        font-weight: bold;
    }
    .half {
        flex: 1;
        text-align: center;
    }
    #wrapper {
        padding: 1em;
        display: flex;
        flex-direction: row-reverse;
        align-items: center;
        justify-content: center;
    }
    .player {
        font-size: 100%;
        font-family: var(--title-font);
    }
    .cards {
        display: flex;
        flex-direction: column;
        gap: 1em;
    }
    #arena {
        background: #225cba;
        padding: 1em;
        border-radius: 1.5em;
        color: white;
        display: flex;
        flex-direction: row-reverse;
        margin: -1em 1em;
    }
    #separator {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        font-size: 150%;
    }

    #separator::before,
    #separator::after {
        content: "";
        flex: 1;
        border-left: 3px solid white;
    }

    #separator:not(:empty)::before {
        margin-bottom: 0.25em;
    }

    #separator:not(:empty)::after {
        margin-top: 0.25em;
    }
    .column-title {
        font-weight: bold;
        text-align: center;
        margin-bottom: 0.5em;
        height: 1.5em;
        font-size: 120%;
    }
</style>
