<script lang="ts">
    import {t} from "svelte-i18n-lingui"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()

    let date = new Date().toISOString().split("T")[0]

    function print() {
        window.print()
    }
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
        </div>
        <div id="footer">
            <p>
                {@html $t`Signed: ${"<i>" + $t`bleeptrack & blinry` + "</i>"}`} –
                {$t`Date: ${date}`}
            </p>
        </div>
        <button id="print" on:click={print}>🖨️ {$t`Print`}</button>
        <button
            id="close"
            on:click={() => {
                dispatch("closeDiploma")
            }}>X</button
        >
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
        position: relative;
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
        position: relative;
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
    #print {
        font-size: 140%;
        position: absolute;
        right: 0;
        bottom: 0;
        background-color: #900c3f;
        margin-bottom: 0.5em;
        color: white;
    }
    #close {
        font-size: 140%;
        position: absolute;
        right: 0;
        top: 0;
        background-color: #900c3f;
        margin-top: 0.5em;
        color: white;
    }
    @media print {
        @page {
            size: landscape;
        }
        #print,
        :global(#lang-switch) {
            display: none;
        }
        #diploma {
            box-shadow: none;
        }
        #close {
            display: none;
        }
    }
</style>
