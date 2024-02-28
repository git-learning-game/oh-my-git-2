<script lang="ts">
    import {onMount} from "svelte"

    import {Repository} from "./repository.ts"
    import {Graph} from "./graph.ts"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()

    export let repo: Repository = null

    let graphDiv: HTMLDivElement

    let graph: Graph

    let showTreesAndBlobs = false
    let showIndexAndWD = false

    function createGraphIfPossible() {
        if (!graph && repo) {
            graph = new Graph(repo, graphDiv)
            graph.update()
            graph.onClickNode = function (id) {
                dispatch("clickNode", id)
            }
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
        repo = newRepo
        graph = new Graph(repo, graphDiv)
        update()
    }

    export const update = () => {
        if (graph) {
            graph.update()
        }
    }

    onMount(() => {
        createGraphIfPossible()
    })
</script>

<div id="graph" bind:this={graphDiv}>
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
        position: relative;
        overflow: hidden;
        display: flex;
        flex: 1;
    }
    :global(#graph svg) {
        flex: 1;
        height: 100%;
        width: 100%;
        font-family: Iosevka;
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
