<script lang="ts">
    import {t} from "svelte-i18n-lingui"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()

    import {
        Battle,
        PlayerTurnState,
        WaitingState,
        RequirePlaceholderState,
        FreeStringPlaceholder,
        RefPlaceholder,
        SlotPlaceholder,
    } from "./cards.ts"

    export let battle: Battle
    let stateMessage: string
    let inputText: string
    let input: HTMLInputElement
    let showInput = false

    $: {
        showInput = false
        if (battle.state instanceof PlayerTurnState) {
            stateMessage = ""
        } else if (battle.state instanceof WaitingState) {
            stateMessage = $t`Waiting...`
        } else if (battle.state instanceof RequirePlaceholderState) {
            console.log("cur pl", battle.state.currentPlaceholder())
            let currentPlaceholder = battle.state.currentPlaceholder()
            if (currentPlaceholder instanceof SlotPlaceholder) {
                stateMessage = $t`Select slot`
            } else if (currentPlaceholder instanceof RefPlaceholder) {
                stateMessage = $t`Select ref`
            } else if (currentPlaceholder instanceof FreeStringPlaceholder) {
                stateMessage = $t`Enter text: `
                showInput = true
                setTimeout(() => {
                    input.focus()
                }, 0.1)
            } else {
                stateMessage = $t`Unknown placeholder`
            }
        } else {
            stateMessage = $t`Unknown state :(`
        }
    }
</script>

{#if stateMessage != ""}
    <div>
        <span>{stateMessage}</span>
        <input
            type="text"
            bind:value={inputText}
            bind:this={input}
            style="display: {showInput ? 'inline' : 'none'}"
            on:keydown={(e) => {
                if (e.key === "Enter") {
                    dispatch("textEntered", inputText)
                    inputText = ""
                }
            }}
        />
    </div>
{/if}

<style>
    div {
        font-size: 180%;
        font-family: var(--title-font);
        background: #227a38;
        padding: 0.1em 0.3em;
        color: white;
        border-radius: 0.5em;
        z-index: 100;
    }
    span {
        font-weight: bold;
    }
    input {
        border: none;
        border-radius: 99em;
        padding: 0.1em 0.5em;
        font-weight: normal;
    }
</style>
