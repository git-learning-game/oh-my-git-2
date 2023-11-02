<script lang="ts">
    import {t} from "svelte-i18n-lingui"
    import {
        Adventure,
        AdventureEvent,
        BattleEvent,
        NewCardEvent,
        CardRemovalEvent,
        WinEvent,
    } from "./cards.ts"

    export let adventure: Adventure

    function isPickable(event: AdventureEvent) {
        //return true // hack!
        let indexOfCurrentEvent = adventure.path.indexOf(adventure.currentEvent)
        let indexOfEvent = adventure.path.indexOf(event)

        return indexOfEvent == indexOfCurrentEvent + 1
    }

    function click(event) {
        if (isPickable(event)) {
            adventure.enterEvent(event)
        }
    }
</script>

<div id="wrapper">
    <h1>Oh My Git 2.0</h1>
    <h2>{$t`Make it all the way to the end to get your Git diploma!`}</h2>
    <div id="path">
        {#each adventure.path as event}
            <div
                class="event"
                class:current={adventure.currentEvent == event}
                class:pickable={isPickable(event)}
                on:click={() => click(event)}
            >
                {#if adventure.currentEvent == event}
                    <div id="player">♟️</div>
                {/if}
                <div class="icon">
                    {#if event instanceof BattleEvent}
                        ⚔️
                    {:else if event instanceof NewCardEvent}
                        🃏
                    {:else if event instanceof CardRemovalEvent}
                        🗑️
                    {:else if event instanceof WinEvent}
                        🏆
                    {:else}
                        ❓
                    {/if}
                </div>
            </div>
        {/each}
    </div>
</div>

<style>
    #wrapper {
        display: flex;
        flex-direction: column;
        width: 100%;
        height: 100%;
    }
    h1,
    h2 {
        color: white;
        text-align: center;
    }
    h1 {
        font-size: 900%;
        margin-bottom: 0.2em;
        margin-top: 1em;
    }
    h2 {
        color: white;
        font-size: 400%;
        text-align: center;
        margin-bottom: 3em;
    }
    #path {
        display: flex;
        gap: 2em;
        justify-content: center;
        align-items: center;
        flex-wrap: wrap;
    }
    #player {
        position: absolute;
        top: -1.2em;
        left: 50%;
        transform: translateX(-50%);
        font-size: 500%;
    }
    .event {
        background: lightgrey;
        color: white;
        width: 6em;
        height: 6em;
        display: flex;
        justify-content: center;
        align-items: center;
        position: relative;
        border-radius: 50%;
    }
    .pickable {
        background: #3f7543;
        cursor: pointer;
        transition: transform 0.2s;
        transform: scale(1.2);
    }
    .pickable:hover {
        transform: scale(1.3);
    }
    .icon {
        font-size: 350%;
    }
</style>
