<script lang="ts">
    let terminalDiv: HTMLDivElement
    export let note = "test"

    export function getTerminalDiv() {
        return terminalDiv
    }
</script>

<div id="wrapper">
    <div id="terminal" bind:this={terminalDiv} />
    {#if note !== undefined && note !== ""}
        <div id="note">
            {note}
        </div>
    {/if}
</div>

<style>
    #wrapper {
        position: relative;
        width: 100%;
        height: 100%;
    }
    #terminal {
        width: 100%;
        height: 100%;
    }
    #note {
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        padding: 1em;
        border-radius: 1em;
        background-color: rgba(255, 255, 255, 0.8);
    }
</style>
