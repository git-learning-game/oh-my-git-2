<script lang="ts">
    import {onMount} from "svelte"
    import {createEventDispatcher} from "svelte"
    let dispatch = createEventDispatcher()

    export let name: string
    export let content: string
    export let editable = false

    let fontSize = 150

    $: {
        if (content.length > 30) {
            fontSize = 80
        } else if (content.length > 20) {
            fontSize = 100
        }
    }

    let textArea: HTMLTextAreaElement
    onMount(() => {
        console.log(`I got content: '${content}'`)
        textAreaAdjust(textArea)
    })

    function textAreaAdjust(element: HTMLTextAreaElement) {
        element.style.height = "1px"
        element.style.height = element.scrollHeight + "px"
        console.log(element.style.height)
    }

    function mandatoryLineBreakAtEnd(text: string) {
        return text.endsWith("\n") ? text : text + "\n"
    }
</script>

<div id="wrapper" on:click>
    <textarea
        bind:value={content}
        bind:this={textArea}
        id="content"
        style="--font-size: {fontSize}%"
        readonly={!editable}
        on:input={(e) => textAreaAdjust(e.target)}
        on:blur={() =>
            dispatch("edited", {
                name,
                content: mandatoryLineBreakAtEnd(content),
            })}
    />
    <div id="name">{name}</div>
</div>

<style>
    #wrapper {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        width: 10em;
    }

    #content {
        border-radius: 0.5rem;
        padding: 0.5em;
        margin: 0.5em;
        margin-bottom: 0.2em;
        width: 100%;
        background-color: #f0f0f0;
        display: flex;
        flex-grow: 1;
        font-size: var(--font-size);
        font-family: var(--code-font);
        white-space: pre-wrap;
        overflow-wrap: anywhere;
        color: black;
        border-width: 0;
        resize: none;
    }

    #name {
        font-size: 1.1em;
    }
</style>
