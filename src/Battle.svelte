<script lang="ts">
    import {onMount} from "svelte"
    import {t} from "svelte-i18n-lingui"

    import Terminal from "./Terminal.svelte"
    import Graph from "./Graph.svelte"
    import Cards from "./Cards.svelte"
    import Hand from "./Hand.svelte"

    import {GitShell} from "./gitshell.ts"
    import {Repository, GitBlob} from "./repository.ts"

    import {
        Battle,
        CreatureCard,
        SideEffect,
        CommandSideEffect,
        SyncGameToDiskSideEffect,
        PlayerTurnState,
        RequirePlaceholderState,
        FreeStringPlaceholder,
        RefPlaceholder,
        SlotPlaceholder,
    } from "./cards.ts"

    export let battle: Battle
    export let shell: GitShell

    let repo: Repository
    let graph: Graph
    let terminal: Terminal

    let indexSlots: (CreatureCard | null)[]

    let stateMessage: string
    let inputText: string

    $: {
        if (battle.state instanceof PlayerTurnState) {
            stateMessage = $t`Your turn`
        } else if (battle.state instanceof RequirePlaceholderState) {
            let currentPlaceholder = battle.state.currentPlaceholder()
            if (currentPlaceholder instanceof SlotPlaceholder) {
                stateMessage = $t`Select slot`
            } else if (currentPlaceholder instanceof RefPlaceholder) {
                stateMessage = $t`Select ref`
            } else if (currentPlaceholder instanceof FreeStringPlaceholder) {
                stateMessage = $t`Enter text: `
            } else {
                stateMessage = $t`Unknown placeholder`
            }
        } else {
            stateMessage = $t`Unknown state :(`
        }
    }

    onMount(async () => {
        shell.setScreen(terminal.getTerminalDiv())
        await shell.enterNewGitRepo()
        repo = new Repository("/root/repo", shell)
        await update()
        battle.onSideEffect(realizeEffect)
        battle.onHiddenCommand(runCommand)

        window.addEventListener("keydown", (e) => {
            if (e.key == "Enter") {
                updateACoupleOfTimes()
            }
        })
    })

    async function update() {
        graph.setRefreshing(true)
        await repo.update()
        syncDiskToGame()
        graph.update()
        graph.setRefreshing(false)
    }

    function updateACoupleOfTimes() {
        setTimeout(async () => {
            await update()
        }, 500)
    }

    async function cardDrag(e: CustomEvent) {
        console.log("drag", e.detail)
        const slot = e.detail.slotIndex + 1
        await battle.playCardFromHand(e.detail.cardIndex)
        if (battle.state instanceof RequirePlaceholderState) {
            battle.state.resolveNext(slot)
            battle = battle
        }
        //await realizeEffects(effects)
    }

    async function endTurn() {
        battle.endTurn()
        await syncGameToDisk()
        //await realizeEffects(effects)
        battle = battle
    }

    async function realizeEffect(effect: SideEffect) {
        if (effect instanceof CommandSideEffect) {
            shell.type(effect.command + "\n")
            updateACoupleOfTimes()
        } else if (effect instanceof SyncGameToDiskSideEffect) {
            await syncGameToDisk()
        } else {
            throw new Error("Unknown sideeffect type")
        }
        battle = battle
    }

    async function runCommand(command: string): Promise<string> {
        console.log(`Running command: ${command}`)
        let output = await shell.run(command)
        console.log(`Command output: ${output}`)
        return output
    }

    async function syncGameToDisk() {
        for (let [index, card] of battle.slots.entries()) {
            if (card) {
                await shell.putFile((index + 1).toString(), [card.stringify()])
            } else {
                await shell.run(`rm -f ${index + 1}`)
            }
        }
    }

    function syncDiskToGame() {
        battle.slots = [null, null, null]
        for (let entry of repo.workingDirectory.entries) {
            let content = ""
            if (entry.oid) {
                let blob = repo.objects[entry.oid]
                if (blob instanceof GitBlob) {
                    content = blob.content
                } else {
                    throw new Error("Requested OID is not a blob")
                }
            } else {
                content = repo.files[entry.name].content
            }

            if (["1", "2", "3"].includes(entry.name)) {
                battle.slots[parseInt(entry.name) - 1] =
                    CreatureCard.parse(content)
            }
        }

        indexSlots = [null, null, null]
        for (let entry of repo.index.entries) {
            let blob = repo.objects[entry.oid]
            let content = ""
            if (blob instanceof GitBlob) {
                content = blob.content
            } else {
                throw new Error("Requested OID is not a blob")
            }
            if (["1", "2", "3"].includes(entry.name)) {
                indexSlots[parseInt(entry.name) - 1] =
                    CreatureCard.parse(content)
            }
        }

        battle = battle
    }

    async function playCard(e: CustomEvent) {
        await battle.playCardFromHand(e.detail.index)
        battle = battle
    }

    function clickSlot(e: CustomEvent) {
        if (battle.state instanceof RequirePlaceholderState) {
            battle.state.resolveNext(e.detail.index + 1)
            battle = battle
        }
        battle = battle
    }

    function clickNode(e: CustomEvent) {
        if (battle.state instanceof RequirePlaceholderState) {
            battle.state.resolveNext(e.detail.node)
            battle = battle
        }
        battle = battle
    }

    async function dragToNode(e: CustomEvent) {
        console.log("drag", e.detail)
        const node = e.detail.node
        await battle.playCardFromHand(e.detail.cardIndex)
        if (battle.state instanceof RequirePlaceholderState) {
            battle.state.resolveNext(node)
            battle = battle
        }
        //await realizeEffects(effects)
    }

    function inputKeydown(e: KeyboardEvent) {
        if (e.key === "Enter") {
            if (battle.state instanceof RequirePlaceholderState) {
                battle.state.resolveNext(inputText)
                battle = battle
                inputText = ""
            }
        }
    }
</script>

<div id="grid">
    <div id="graph">
        <Graph
            {repo}
            bind:this={graph}
            on:clickNode={clickNode}
            on:dragToNode={dragToNode}
        />
    </div>
    <div id="screen">
        <Terminal bind:this={terminal} />
    </div>
    <div id="cards">
        <h1>
            {stateMessage}
            {#if battle.state instanceof RequirePlaceholderState && battle.state.currentPlaceholder() instanceof FreeStringPlaceholder}
                <input
                    type="text"
                    bind:value={inputText}
                    on:keydown={inputKeydown}
                />
            {/if}
        </h1>
        <Cards
            on:clickSlot={clickSlot}
            on:drag={cardDrag}
            on:endTurn={endTurn}
            {battle}
            {indexSlots}
        />
    </div>
    <div id="hand">
        <Hand on:endTurn={endTurn} {battle} on:playCard={playCard} />
    </div>
</div>

<style>
    :root {
        --term-width: 730px;
        --term-height: 305px;
    }

    #grid {
        width: 100vw;
        height: 100vh;
        display: grid;
        grid-template-areas:
            "graph cards"
            "screen cards"
            "hand cards";
        grid-template-columns: 1fr var(--term-width);
        grid-template-rows: 1fr var(--term-height);
    }

    #graph,
    #screen {
        overflow: auto;
    }

    #graph {
        grid-area: graph;
        background: peachpuff;
    }

    #hand {
        grid-area: hand;
        overflow: auto;
    }

    #cards {
        grid-area: cards;
        background: lightblue;
    }

    #screen {
        grid-area: screen;
        font-family: Iosevka;
    }
</style>
