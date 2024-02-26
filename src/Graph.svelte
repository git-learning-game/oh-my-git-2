<script lang="ts">
    import {onMount} from "svelte"

    import {Repository} from "./repository.ts"
    import {Graph} from "./graph.ts"

    export let repo: Repository = null

    let graphDiv: HTMLDivElement

    let graph: Graph

    let showTreesAndBlobs = false
    let showIndexAndWD = false

    function createGraphIfPossible() {
        console.log("create graph if possible")
        console.log({repo, graph})
        if (!graph && repo) {
            console.log("create graph")
            graph = new Graph(repo, graphDiv)
            graph.update()
        }
    }

    $: if (repo && graphDiv) {
        createGraphIfPossible()
    }

    $: if (graph) {
        if (showIndexAndWD) {
            showTreesAndBlobs = true
        }

        graph.options.showTreesAndBlobs = showTreesAndBlobs
        graph.options.showIndexAndWD = showIndexAndWD
        update()
    }

    export const setRepo = (newRepo: Repository) => {
        console.log("set repo")
        repo = newRepo
        graph = new Graph(repo, graphDiv)
        update()
    }

    export const update = () => {
        if (graph) {
            console.log("update")
            graph.update()
        }
    }

    export let refreshing = false
    export const setRefreshing = (newRefreshing: boolean) => {
        refreshing = newRefreshing
    }

    onMount(() => {
        console.log("on mount")
        createGraphIfPossible()
    })
</script>

<div id="graph" bind:this={graphDiv}>
    {#if refreshing}
        <div id="refreshing">Refreshing...</div>
    {/if}
    <div id="options">
        <label>
            <input type="checkbox" bind:checked={showTreesAndBlobs} />
            Trees & blobs
        </label>
        {#if !repo.bare}
            <label>
                <input type="checkbox" bind:checked={showIndexAndWD} />
                Index & working directory
            </label>
        {/if}
    </div>
</div>

<style>
    #graph {
        width: 100%;
        height: 100%;
        position: relative;
    }
    #graph svg {
        font-family: Iosevka;
    }
    #refreshing {
        position: absolute;
        left: 1em;
        bottom: 1em;
        padding: 1em;
        border-radius: 1em;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
    }
    #options {
        position: absolute;
        right: 1em;
        top: 1em;
        padding: 1em;
        border-radius: 1em;
        background-color: rgba(0, 0, 0, 0.5);
        color: white;
    }
    #options label {
        display: block;
    }
</style>
