<script lang="ts">
    import {onMount} from "svelte"

    import Terminal from "./Terminal.svelte"
    import Graph from "./Graph.svelte"
    import Help from "./Help.svelte"
    import Cards from "./Cards.svelte"

    import WebShell from "./web-shell.ts"
    import {Repository, GitBlob} from "./repository.ts"

    import {CardGame, Card, CreatureCard, SideEffect, FileChangeSideEffect, FileDeleteSideEffect, CommandSideEffect} from "./cards.ts"

    // Show a warning when the user tries to leave the page (for example, by pressing Ctrl-W...)
    //window.onbeforeunload = function (e) {
    //    e.preventDefault()
    //    e.returnValue = ""
    //}

    let serialDiv: HTMLDivElement
    let objectsDiv: HTMLDivElement

    let shell: WebShell
    let repo: Repository
    let graph: Graph
    let terminal: Terminal
    let terminalNote = ""

    let game: CardGame
    let indexSlots: (CreatureCard | null)[]

    async function runConfigureCommands() {
        await shell.putFile("~/.gitconfig", [
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
        ])
    }

    async function runLazynessCommands() {
        await shell.putFile("~/.aliases", [
            "alias ga='git add'",
            "alias gc='git commit'",
            "alias gca='git commit -a'",
            "alias gcaa='git commit -a --amend'",
            "alias gco='git checkout'",
            "alias gd='git diff'",
            "alias gg='git graph'",
            "alias gs='git status --short'",
            "alias gec='git commit --allow-empty -m \"Empty commit\"'",

            "alias l='ls -al'",
        ])
    }

    async function runInitCommands() {
        await shell.script(["mkdir /root/repo", "cd /root/repo", "git init"])
    }

    async function update() {
        graph.setRefreshing(true)
        await repo.update()
        let displayed = {
            files: repo.files,
            index: repo.index,
            objects: repo.objects,
            refs: repo.refs,
        }

        if (objectsDiv) {
            objectsDiv.innerText = JSON.stringify(displayed, null, 2)
        }

        updateFromRepoToCardGame()

        graph.update()
        graph.setRefreshing(false)
    }

    function updateACoupleOfTimes() {
        setTimeout(async () => {
            await update()
            //setTimeout(() => update(), 450)
        }, 500)
    }

    onMount(() => {

        let screenDiv = terminal.getTerminalDiv()
        shell = new WebShell(screenDiv)

        game = new CardGame()
        ;(window as any)["game"] = game

        ;(window as any)["run"] = shell.run.bind(shell)
        ;(window as any)["shell"] = shell

        repo = new Repository("/root/repo", shell)
        graph.setRepo(repo)

        terminalNote = "Booting Linux..."
        shell.boot().then(async () => {
            shell.type("stty rows 15\n")
            shell.type("clear\n")
            shell.setKeyboardActive(false)
            console.log("Booted!")
            terminalNote = "Initializing..."
            await runConfigureCommands()
            //await runLazynessCommands()
            await runInitCommands()

            terminalNote = ""
            shell.setKeyboardActive(true)
            //shell.type("source ~/.aliases\n")
            shell.type("cd repo\n")
            shell.type("clear\n")
            shell.type(
                "# If you're not usig a QWERTY keyboard, you can set your keyboard layout using this command: loadkeys <de/fr/...>\n"
            )

            updateACoupleOfTimes()

            window.addEventListener("keydown", (e) => {
                if (e.key == "Enter") {
                    updateACoupleOfTimes()
                }
            })
        })
    })

    async function cleanCallback() {
        await shell.script(["rm -rf /root/repo/* /root/repo/.git", "git init"])
        await updateACoupleOfTimes()
    }

    async function cardDrag(e) {
        console.log("drag", e.detail)
        const file = e.detail.slotIndex + 1
        let effects = await game.playCardFromHand(e.detail.cardIndex, file)
        await realizeEffects(effects)
    }

    async function endTurn() {
        let effects = game.endTurn()
        await realizeEffects(effects)
    }

    async function realizeEffects(effects: SideEffect[]) {
        for (let effect of effects) {
            if (effect instanceof FileChangeSideEffect) {
                await shell.putFile(effect.path, [effect.content])
            } else if (effect instanceof FileDeleteSideEffect) {
                await shell.run(`rm ${effect.path}`)
            } else if (effect instanceof CommandSideEffect) {
                shell.type(effect.command + "\n")
                updateACoupleOfTimes()
            }
        }
        game = game
    }

    function updateFromRepoToCardGame() {
        game.slots = [null, null, null]
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
                game.slots[parseInt(entry.name) - 1] = CreatureCard.parse(content)
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
                indexSlots[parseInt(entry.name) - 1] = CreatureCard.parse(content)
            }
        }

        game = game
    }
</script>

<div id="container">
    <div id="grid">
        <div id="graph">
            <Graph bind:this={graph} />
        </div>
        <!--<div id="objects" bind:this={objectsDiv} />-->
        <div id="screen">
            <Terminal bind:this={terminal} note={terminalNote} />
        </div>
        <!--<div id="help">
            <Help {cleanCallback} />
        </div>-->
        <div id="cards">
            <Cards on:drag={cardDrag} on:endTurn={endTurn} {game} {indexSlots} />
        </div>
    </div>
    <!--<div id="serial" bind:this={serialDiv} />-->
</div>

<style>
    :root {
        --term-width: 730px;
        --term-height: 305px;
    }

    #container {
        display: flex;
        flex-direction: column;
    }

    #help {
        grid-area: help;
    }

    #grid {
        width: 100vw;
        height: 100vh;
        display: grid;
        grid-template-areas:
            "graph cards"
            "screen cards";
        grid-template-columns: 1fr var(--term-width);
        grid-template-rows: 1fr var(--term-height);
    }

    #graph,
    #screen,
    #help,
    #serial,
    #objects {
        overflow: auto;
    }

    #graph {
        grid-area: graph;
        background: peachpuff;
    }

    #cards {
        grid-area: cards;
        background: lightblue;
    }

    #screen {
        grid-area: screen;
        font-family: Iosevka;
    }

    #serial {
        grid-area: serial;
        background: deepskyblue;
        color: black;
        padding: 0.5em;
        white-space: pre;
    }

    #objects {
        grid-area: objects;
        background: mediumaquamarine;
        color: black;
        white-space: pre;
    }
</style>
