<script lang="ts">
    import {onMount} from "svelte"
    import {Repository, GitCommit, GitObject, GitRef} from "./repository.ts"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()

    import Commit from "./Commit.svelte"
    import Ref from "./Ref.svelte"

    export let repo: Repository

    let commits: GitCommit[] = []
    let refs: GitRef[] = []
    $: if (repo) {
        commits = []
        Object.values(repo.objects).forEach((object) => {
            if (object instanceof GitCommit) {
                commits.push(object)
            }
        })
        refs = []
        Object.values(repo.refs).forEach((ref) => {
            refs.push(ref)
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

<div id="graph">
    <div id="topdown">
        <div id="refs">
            {#each refs as ref}
                <div
                    class="ref"
                    on:dragover={(e) => e.preventDefault()}
                    on:drop={drop}
                    on:click={click}
                    data-id={ref.id()}
                >
                    <Ref {ref} {repo} />
                </div>
            {/each}
        </div>
        <div id="commits">
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
    </div>
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
        overflow: auto;
    }
    #topdown {
        display: flex;
        flex-direction: column;
        gap: 1em;
    }
    #commits,
    #refs {
        display: flex;
        align-items: center;
        gap: 1em;
    }
    /* hack so that parent receives events */
    :global(.commit *, .ref *) {
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
