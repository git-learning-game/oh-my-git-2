<script lang="ts">
    export let name: string
    export let content: string
</script>

<div id="wrapper">
    <div id="content">{content}</div>
    <div id="name">{name}</div>
</div>

<style>
    #wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 10em;
        height: 10em;
    }

    #content {
        border-radius: 0.5em;
        padding: 0.5em;
        margin: 0.5em;
        margin-bottom: 0.2em;
        width: 100%;
        background-color: #f0f0f0;
        flex: 1;
        display: flex;
        font-size: 1.5em;
        font-family: var(--code-font);
        white-space: pre-wrap;
        color: black;
    }

    #name {
        font-size: 1.1em;
    }
</style>
