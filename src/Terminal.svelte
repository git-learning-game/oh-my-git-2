<script lang="ts">
    import {onDestroy} from "svelte"
    import {Terminal} from "linux-browser-shell"
    let terminalDiv: HTMLDivElement

    export let terminal: Terminal

    export function type(text: string) {
        terminal.send(text)
    }

    $: if (terminal && terminalDiv) {
        terminal.attach(terminalDiv)
        let width = Math.floor(terminalDiv.clientWidth / 20)
        let height =
            Math.floor(
                Math.max(
                    Math.min(Math.floor(terminalDiv.clientHeight / 8.3), 80),
                    10,
                ) / 2,
            ) * 2
        // TODO: hack...
        width = 21
        height = 50
        terminal.send(
            `stty rows 20 cols 20\nstty rows ${width} cols ${height}\n`,
        )
    }

    onDestroy(() => {
        terminal.dispose()
    })

    function enable() {
        terminal.focus(true)
    }

    function disable() {
        terminal.focus(false)
    }
</script>

<div id="wrapper" on:mouseenter={enable} on:mouseleave={disable} role="none">
    <div id="terminal" bind:this={terminalDiv} />
</div>

<style>
    #wrapper {
        width: 100%;
        height: 100%;
        background: black;
        overflow: hidden;
        display: flex;
    }
    #terminal {
        flex: 1;
    }
</style>
