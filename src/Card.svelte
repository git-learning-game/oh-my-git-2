<script lang="ts">
    import {Card, CreatureCard, CommandCard, EffectCard} from "./cards.ts"
    import EmojiNumber from "./EmojiNumber.svelte"
    import {t} from "svelte-i18n-lingui"
    import {fade} from "svelte/transition"
    import {send, receive} from "./transition.js"

    export let card: Card | null = null
    export let index: number | null = null
    export let playable = false
    export let clickable = false
    export let hand = false
    export let placeholderEmoji: string | null = null
    export let showCost = false
    export let active = false

    // Image preloader
    const dragImage = "/images/blob.png"
    new Image().src = dragImage

    // When language is switched, re-render card.
    $: $t, (card = card)

    let beingDragged = false
    let startDragOffsetX = 0
    let startDragOffsetY = 0

    function dragStart(e: DragEvent) {
        if (index != null && e.dataTransfer) {
            e.dataTransfer.setData("text/plain", index.toString())
            const img = new Image()
            //img.src = dragImage
            e.dataTransfer.setDragImage(img, 0, 0)
            beingDragged = true
            console.log("drag start")

            startDragOffsetX = e.clientX
            startDragOffsetY = e.clientY
        }
    }

    function drag(e: DragEvent) {
        if (e.target && e.target instanceof HTMLElement) {
            // Calculate position. x and y are relative to the elements regular position, and have the transformation applied to the screen be applied in reverse.
            const container = document.getElementById("container")!
            const containerTransform = container.style.transform
            // has the form translate(xpx, ypx) scale(s)
            let translation = containerTransform.match(
                /translate\((.*), (.*)\)/,
            )
            let scale = containerTransform.match(/scale\((.*)\)/)
            if (!translation || !scale) {
                console.error("Could not parse transform")
                return
            }
            let scaleValue = parseFloat(scale[1])
            let translationX = parseInt(translation[1])
            let translationY = parseInt(translation[2])

            // calculate transformed mouse position
            const mx = (e.clientX - translationX) / scaleValue
            const my = (e.clientY - translationY) / scaleValue

            const x =
                mx - startDragOffsetX / scaleValue + translationX / scaleValue
            const y =
                my - startDragOffsetY / scaleValue + translationY / scaleValue

            if (x && y) {
                e.target.style.left = `${x}px`
                e.target.style.top = `${y}px`
            }
        }
    }

    function dragEnd(e: DragEvent) {
        beingDragged = false
        console.log("drag end")

        let target = document.elementFromPoint(e.clientX, e.clientY)
        // walk up until we find a ancestor with the class "slot"
        while (target && !target.classList.contains("slot")) {
            target = target.parentElement
        }
        console.log(target)
        // trigger a proper drop event on the target
        if (target) {
            console.log(index)
            e.dataTransfer.setData("text/plain", index.toString())
            let dt = new DataTransfer()
            dt.setData("text/plain", index.toString())
            target.dispatchEvent(
                new DragEvent("drop", {
                    dataTransfer: dt,
                }),
            )
        }

        e.target.style.left = ""
        e.target.style.top = ""
    }

    function mouseup(e: MouseEvent) {
        console.log("mouseup")
    }

    let fontSize: number
    $: if (card) {
        if (card.getTitle().length > 15) {
            fontSize = 80
        } else if (card.getTitle().length > 10) {
            fontSize = 100
        } else {
            fontSize = 130
        }
    }

    let descriptionFontSize: number
    $: if (card) {
        if (card.getDescription().length > 130) {
            descriptionFontSize = 70
        } else if (card.getDescription().length > 100) {
            descriptionFontSize = 80
        } else {
            descriptionFontSize = 100
        }
    }
</script>

<svelte:body on:mouseup={mouseup} />

