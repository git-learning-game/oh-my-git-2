<script lang="ts">
    import WebShell from "./web-shell.ts"
    let terminalDiv: HTMLDivElement

    export let shell: WebShell

    $: if (shell && terminalDiv) {
        shell.setScreen(terminalDiv)
        let width = Math.min(Math.floor(terminalDiv.clientWidth / 27.2), 25)
        let height =
            Math.floor(
                Math.max(
                    Math.min(Math.floor(terminalDiv.clientHeight / 8.3), 80),
                    10,
                ) / 2,
            ) * 2
        shell.type(`stty rows ${width} cols ${height}\n`)
    }
</script>

<div id="wrapper">
    <div id="terminal" bind:this={terminalDiv} />
</div>

<style>
    #wrapper {
        width: 100%;
        height: 100%;
        background: black;
        overflow: auto;
    }
</style>
