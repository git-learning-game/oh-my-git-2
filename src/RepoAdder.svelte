<script lang="ts">
    import {createEventDispatcher} from "svelte"
    // when add, emit addRepo event
    const dispatch = createEventDispatcher()

    let path = ""
    let bare = false

    function add() {
        let goodPath = path.trim()
        if (goodPath === "") {
            // random string, 4 symbols
            goodPath = Math.random().toString(36).substring(2, 6)
        }
        dispatch("addRepo", {path: `/tmp/${goodPath}`, bare})
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
        placeholder="name (optional)"
        on:keydown={keydown}
    />
    <input type="checkbox" bind:checked={bare} />bare?
    <button on:click={add}>Add</button>
</div>

<style>
    #wrapper {
        display: flex;
        gap: 0.5em;
        background: #ffe6c4;
    }
</style>
