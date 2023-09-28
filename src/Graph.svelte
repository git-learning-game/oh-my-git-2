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
</script>

<div bind:this={graphDiv} />
