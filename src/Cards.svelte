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

    function clickSlot(_: MouseEvent, index: number) {
        /*dispatch("clickSlot", {index})*/
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
                    on:drop={(e) => drop(e, index)}
                    on:click={(e) => clickSlot(e, index)}
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
                    on:drop={(e) => drop(e, index)}
                    on:click={(e) => clickSlot(e, index)}
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
        align-items: center;
        justify-content: center;
        gap: 1em;
    }
    .cards {
        display: flex;
        flex-direction: column;
        gap: 1em;
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
