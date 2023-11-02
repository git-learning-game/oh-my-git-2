<script lang="ts">
    import {onMount} from "svelte"
    import LanguageSwitcher from "./LanguageSwitcher.svelte"
    import DecisionSvelte from "./Decision.svelte"
    import BattleSvelte from "./Battle.svelte"
    import Path from "./Path.svelte"
    import WinSvelte from "./Win.svelte"
    import {GitShell} from "./gitshell.ts"

    import {Battle, Adventure, Decision, Win} from "./cards.ts"

    let shell: GitShell
    let adventure: Adventure

    let loadingProgress = 0

    function updateProgress(e: any) {
        console.log(e)
        loadingProgress = (e.loaded / e.total) * 95
    }

    onMount(() => {
        transformToFitScreen()

        shell = new GitShell()
        ;(window as any)["shell"] = shell

        shell.boot(updateProgress).then(() => {
            loadingProgress = 100
            shell.setKeyboardActive(false)
            adventure = new Adventure((_) => {
                // The next event was entered!
                adventure = adventure
                console.log("The next event was entered:", adventure.state)
            })
        })
    })

    function decisionMade(event: CustomEvent) {
        if (adventure.state instanceof Decision) {
            adventure.state.choose(event.detail)
            adventure = adventure
        } else {
            throw new Error("decisionMade called when not in a decision state")
        }
    }

    function transformToFitScreen() {
        // apply css transform style to the container, so that it fits in the screen, centered in the screen
        const container = document.getElementById("container")
        if (container) {
            const scale = Math.min(
                window.innerWidth / container.offsetWidth,
                window.innerHeight / container.offsetHeight,
            )
            let yShift =
                window.innerHeight / 2 - (container.offsetHeight * scale) / 2
            let xShift =
                window.innerWidth / 2 - (container.offsetWidth * scale) / 2
            // set transform so that the container is centered in the screen
            container.style.transformOrigin = "top left"
            container.style.transform = `translate(${xShift}px, ${yShift}px) scale(${scale}) `
        }
    }

    function keydown(e: KeyboardEvent) {}

    function toggleFullscreen() {
        const container = document.getElementById("container")
        if (container) {
            if (document.fullscreenElement) {
                document.exitFullscreen()
            } else {
                container.requestFullscreen()
            }
        }
    }
</script>

<div id="container">
    {#if loadingProgress < 100}
        <div id="progress"><span>{Math.round(loadingProgress)}%</span></div>
    {:else}
        <LanguageSwitcher />
        {#if adventure}
            {#if adventure.state instanceof Battle}
                <BattleSvelte battle={adventure.state} {shell} />
            {:else if adventure.state instanceof Decision}
                <DecisionSvelte
                    message={adventure.state.message}
                    choices={adventure.state.choices}
                    deck={adventure.deck}
                    on:choice={decisionMade}
                />
            {:else if adventure.state instanceof Adventure}
                <Path {adventure} />
            {:else if adventure.state instanceof Win}
                <WinSvelte {adventure} />
            {/if}
        {:else}
            Starting game...
        {/if}
    {/if}
</div>

<svelte:window on:resize={transformToFitScreen} on:keydown={keydown} />

<style>
    :global(body) {
        background: black;
    }
    #container {
        width: 1920px;
        height: 1080px;
    }
    #progress {
        width: 100%;
        height: 100%;
        display: flex;
        justify-content: center;
        align-items: center;
        font-size: 500%;
        color: white;
    }
</style>
