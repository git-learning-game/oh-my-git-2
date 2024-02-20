<script lang="ts">
    import {onMount} from "svelte"

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

    $: if (repo && graph) {
        update()
    }

    async function update() {
        console.log("updating")
        graph.update()
        updateFiles()
    }

    /*async function update() {
        console.log("update begin")
        if (graph) {
            graph.setRefreshing(true)
        }

        await repo.update()
        graph.update()

        console.log("repo update done, updating achievments")

        updateFiles()

        repo = repo

        if (graph) {
            graph.setRefreshing(false)
        }
    }*/

    function updateFiles() {
        console.log(repo)
        workingDirectory = []
        for (let entry of repo.workingDirectory.entries) {
            let content = ""
            console.log(entry)
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
            console.log("content", content)
            workingDirectory.push(new TextFile(entry.name, content))
        }
        workingDirectory.sort((a, b) => a.name.localeCompare(b.name))

        index = []
        for (let entry of repo.index.entries) {
            let blob = repo.objects[entry.oid]
            let content = ""
            console.log("blob is", blob)
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
    <div id="name">{repo.path}</div>
    <div id="graph">
        <Graph {repo} bind:this={graph} />
    </div>
    <div id="cards">
        <Cards {index} {workingDirectory} />
    </div>
</div>

<style>
    #wrapper {
        display: flex;
        position: relative;
    }
    #graph {
        flex: 1;
    }

    #cards {
        flex: 0.5;
    }
    #name {
        position: absolute;
        top: 5px;
        left: 5px;
    }
</style>
