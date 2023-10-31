<script lang="ts">
    export let number: number
    export let emoji: string
    export let color = "white"

    let fontSize: number
    $: if (number > 9) {
        fontSize = 0.8
    } else {
        fontSize = 1.1
    }

    let topOffset: number
    $: if (emoji == "🩸") {
        topOffset = -0.1
    } else {
        topOffset = -0.3
    }
</script>

<div>
    <span class="emoji">{emoji}</span>
    <span class="number-wrapper">
        <span
            class="number"
            style="color: {color}; font-size: {fontSize}em; top: {topOffset}em"
            >{number}</span
        >
    </span>
</div>

<style>
    div {
        position: relative;
        display: inline-block;
    }
    .emoji {
        font-size: 1.5em;
        position: relative;
    }
    .number-wrapper {
        width: 1.05em;
        text-align: center;
        position: absolute;
        left: 0.4em;
        top: 0.65em;
    }
    .number {
        position: relative;
    }
</style>
