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
        console.log(`from ${cardIndex} to ${slotIndex}`)
        if (cardIndex >= 0 && cardIndex < battle.hand.length) {
            dispatch("drag", {cardIndex, slotIndex})
        }
    }

    function clickSlot(_: MouseEvent, index: number) {
        dispatch("clickSlot", {index})
    }
</script>

<div id="wrapper">
    {#if battle}
        <div class="group">
            <!--<h2>{$t`Upcoming enemy cards`}</h2>-->

            <div class="cards">
                {#each battle.enemyUpcomingSlots as slot}
                    <CardSvelte card={slot} />
                {/each}
            </div>
        </div>

        <div id="arena">
            <div class="group">
                <!--<h2>
                {$t`Enemy cards`} ({$t`enemy health`}: {battle.enemyHealth})
            </h2>-->

                <div class="cards">
                    {#each battle.enemySlots as slot}
                        <CardSvelte card={slot} />
                    {/each}
                </div>
            </div>

            <div id="separator">⚡</div>

            <div class="group">
                <!--<h2>{$t`Working directory`}</h2>-->

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
            </div>
        </div>

        <div class="group">
            <!--<h2>{$t`Index`}</h2>-->

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
        </div>
    {/if}
</div>

<style>
    #wrapper {
        padding: 1em;
        display: flex;
        flex-direction: row-reverse;
        align-items: center;
        justify-content: center;
    }
    .group {
    }
    .cards {
        display: flex;
        flex-direction: column;
        gap: 0.5em;
    }
    #arena {
        background: #225cba;
        padding: 0.5em;
        border-radius: 1.5em;
        color: white;
        display: flex;
        flex-direction: row-reverse;
        margin: -0.5em 0.5em;
    }
    h2 {
        margin-left: 1em;
    }
    #separator {
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        font-size: 150%;
    }

    #separator::before,
    #separator::after {
        content: "";
        flex: 1;
        border-left: 3px solid white;
    }

    #separator:not(:empty)::before {
        margin-bottom: 0.25em;
    }

    #separator:not(:empty)::after {
        margin-top: 0.25em;
    }
</style>
