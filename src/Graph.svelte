<script lang="ts">
    import {onMount} from "svelte"
    import {Repository, GitCommit, GitObject} from "./repository.ts"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()

    import Commit from "./Commit.svelte"

    export let repo: Repository

    let graphDiv: HTMLDivElement

    let commits: GitCommit[] = []
    $: if (repo) {
        commits = []
        Object.values(repo.objects).forEach((object) => {
            if (object instanceof GitCommit) {
                commits.push(object)
            }
        })
    }

    export let refreshing: boolean
    export const setRefreshing = (newRefreshing: boolean) => {
        refreshing = newRefreshing
    }

    function drop(e: DragEvent) {
        e.preventDefault()
        let target = e.target as HTMLDivElement
        let id = target.dataset.id
        if (id) {
            let draggedId = e.dataTransfer?.getData("text/plain")
            dispatch("dragToNode", {node: id, cardIndex: draggedId})
        }
    }

    function click(e: MouseEvent) {
        console.log(e)
        let target = e.target as HTMLDivElement
        let id = target.dataset.id
        if (id) {
            console.log(id)
            dispatch("clickNode", {node: id})
        }
    }
</script>

<div id="graph" bind:this={graphDiv}>
    {#each commits as commit}
        <div
            class="commit"
            on:dragover={(e) => e.preventDefault()}
            on:drop={drop}
            on:click={click}
            data-id={commit.id()}
        >
            <Commit {commit} {repo} />
        </div>
    {/each}
    {#if refreshing}
        <div id="refreshing">Refreshing...</div>
    {/if}
</div>

<style>
    #graph {
        width: 100%;
        height: 100%;
        position: relative;
        padding: 1em;
        padding-top: 3em;
        display: flex;
        align-items: center;
        gap: 1em;
    }
    /* hack so that parent receives events */
    :global(.commit *) {
        pointer-events: none;
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
