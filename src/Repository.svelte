<script lang="ts">
    import {onMount} from "svelte"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()

    import Graph from "./Graph.svelte"
    import Cards from "./Cards.svelte"
    import {Repository, GitBlob} from "./repository.ts"
    import {TextFile} from "./files.ts"

    export let repo: Repository

    let graph: Graph

    let index: TextFile[] = []
    let workingDirectory: TextFile[] = []

    onMount(() => {
        update()
    })

    $: if (repo) {
        update()
    }

    async function update() {
        graph?.update()
        updateFiles()
    }

    function updateFiles() {
        workingDirectory = []
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
            workingDirectory.push(new TextFile(entry.name, content))
        }
        workingDirectory.sort((a, b) => a.name.localeCompare(b.name))

        index = []
        for (let entry of repo.index.entries) {
            let blob = repo.objects[entry.oid]
            let content = ""
            if (blob instanceof GitBlob) {
                content = blob.content
            } else {
                content = `(object ${entry.oid.substr(
                    0,
                    4,
                )} not found in current repo)`
            }
            index.push(new TextFile(entry.name, content))
        }
        index.sort((a, b) => a.name.localeCompare(b.name))
    }
</script>

<div id="wrapper">
    <div
        id="name"
        on:click={() => {
            dispatch("swapDir", repo.path)
        }}
    >
        {repo.path}
        {#if repo.bare}(bare){/if}
    </div>
    {#if repo.empty}
        <div id="message">(not initialized)</div>
    {:else}
        <div id="graph">
            <Graph {repo} bind:this={graph} on:clickNode />
        </div>
    {/if}
    <div id="cards">
        <Cards {index} {workingDirectory} on:edited />
    </div>
    <div id="delete">
        <button on:click={() => dispatch("deleteRepo", repo)}>❌</button>
    </div>
</div>

<style>
    #wrapper {
        flex: 1;
        display: flex;
        position: relative;
        min-width: 0;
        overflow: hidden;
        background: #ffe6c4;
    }
    #graph {
        flex: 1;
        overflow: hidden;
        display: flex;
    }
    :global(#graph svg) {
        height: 100%;
        width: 100%;
    }
    #message {
        flex: 1;
        justify-self: center;
        align-self: center;
        text-align: center;
        font-style: italic;
    }
    #cards {
        display: flex;
    }
    #name {
        position: absolute;
        top: 5px;
        left: 5px;
        z-index: 10;
        cursor: pointer;
    }
    #delete {
        position: absolute;
        top: 5px;
        right: 5px;
    }
</style>
