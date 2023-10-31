<script lang="ts">
    let terminalDiv: HTMLDivElement

    export function getTerminalDiv() {
        return terminalDiv
    }
</script>

<div id="wrapper">
    <div id="terminal" bind:this={terminalDiv} />
</div>

<style>
    #wrapper {
        background: black;
        overflow: auto;
    }
</style>
