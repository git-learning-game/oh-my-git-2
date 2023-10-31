<script lang="ts">
    import {GitCommit, GitTree, GitBlob} from "./repository.ts"
    import {CreatureCard, Card} from "./cards.ts"
    import CardSvelte from "./Card.svelte"
    import {Repository} from "./repository.ts"
    import * as YAML from "yaml"

    export let commit: GitCommit
    export let repo: Repository

    let cards: (Card | null)[] = [null, null, null]

    function parseCard(slot: string): CreatureCard | null {
        let tree = repo.resolve(commit.tree)
        if (tree !== undefined) {
            let entry = (tree as GitTree).entries.find(
                (entry) => entry.name === slot,
            )
            if (entry) {
                let blob = repo.resolve(entry.oid)
                if (blob !== undefined) {
                    let content = (blob as GitBlob).content
                    let card = CreatureCard.parse(content)
                    return card
                }
            }
        }
        return null
    }

    $: {
        if (commit && repo) {
            cards = [parseCard("1"), parseCard("2"), parseCard("3")]
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
    }
    .cards {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
        justify-content: center;
    }
</style>
