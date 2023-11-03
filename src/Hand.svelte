<script lang="ts">
    import {Battle} from "./cards.ts"
    import CardSvelte from "./Card.svelte"
    import {createEventDispatcher} from "svelte"
    import {flip} from "svelte/animate"
    import {fly} from "svelte/transition"
    import {t} from "svelte-i18n-lingui"
    const dispatch = createEventDispatcher()

    export let battle: Battle

    function endTurn() {
        dispatch("endTurn")
    }
</script>

<div id="wrapper">
    {#if battle}
        <div id="energy">
            {battle.energy}/{battle.maxEnergy}
            {#each new Array(battle.energy) as _}
                🔷
            {/each}{#each new Array(Math.max(0, battle.maxEnergy - battle.energy)) as _}
                <span class="used">🔷</span>
            {/each}
        </div>
        <!--<h2>
            {$t`Health`}: {battle.health} – {$t`Energy`}: {energyString} – {$t`Draw pile`}:
            {battle.drawPile.length} – {$t`Discard pile`}: {battle.discardPile
                .length}
        </h2>-->
        <div class="cards">
            {#each battle.hand as card, index (card)}
                <div
                    animate:flip
                    in:fly={{x: 100, duration: 1000}}
                    out:fly={{y: -100, duration: 500}}
                >
                    <CardSvelte
                        {card}
                        {index}
                        hand={true}
                        playable={card.energy <= battle.energy}
                        showCost={true}
                        on:click={() => {
                            dispatch("playCard", {index})
                        }}
                        on:drop={(_) => {
                            console.log("drop on card", card)
                            return false
                        }}
                    />
                </div>
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
        background: #b59e77;
        padding: 0.5em;
        position: relative;
        height: 14em;
    }
    #energy {
        font-size: 200%;
        position: absolute;
        left: 1em;
        top: -1em;
        font-weight: bold;
        background: rgba(255, 255, 255, 0.5);
        padding: 0.3em;
        border-radius: 999em;
    }
    #energy .used {
        filter: grayscale(100%);
        opacity: 0.5;
    }
    .cards {
        display: flex;
        gap: 1em;
        justify-content: center;
        margin: 0 15em;
    }
    .button {
        font-size: 130%;
        font-weight: bold;
        padding: 0.5em;
        border-radius: 99em;
        background-color: orange;
        color: black;
        display: inline-block;
        margin-top: 1em;
        position: absolute;
        right: 1em;
        top: -2.5em;
        box-sizing: content-box;
        box-shadow: 0 0 0.2em rgba(0, 0, 0, 0.2);
        transition: transform 0.1s ease-in-out;
    }
    .button:hover {
        cursor: pointer;
        box-shadow: 0 1px 0.2em rgba(0, 0, 0, 0.2);
        /* orange-red diagonal gradient */
        background: linear-gradient(45deg, #e4d80a 0%, #f83d6c 100%);
        transform: scale(1.1);
    }
    .button:active {
        background-color: #ddd;
        box-shadow: 0 0 0.2em rgba(0, 0, 0, 0.2);
    }
</style>
