<script lang="ts">
    import {GitRef, GitTree, GitBlob} from "./repository.ts"
    import {CreatureCard, Card} from "./cards.ts"
    import CardSvelte from "./Card.svelte"
    import {Repository} from "./repository.ts"

    export let ref: GitRef
    export let repo: Repository

    let name: string

    $: {
        if (ref && repo) {
            name = ref.id().split("/").pop() as string
        }
    }
</script>

<div class="ref">
    <h2>{name}</h2>
</div>

<style>
    h2 {
        color: white;
        text-align: center;
    }
    .ref {
        font-size: 70%;
        background: blue;
        padding: 1em;
        border-radius: 1em;
    }
</style>
