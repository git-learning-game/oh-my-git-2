<script lang="ts">
    import WebShell from "./web-shell.ts"
    let terminalDiv: HTMLDivElement

    export let shell: WebShell
    let active = false

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
        shell.type(`stty rows ${width} cols ${height}\n`)
    }

    function enable() {
        active = true
        shell.setKeyboardActive(true)
        ;(document.activeElement as HTMLElement).blur()
    }

    function disable() {
        active = false
        shell.setKeyboardActive(false)
    }
</script>

<div
    id="wrapper"
    class:active
    on:mouseenter={enable}
    on:mouseleave={disable}
    role="none"
>
    <div id="terminal" bind:this={terminalDiv} />
</div>

<style>
    #wrapper {
        width: 100%;
        height: 100%;
        background: #111;
        overflow: auto;
    }
    .active {
        background: yellow;
    }
</style>
