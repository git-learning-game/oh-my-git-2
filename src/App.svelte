<script lang="ts">
    import {onMount} from "svelte"
    import LanguageSwitcher from "./LanguageSwitcher.svelte"
    import DecisionSvelte from "./Decision.svelte"
    import BattleSvelte from "./Battle.svelte"
    import Path from "./Path.svelte"
    import WinSvelte from "./Win.svelte"
    import {LinuxBrowserShell} from "linux-browser-shell"

    import {Battle, Adventure, Decision, Win} from "./cards.ts"

    let shell: LinuxBrowserShell
    let adventure: Adventure

    let loadingProgress = 0

    function updateProgress(e: any) {
        console.log(e)
        loadingProgress = (e.loaded / e.total) * 95
    }

    onMount(() => {
        transformToFitScreen()

        shell = new LinuxBrowserShell({
            wasm: "./v86/v86.wasm",
            bios: "./v86/seabios.bin",
            vga_bios: "./v86/vgabios.bin",
            cdrom: "./v86/image.iso",
            initial_state: "./v86/initial-state.bin.zst",
            font: "monospace",
        })
        ;(window as any)["shell"] = shell

        shell.boot(/*updateProgress*/).then(() => {
            loadingProgress = 100
            //shell.setKeyboardActive(false)
            runGitConfigureCommands()
            adventure = new Adventure((_) => {
                // The next event was entered!
                adventure = adventure
                console.log("The next event was entered:", adventure.state)
            })
            adventure.enterNextEvent()
        })
    })

    async function runGitConfigureCommands() {
        let backgroundTerminal = shell.getTerminal(0)
        await backgroundTerminal.putFile("~/.gitconfig", [
            "[core]",
            "    excludesfile = /root/.gitignore",
            "[init]",
            "    defaultBranch = main",
            "[user]",
            "    name = You",
            "    email = mail@example.com",
            "[alias]",
            "    graph = log --graph --pretty=oneline --abbrev-commit --all --decorate",
            "    st = status",
            "    take = checkout -b",
            "[color]",
            "    ui = never",
            '[merge "cardgame"]',
            "    name = cardgame merge driver",
            "    driver = /tmp/merge.sh %A %B",
        ])
        await backgroundTerminal.putFile("/tmp/merge.sh", [
            'CURRENT="$1"',
            'OTHER="$2"',
            "",
            "function get_property() {",
            '    grep "^$1:" "$2" | cut -d" " -f2',
            "}",
            "",
            'ID=$(get_property id "$CURRENT")',
            'HEALTH=$(($(get_property health "$CURRENT") + $(get_property health "$OTHER")))',
            'ATTACK=$(($(get_property attack "$CURRENT") + $(get_property attack "$OTHER")))',
            "",
            'echo "id: $ID" > "$1"',
            'echo "health: $HEALTH" >> "$1"',
            'echo "attack: $ATTACK" >> "$1"',
            "",
            "exit 0",
        ])
        await backgroundTerminal.run("chmod +x /tmp/merge.sh")
    }

    function decisionMade(event: CustomEvent) {
        if (adventure.state instanceof Decision) {
            adventure.state.choose(event.detail)
            adventure = adventure
        } else {
            throw new Error("decisionMade called when not in a decision state")
        }
    }

    function transformToFitScreen() {
        return
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
                <BattleSvelte
                    battle={adventure.state}
                    backgroundTerminal={shell.getTerminal(0)}
                    foregroundTerminal={shell.getTerminal(1)}
                />
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
        width: 100vw;
        height: 100vh;
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
