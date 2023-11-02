<script lang="ts">
    import CardSvelte from "./Card.svelte"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()
    import {Card} from "./cards"
    import {t} from "svelte-i18n-lingui"

    export let message: string
    export let choices: Card[][]
    export let deck: Card[]

    function skip() {
        dispatch("choice", null)
    }
</script>

<div id="decision-container">
    <h1>{message} <button on:click={skip}>↪️ {$t`Skip`}</button></h1>
    <div class="cards">
        {#each choices as cards}
            <div
                class="choice"
                on:click={() => dispatch("choice", cards)}
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
                {#each cards as card}
                    <CardSvelte {card} clickable={true} showCost={true} />
                {/each}
                {#if cards.length > 1}
                    <div class="bundle">Bundle!</div>
                {/if}
            </div>
        {/each}
    </div>

    <h2>{$t`Your current deck`}</h2>

    <div class="cards can-overflow">
        {#each deck as card}
            <CardSvelte {card} clickable={false} showCost={true} />
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
        padding: 1em 0;
    }
    .can-overflow {
        overflow-y: auto;
        overflow-x: hidden;
    }
    .choice {
        display: flex;
        gap: 0.5em;
        cursor: pointer;
        transition: transform 0.1s;
        position: relative;
    }
    .choice:hover {
        transform: scale(1.1);
    }
    .bundle {
        color: white;
        font-size: 150%;
        font-variant: small-caps;
        position: absolute;
        left: 50%;
        top: 95%;
        transform: translate(-50%, -50%) rotate(-5deg);
        font-weight: bold;
        background: magenta;
        padding: 0em 0.3em;
        transition: opacity 0.2s;
        box-shadow: 0 0 0.1em black;
    }
    .choice:hover .bundle {
        opacity: 0.2;
    }
</style>
