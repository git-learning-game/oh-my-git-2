<script lang="ts">
    import CardSvelte from "./Card.svelte"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()
    import {Card} from "./cards"
    import {t} from "svelte-i18n-lingui"

    export let choices: Card[]
    export let deck: Card[]
</script>

<div id="decision-container">
    <h1>{$t`Pick a card!`}</h1>
    <div class="cards">
        {#each choices as card}
            <div
                class="choice"
                on:click={() => dispatch("choice", card)}
                on:keydown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault()
                        e.stopPropagation()
                        e.target?.dispatchEvent(new MouseEvent("click"))
                    }
                }}
                tabindex="0"
                role="button"
            >
                <CardSvelte {card} clickable={true} />
            </div>
        {/each}
    </div>
    <h2>{$t`Your current deck`}</h2>

    <div class="cards">
        {#each deck as card}
            <div class="choice">
                <CardSvelte {card} clickable={false} />
            </div>
        {/each}
    </div>
</div>

<style>
    #decision-container {
        background: #1a1a1a;
        height: 100vh;
        padding: 1em;
    }
    h1,
    h2 {
        color: white;
        text-align: center;
        font-size: 300%;
        margin-top: 1em;
    }
    .cards {
        display: flex;
        justify-content: space-around;
        flex-wrap: wrap;
    }
</style>
