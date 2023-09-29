<script lang="ts">
    import {Repository} from "./repository.ts"
    import {Graph} from "./graph.ts"

    let repo: Repository

    let graphDiv: HTMLDivElement

    let graph: Graph

    export const setRepo = (newRepo: Repository) => {
        repo = newRepo
        graph = new Graph(repo, graphDiv)
    }

    export const update = () => {
        graph.update()
    }

    export let refreshing = true
    export const setRefreshing = (newRefreshing: boolean) => {
        refreshing = newRefreshing
    }
</script>

<div id="graph" bind:this={graphDiv}>
    {#if refreshing}
        <div id="refreshing">Refreshing...</div>
    {/if}
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
</style>
