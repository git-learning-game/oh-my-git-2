<script lang="ts">
    import {onMount} from "svelte"

    import WebShell from "./web-shell.ts"
    import {Repository} from "./repository.ts"
    import {Graph} from "./graph.ts"

    // Show a warning when the user tries to leave the page (for example, by pressing Ctrl-W...)
    //window.onbeforeunload = function (e) {
    //    e.preventDefault()
    //    e.returnValue = ""
    //}

    let graphDiv: HTMLDivElement
    let screenDiv: HTMLDivElement
    let serialDiv: HTMLDivElement
    let objectsDiv: HTMLDivElement

    let shell: WebShell
    let repo: Repository
    let graph: Graph

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
        shell.type("source ~/.aliases\nclear\n")
    }

    async function runInitCommands() {
        await shell.script([
            "mkdir /root/repo",
            "cd /root/repo",

            "git init",

            "touch apple",
            "git add .",
            "git commit -m 'Apple exists'",
            "echo 'green' > apple",
            "git commit -am 'Apple is green'",
            "git checkout @^",
            "echo 'red' > apple",
            "git commit -am 'Apple is red'",
        ])
    }

    async function update() {
        await repo.update()
        let displayed = {
            files: repo.files,
            index: repo.index,
            objects: repo.objects,
            refs: repo.refs,
        }
        objectsDiv.innerText = JSON.stringify(displayed, null, 2)

        graph.update()
    }

    function updateACoupleOfTimes() {
        setTimeout(async () => {
            await update(), setTimeout(() => update(), 450)
        }, 50)
    }

    onMount(() => {
        shell = new WebShell(screenDiv, serialDiv)

        window["run"] = shell.run.bind(shell)
        window["shell"] = shell

        repo = new Repository("/root/repo", shell)

        graph = new Graph(repo, graphDiv)

        shell.boot().then(async () => {
            console.log("Booted!")
            await runConfigureCommands()
            await runLazynessCommands()
            await runInitCommands()

            shell.type("cd repo\nclear\n")

            updateACoupleOfTimes()

            window.addEventListener("keydown", (e) => {
                if (e.key == "Enter") {
                    updateACoupleOfTimes()
                }
            })
        })
    })
</script>

<div id="grid">
    <div id="graph" bind:this={graphDiv} />
    <div id="objects" bind:this={objectsDiv} />
    <div id="screen" bind:this={screenDiv} />
    <div id="serial" bind:this={serialDiv} />
</div>

<style>
    #grid {
        width: 100vw;
        height: 100vh;
        display: grid;
        grid-template-areas:
            "graph objects"
            "screen serial";
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr 1fr;
        grid-gap: 1px;
        height: 100vh;
    }

    #graph,
    #screen,
    #serial,
    #objects {
        background: black;
        color: white;
        font-family: monospace;
        overflow: auto;
    }

    #graph {
        grid-area: graph;
        background: peachpuff;
    }

    #screen {
        grid-area: screen;
        background: lightgreen;
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
