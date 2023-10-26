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
        position: relative;
        width: 100%;
        height: 100%;
        background: black;
    }
    #terminal {
        width: 100%;
        height: 100%;
    }
</style>