<div
    class="slot"
    draggable={playable}
    class:hand
    class:clickable
    class:active
    class:show-cost={showCost}
    class:dragged={beingDragged}
    on:dragstart={dragStart}
    on:dragend={dragEnd}
    on:drag={drag}
    on:dragover
    on:drop
    on:click
    on:keydown={(e) => {
        if (e.key === "Enter") {
            e.preventDefault()
            e.stopPropagation()
            e.target?.dispatchEvent(new MouseEvent("click"))
        }
    }}
    role="button"
    tabindex="0"
>
    {#if placeholderEmoji}
        <span class="placeholder">{placeholderEmoji}</span>
    {/if}
    {#if card}
        <div class="card" transition:fade={{duration: 100}} class:playable>
            {#if card.emoji}
                <span class="background">{card.emoji}</span>
            {/if}
            {#if showCost}
                <span class="emoji energy"
                    ><EmojiNumber number={card.energy} emoji="🔷" /></span
                >
            {/if}

            <div class="card-header" class:code={card instanceof CommandCard}>
                <div id="name" style="font-size: {fontSize}%">
                    {card.getTitle()}
                </div>
            </div>
            <div class="card-body" style="font-size: {descriptionFontSize}%">
                {card.getDescription()}
            </div>
            {#if card instanceof CreatureCard}
                <div class="attack">
                    <EmojiNumber
                        number={card.attack}
                        emoji={"⚔️"}
                        color="black"
                    />
                </div>
                <div class="health">
                    <EmojiNumber number={card.health} emoji={"🩸"} />
                </div>
            {/if}
        </div>
    {/if}
</div>

<style>
    .slot {
        width: 10em;
        height: 13em;
        background: #aaa;
        border-radius: 1em;
        display: inline-flex;
        flex-direction: column;
        position: relative;
        user-select: none;
    }
    .background {
        position: absolute;
        top: 0.2em;
        left: 0;
        width: 100%;
        height: 100%;
        font-size: 700%;
        opacity: 0.15;
        text-align: center;
    }
    .card {
        display: flex;
        flex-direction: column;
        background: white;
        color: black;
        position: relative;
        box-shadow: 0 0 0.5em rgba(0, 0, 0, 0.2);
        flex: 1;
        border-radius: 1em;
    }
    .energy {
        position: absolute;
        top: -0.8em;
        left: -0.5em;
        font-weight: bold;
    }
    .dragged {
        opacity: 0.5;
        z-index: 99;
    }
    .dragged .card {
        transform: scale(1.3) !important;
    }
    .hand .card,
    .hand {
        transition: transform 0.1s;
    }
    .card.playable:hover {
        transition-timing-function: ease-out;
        transform: scale(1.3);
        transform-origin: center bottom;
        z-index: 10;
    }
    .emoji {
        font-size: 150%;
    }
    #name {
        margin-left: 0.5rem;
    }
    .slot.show-cost .card-header #name {
        margin-left: 2rem;
    }
    .card-header {
        font-weight: bold;
        display: flex;
        align-items: center;
        margin-bottom: 1em;
        overflow-wrap: anywhere;
        min-height: 2em;
    }
    .card-header.code {
        background: #111;
        color: white;
        border-radius: 0.3em;
        margin: 0.2em;
        border-radius: 0.8em;
        padding: 0.1em 0.2em;
        font-family: var(--code-font);
    }
    #name {
        font-size: 150%;
    }
    .card.playable {
        border: solid #225cba 5px;
        cursor: move;
    }
    .clickable {
        cursor: pointer;
    }
    .active {
        transform: scale(1.1);
    }
    .attack,
    .health {
        position: absolute;
        bottom: -0.5em;
        font-size: 150%;
        font-weight: bold;
    }
    .attack {
        left: -0.5em;
    }
    .health {
        right: -0.5em;
    }
    .card-body {
        padding: 0.5em;
    }
    .placeholder {
        position: absolute;
        width: 100%;
        height: 100%;
        font-size: 600%;
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        filter: grayscale(100%);
        opacity: 0.5;
        z-index: -1;
    }
</style>
