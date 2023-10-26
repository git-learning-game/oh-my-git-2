<script lang="ts">
    import {onMount} from "svelte"

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
    } from "./cards.ts"

    export let battle: Battle
    export let shell: GitShell

    let repo: Repository
    let graph: Graph
    let terminal: Terminal

    let indexSlots: (CreatureCard | null)[]

    onMount(async () => {
        shell.setScreen(terminal.getTerminalDiv())
        await shell.enterNewGitRepo()
        repo = new Repository("/root/repo", shell)
        graph.setRepo(repo)
        await update()
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
        const file = e.detail.slotIndex + 1
        let effects = await battle.playCardFromHand(e.detail.cardIndex, file)
        await syncGameToDisk()
        await realizeEffects(effects)
    }

    async function endTurn() {
        let effects = battle.endTurn()
        await syncGameToDisk()
        await realizeEffects(effects)
    }

    async function realizeEffects(effects: SideEffect[]) {
        for (let effect of effects) {
            /* (syncGameToDisk takes care of this now)
            if (effect instanceof FileChangeSideEffect) {
                await shell.putFile(effect.path, [effect.content])
            } else if (effect instanceof FileDeleteSideEffect) {
                await shell.run(`rm ${effect.path}`)
            } else 
            */
            if (effect instanceof CommandSideEffect) {
                shell.type(effect.command + "\n")
                updateACoupleOfTimes()
            }
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
</script>

<div id="grid">
    <div id="graph">
        <Graph bind:this={graph} />
    </div>
    <div id="screen">
        <Terminal bind:this={terminal} />
    </div>
    <div id="cards">
        <Cards on:drag={cardDrag} on:endTurn={endTurn} {battle} {indexSlots} />
    </div>
    <div id="hand">
        <Hand on:endTurn={endTurn} {battle} />
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
