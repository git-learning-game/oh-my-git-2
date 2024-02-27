<script lang="ts">
    import {t} from "svelte-i18n-lingui"
    import {createEventDispatcher} from "svelte"
    import {TextFile} from "./files.ts"
    import FileSvelte from "./File.svelte"
    const dispatch = createEventDispatcher()

    import {Battle, Card} from "./cards.ts"

    export let index: TextFile[] = []
    export let workingDirectory: TextFile[] = []

    function drop(e: DragEvent, slotIndex: number) {
        /*e.preventDefault()
        const cardIndex = parseInt(e.dataTransfer?.getData("text/plain") ?? "")
        if (cardIndex >= 0 && cardIndex < battle.hand.length) {
            dispatch("drag", {cardIndex, slotIndex})
        }*/
    }

    function clickFile(_: MouseEvent, file: TextFile) {
        dispatch("clickFile", {file})
    }
</script>

<div id="wrapper">
    <div class="group">
        <div class="column-title">{$t`Working directory`}</div>
        <div class="cards">
            {#each workingDirectory as file}
                <FileSvelte
                    name={file.name}
                    content={file.content}
                    on:dragover={(e) => e.preventDefault()}
                    on:drop={(e) => drop(e, file)}
                    on:click={(e) => clickFile(e, file)}
                />
            {/each}
        </div>
    </div>

    <div class="group index">
        <div class="column-title">{$t`Index`}</div>
        <div class="cards">
            {#each index as file}
                <FileSvelte
                    name={file.name}
                    content={file.content}
                    on:dragover={(e) => e.preventDefault()}
                    on:drop={(e) => drop(e, file)}
                    on:click={(e) => clickFile(e, file)}
                />
            {/each}
        </div>
    </div>
</div>

<style>
    #wrapper {
        padding: 1em;
        display: flex;
        flex-direction: row-reverse;
        gap: 1em;
        overflow: scroll;
        flex: 1;
        border: 2px solid yellow;
    }
    .group {
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
    .cards {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 1em;
        overflow-y: auto;
    }
    .column-title {
        font-weight: bold;
        text-align: center;
        margin-bottom: 0.5em;
        height: 1.5em;
        font-size: 120%;
    }
    .index {
        background: blue;
        padding: 1em;
        border-radius: 1em;
        color: white;
    }
</style>
