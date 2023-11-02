<script lang="ts">
    import CardSvelte from "./Card.svelte"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()
    import {Card} from "./cards"
    import {t} from "svelte-i18n-lingui"

    export let message: string
    export let choices: Card[]
    export let deck: Card[]

    function skip() {
        dispatch("choice", null)
    }
</script>

<div id="decision-container">
    <h1>{message} <button on:click={skip}>↪️ {$t`Skip`}</button></h1>
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
                <CardSvelte {card} clickable={true} showCost={true} />
            </div>
        {/each}
    </div>

    <h2>{$t`Your current deck`}</h2>

    <div class="cards">
        {#each deck as card}
            <div class="choice">
                <CardSvelte {card} clickable={false} showCost={true} />
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
        margin-top: 0.5em;
        margin-bottom: 0.5em;
    }
    .cards {
        display: flex;
        justify-content: space-around;
        flex-wrap: wrap;
        gap: 1em;
        min-height: 15em;
        max-height: 34em;
        overflow-y: auto;
        overflow-x: hidden;
        padding: 1em 0;
    }
</style>
