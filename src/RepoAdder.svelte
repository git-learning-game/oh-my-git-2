<script lang="ts">
    import {createEventDispatcher} from "svelte"
    // when add, emit addRepo event
    const dispatch = createEventDispatcher()

    let path = ""
    let bare = false

    function add() {
        dispatch("addRepo", {path: `/tmp/${path}`, bare})
        path = ""
    }

    function keydown(event: KeyboardEvent) {
        if (event.key === "Enter") {
            add()
        }
    }
</script>

<div id="wrapper">
    /tmp/<input
        type="text"
        bind:value={path}
        placeholder="Path"
        on:keydown={keydown}
    />
    <input type="checkbox" bind:checked={bare} />bare?
    <button on:click={add}>Add</button>
</div>

<style>
    #wrapper {
        display: flex;
        gap: 0.5em;
    }
</style>
