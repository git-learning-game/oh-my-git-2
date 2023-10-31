<script lang="ts">
    import {t} from "svelte-i18n-lingui"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()

    import {
        Battle,
        PlayerTurnState,
        RequirePlaceholderState,
        FreeStringPlaceholder,
        RefPlaceholder,
        SlotPlaceholder,
    } from "./cards.ts"

    export let battle: Battle
    let stateMessage: string
    let inputText: string

    $: {
        if (battle.state instanceof PlayerTurnState) {
            stateMessage = $t`Your turn`
        } else if (battle.state instanceof RequirePlaceholderState) {
            let currentPlaceholder = battle.state.currentPlaceholder()
            if (currentPlaceholder instanceof SlotPlaceholder) {
                stateMessage = $t`Select slot`
            } else if (currentPlaceholder instanceof RefPlaceholder) {
                stateMessage = $t`Select ref`
            } else if (currentPlaceholder instanceof FreeStringPlaceholder) {
                stateMessage = $t`Enter text: `
            } else {
                stateMessage = $t`Unknown placeholder`
            }
        } else {
            stateMessage = $t`Unknown state :(`
        }
    }
</script>

<h1>
    {stateMessage}
    {#if battle.state instanceof RequirePlaceholderState && battle.state.currentPlaceholder() instanceof FreeStringPlaceholder}
        <input
            type="text"
            bind:value={inputText}
            on:keydown={(e) => {
                if (e.key === "Enter") {
                    dispatch("textEntered", inputText)
                    inputText = ""
                }
            }}
        />
    {/if}
</h1>
