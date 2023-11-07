<script lang="ts">
    import WebShell from "./web-shell.ts"
    let terminalDiv: HTMLDivElement

    export let shell: WebShell

    $: if (shell && terminalDiv) {
        shell.setKeyboardActive(false)
        shell.setScreen(terminalDiv)
        let width = Math.min(Math.floor(terminalDiv.clientWidth / 27.2), 25)
        let height =
            Math.floor(
                Math.max(
                    Math.min(Math.floor(terminalDiv.clientHeight / 8.3), 80),
                    10,
                ) / 2,
            ) * 2
        // TODO meh hack
        width = 21
        height = 50
        console.warn("Resizing terminal")
        shell.type(`stty rows 20 cols 20\nstty rows ${width} cols ${height}\n`)
    }

    function enable() {
        shell.setKeyboardActive(true)
        ;(document.activeElement as HTMLElement).blur()
    }

    function disable() {
        shell.setKeyboardActive(false)
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
        overflow: auto;
    }
</style>
