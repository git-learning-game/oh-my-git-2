<script lang="ts">
    import {Battle} from "./cards.ts"
    import CardSvelte from "./Card.svelte"
    import {createEventDispatcher} from "svelte"
    import {flip} from "svelte/animate"
    import {fly} from "svelte/transition"
    import {t} from "svelte-i18n-lingui"
    const dispatch = createEventDispatcher()

    export let battle: Battle
</script>

<div id="wrapper">
    {#if battle}
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
                        active={battle.activeCard === card}
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
    {/if}
</div>

<style>
    #wrapper {
        background: #b59e77;
        padding: 0.5em;
        position: relative;
        height: 100%;
    }
    .cards {
        display: flex;
        gap: 1em;
        justify-content: center;
        margin: 0 15em;
    }
</style>
