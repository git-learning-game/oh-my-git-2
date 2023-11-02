<script lang="ts">
    import {t} from "svelte-i18n-lingui"
    import {Adventure} from "./cards.ts"
    import Card from "./Card.svelte"
    export let adventure: Adventure

    let date = new Date().toISOString().split("T")[0]
</script>

<div id="wrapper">
    <div id="diploma">
        <div id="header">
            <h1>{$t`Git Diploma`}</h1>
            <h2>{$t`On completing Oh My Git 2.0!`}</h2>
        </div>
        <div id="body">
            <p>
                {$t`Presented to:`}
                <input type="text" placeholder="Your name here" />
            </p>
            <p>{$t`For mastering the following skills:`}</p>
            <ul>
                <li>🪄 {$t`Creating and cloning repositories`}</li>
                <li>🪓 {$t`Detaching HEADs`}</li>
                <li>🍒 {$t`Rebasing and cherry-picking`}</li>
                <li>🧹 {$t`Cleaning up after yourself`}</li>
                <li>🎩 {$t`Advanced Git magic`}</li>
            </ul>
            <br />
            <p>
                {$t`Game was finished with ${adventure.deck.length} cards in the deck:`}
            </p>
            <div id="cards">
                {#each adventure.deck as card}
                    <Card {card} />
                {/each}
            </div>
        </div>
        <div id="footer">
            <p>
                {@html $t`Signed: ${"<i>" + $t`bleeptrack & blinry` + "</i>"}`} –
                {$t`Date: ${date}`}
            </p>
        </div>
    </div>
</div>

<style>
    #wrapper {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100%;
        width: 100%;
        background: #ddd;
    }

    #diploma {
        font-size: 180%;
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        height: 90%;
        width: 50em;
        border-radius: 5px;
        box-shadow: 0 5px 5px rgba(0, 0, 0, 0.5);
        padding: 2em;
        background: white;
    }

    #header {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
    }

    #body {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    }

    #body p {
        margin-bottom: 1em;
    }

    #cards {
        display: flex;
        gap: 1em;
        flex-wrap: wrap;
        font-size: 30%;
    }

    #footer {
        display: flex;
        flex-direction: column;
        justify-content: space-between;
        align-items: center;
        width: 100%;
    }
</style>
