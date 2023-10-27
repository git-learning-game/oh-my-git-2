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
    } from "./cards.ts"

    export let battle: Battle
    export let shell: GitShell

    let repo: Repository
    let graph: Graph
    let terminal: Terminal

    let indexSlots: (CreatureCard | null)[]

    let stateMessage

    $: {
        if (battle.state instanceof PlayerTurnState) {
            stateMessage = $t`Your turn`
        } else if (battle.state instanceof RequirePlaceholderState) {
            if (battle.state.placeholders.length == 1) {
                stateMessage = $t`Select target`
            } else {
                stateMessage = $t`Select ${battle.state.placeholders.length} targets`
            }
        } else {
            stateMessage = $t`Unknown state :(`
        }
    }

    onMount(async () => {
        shell.setScreen(terminal.getTerminalDiv())
        await shell.enterNewGitRepo()
        repo = new Repository("/root/repo", shell)
        graph.setRepo(repo)
        await update()
        battle.onSideEffect(realizeEffect)
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

    async function cardDrag(e) {
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
        await battle.endTurn()
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

    function playCard(e) {
        console.log(e)
        battle.playCardFromHand(e.detail.index)
        battle = battle
    }

    function clickSlot(e) {
        console.log(e)
        if (battle.state instanceof RequirePlaceholderState) {
            battle.state.resolveNext(e.detail.index + 1)
            battle = battle
        }
        battle = battle
    }

    function clickNode(e) {
        console.log(e)
        if (battle.state instanceof RequirePlaceholderState) {
            battle.state.resolveNext(e.detail.node)
            battle = battle
        }
        battle = battle
    }

    async function dragToNode(e) {
        console.log("drag", e.detail)
        const node = e.detail.node
        await battle.playCardFromHand(e.detail.cardIndex)
        if (battle.state instanceof RequirePlaceholderState) {
            battle.state.resolveNext(ref)
            battle = battle
        }
        //await realizeEffects(effects)
    }
</script>

<div id="grid">
    <div id="graph">
        <Graph
            bind:this={graph}
            on:clickNode={clickNode}
            on:dragToNode={dragToNode}
        />
    </div>
    <div id="screen">
        <Terminal bind:this={terminal} />
    </div>
    <div id="cards">
        <h1>{stateMessage}</h1>
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
            "hand hand";
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
