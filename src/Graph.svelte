<script lang="ts">
    import {onMount} from "svelte"
    import {Repository, GitCommit, GitObject, GitRef} from "./repository.ts"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()

    import Commit from "./Commit.svelte"
    import Ref from "./Ref.svelte"

    export let repo: Repository

    type CommitWithRefs = {
        commit: GitCommit
        refs: GitRef[]
    }

    let head = ""
    let slots: CommitWithRefs[] = []
    let graph

    $: if (repo) {
        slots = []
        Object.values(repo.objects).forEach((object) => {
            if (object instanceof GitCommit) {
                slots.push({commit: object, refs: []})
            }
        })
        Object.values(repo.refs).forEach((ref) => {
            if (ref.id() === "HEAD") {
                head = ref.target
            } else {
                // Target is (probably?) a commit.
                let slot = slots.find((slot) => slot.commit.id() === ref.target)
                if (slot) {
                    slot.refs.push(ref)
                }
            }
        })
        // scroll to the right
        if (graph) {
            graph.scrollLeft = graph.scrollWidth
        }
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
            let lastPartOfID = id.split("/").pop()
            dispatch("clickNode", {node: lastPartOfID})
        }
    }
</script>

<div id="graph" bind:this={graph}>
    {#each slots as slot}
        {@const commit = slot.commit}
        <div id="topdown">
            <div class="refs">
                {#each slot.refs as ref}
                    <div
                        class="ref"
                        on:dragover={(e) => e.preventDefault()}
                        on:drop={drop}
                        on:click={click}
                        data-id={ref.id()}
                        role="button"
                        tabindex="0"
                        on:keydown={(e) => {
                            if (e.key === "Enter") {
                                e.preventDefault()
                                e.stopPropagation()
                                e.target?.dispatchEvent(new MouseEvent("click"))
                            }
                        }}
                    >
                        <Ref {ref} {repo} head={head == ref.id()} />
                    </div>
                {/each}
            </div>
            <div
                class="commit"
                on:dragover={(e) => e.preventDefault()}
                on:drop={drop}
                on:click={click}
                data-id={commit.id()}
                role="button"
                tabindex="0"
                on:keydown={(e) => {
                    if (e.key === "Enter") {
                        e.preventDefault()
                        e.stopPropagation()
                        e.target?.dispatchEvent(new MouseEvent("click"))
                    }
                }}
            >
                <Commit {commit} {repo} head={head == commit.id()} />
            </div>
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
        overflow: auto;
        display: flex;
        align-items: end;
        padding-bottom: 3em;
        gap: 1em;
    }
    #topdown {
        display: flex;
        flex-direction: column;
        gap: 1em;
    }
    /* hack so that parent receives events */
    :global(.commit *, .ref *) {
        pointer-events: none;
    }
    .refs {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
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
