<script lang="ts">
    import {GitCommit, GitTree, GitBlob} from "./repository.ts"
    import {Card} from "./cards.ts"
    import CardSvelte from "./Card.svelte"
    import Head from "./Head.svelte"
    import {Repository} from "./repository.ts"

    export let commit: GitCommit
    export let repo: Repository
    export let head = false

    let cards: (Card | null)[] = [null, null, null]

    $: {
        if (commit && repo) {
            cards = []
        }
    }
</script>

<div class="commit">
    <h2>{commit.id().substr(0, 8)}</h2>
    <div class="cards">
        {#each cards as card}
            <CardSvelte {card} />
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
