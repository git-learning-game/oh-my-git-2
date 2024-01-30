<script lang="ts">
    import {Battle, buildCard} from "./cards.ts"
    import CardSvelte from "./Card.svelte"
    import {createEventDispatcher} from "svelte"
    import {flip} from "svelte/animate"
    import {fly} from "svelte/transition"
    import {t} from "svelte-i18n-lingui"
    import {getCardCatalogs} from "./achievements.ts"
    const dispatch = createEventDispatcher()

    export let battle: Battle
    export let points: number

    let openCatalogNumber = 0
    let catalogs = getCardCatalogs().map((catalog) => {
        return {
            name: catalog.name,
            cost: catalog.cost,
            cards: catalog.cards.map((card) => {
                return buildCard(card)
            }),
        }
    })
</script>

<div id="wrapper">
    <div class="cards">
        {#each catalogs[openCatalogNumber].cards as card, index}
            <div>
                <CardSvelte
                    {card}
                    {index}
                    hand={true}
                    playable={true}
                    showCost={false}
                    active={battle.activeCard === card}
                    on:click={() => {
                        dispatch("playCard", card)
                    }}
                    on:drop={(_) => {
                        console.log("drop on card", card)
                        return false
                    }}
                />
            </div>
        {/each}
    </div>
    <div id="tabs">
        {#each catalogs as catalog, index}
            <button
                class:active={openCatalogNumber === index}
                class:disabled={points < catalog.cost}
                on:click={() => {
                    if (points >= catalog.cost) {
                        openCatalogNumber = index
                    }
                }}
            >
                {catalog.name} ({points}/{catalog.cost})
            </button>
        {/each}
    </div>
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
        overflow-x: auto;
        height: 20em;
        padding-top: 5em;
        position: relative;
        top: 0em;
        width: 100%;
    }
    #tabs {
        display: flex;
        gap: 1em;
        justify-content: center;
        margin: 1em 2em;
    }
    .disabled {
        color: gray;
    }
    button {
        color: black;
        border: none;
        font-size: 1.5em;
        background: none;
    }
    button.active {
        background: white;
    }
</style>
