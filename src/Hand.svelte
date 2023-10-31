<script lang="ts">
    import {Battle} from "./cards.ts"
    import CardSvelte from "./Card.svelte"
    import {createEventDispatcher} from "svelte"
    import {t} from "svelte-i18n-lingui"
    const dispatch = createEventDispatcher()

    export let battle: Battle

    let energyString = ""
    $: if (battle) {
        energyString = ""
        for (let i = 0; i < battle.energy; i++) {
            energyString += "⚡"
        }
    }

    function endTurn() {
        dispatch("endTurn")
    }
</script>

<div id="wrapper">
    {#if battle}
        <h2>
            {$t`Health`}: {battle.health} – {$t`Energy`}: {energyString} – {$t`Draw pile`}:
            {battle.drawPile.length} – {$t`Discard pile`}: {battle.discardPile
                .length}
        </h2>
        <div class="cards">
            {#each battle.hand as card, index}
                <CardSvelte
                    {card}
                    {index}
                    hand={true}
                    playable={card.energy <= battle.energy}
                    on:click={() => {
                        console.log("click :)")
                        dispatch("playCard", {index})
                    }}
                />
            {/each}
        </div>

        <div
            class="button"
            on:click={endTurn}
            on:keydown={(e) => {
                if (e.key === "Enter") {
                    endTurn()
                }
            }}
            role="button"
            tabindex="0"
        >
            ✨ {$t`Commit!`}
        </div>
    {/if}
</div>

<style>
    #wrapper {
        background: lightgreen;
        padding: 0.5em;
        position: relative;
    }
    .cards {
        display: flex;
        gap: 0.5em;
    }
    .button {
        padding: 0.5em;
        border-radius: 0.5em;
        background-color: orange;
        color: black;
        display: inline-block;
        margin-top: 1em;
        position: absolute;
        right: 0.5em;
        top: 0.5em;
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
