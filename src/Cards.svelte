<script lang="ts">
    import {t} from "svelte-i18n-lingui"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()

    import {Battle, Card, CreatureCard} from "./cards.ts"
    import CardSvelte from "./Card.svelte"

    export let battle: Battle
    export let indexSlots: (CreatureCard | null)[] = []

    function drop(e: DragEvent, slotIndex: number) {
        console.log("drop", slotIndex)
        e.preventDefault()
        const cardIndex = parseInt(e.dataTransfer?.getData("text/plain") ?? "")
        if (cardIndex >= 0 && cardIndex < battle.hand.length) {
            dispatch("drag", {cardIndex, slotIndex})
        }
    }

    function clickSlot(e, index) {
        dispatch("clickSlot", {index})
    }
</script>

<div id="wrapper">
    {#if battle}
        <h2>{$t`Event log`}</h2>

        <div id="log">
            <ul>
                {#each [...battle.eventLog].reverse() as event}
                    <li>{event}</li>
                {/each}
            </ul>
        </div>

        <h2>{$t`Upcoming enemy cards`}</h2>

        <div class="cards">
            {#each battle.enemyUpcomingSlots as slot, index}
                <CardSvelte card={slot} />
            {/each}
        </div>

        <h2>{$t`Enemy cards`} ({$t`enemy health`}: {battle.enemyHealth})</h2>

        <div class="cards">
            {#each battle.enemySlots as slot, index}
                <CardSvelte card={slot} />
            {/each}
        </div>

        <h2>{$t`Working directory`}</h2>

        <div class="cards">
            {#each battle.slots as slot, index}
                <CardSvelte
                    card={slot}
                    {index}
                    on:dragover={(e) => e.preventDefault()}
                    on:drop={(e) => drop(e, index)}
                    on:click={(e) => clickSlot(e, index)}
                />
            {/each}
        </div>

        <h2>{$t`Index`}</h2>

        <div class="cards">
            {#each indexSlots as slot, index}
                <CardSvelte
                    card={slot}
                    {index}
                    on:dragover={(e) => e.preventDefault()}
                    on:drop={(e) => drop(e, index)}
                />
            {/each}
        </div>
    {/if}
</div>

<style>
    #wrapper {
        padding: 1em;
    }
    #log {
        height: 7em;
        overflow-y: scroll;
    }
    .cards {
        display: flex;
        flex-wrap: wrap;
    }
</style>
