<script lang="ts">
    import {GitRef, GitTree, GitBlob} from "./repository.ts"
    import {CreatureCard, Card} from "./cards.ts"
    import CardSvelte from "./Card.svelte"
    import {Repository} from "./repository.ts"
    import Head from "./Head.svelte"

    export let ref: GitRef
    export let repo: Repository
    export let head: boolean = false

    let name: string

    $: {
        if (ref && repo) {
            name = ref.id().split("/").pop() as string
        }
    }
</script>

<div class="ref" class:tag={ref.id().startsWith("refs/tags")}>
    <h2>{name}</h2>
    {#if head}
        <Head />
    {/if}
</div>

<style>
    h2 {
        color: white;
        text-align: center;
    }
    .ref {
        font-size: 70%;
        background: #225cba;
        padding: 1em;
        border-radius: 1em;
        position: relative;
    }
    .tag {
        background: green;
    }
</style>
