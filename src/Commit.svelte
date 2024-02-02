<script lang="ts">
    import {GitCommit, GitTree, GitBlob} from "./repository.ts"
    import {Card} from "./cards.ts"
    import FileSvelte from "./File.svelte"
    import Head from "./Head.svelte"
    import {Repository} from "./repository.ts"
    import {TextFile} from "./files.ts"

    export let commit: GitCommit
    export let repo: Repository
    export let head = false

    let files: TextFile[] = []

    $: {
        if (commit && repo) {
            let tree = repo.objects[commit.tree]
            if (!(tree instanceof GitTree)) {
                throw new Error("Expected tree")
            }
            tree.entries.forEach((entry) => {
                let blob = repo.objects[entry.oid]
                if (!(blob instanceof GitBlob)) {
                    throw new Error("Expected blob")
                }
                files.push(new TextFile(entry.name, blob.content))
            })
            files.sort((a, b) => a.name.localeCompare(b.name))
        }
    }
</script>

<div class="commit">
    <h2>{commit.id().substr(0, 8)}</h2>
    <div class="cards">
        {#each files as file}
            <FileSvelte name={file.name} content={file.content} />
        {/each}
    </div>
    {#if head}
        <Head />
    {/if}
</div>

<style>
    h2 {
        text-align: center;
        margin-top: -0.5em;
    }
    .commit {
        font-size: 70%;
        background: #cacc41;
        padding: 1em;
        border-radius: 1em;
        position: relative;
    }
    .cards {
        display: flex;
        flex-direction: column;
        gap: 1em;
        justify-content: center;
    }
</style>
