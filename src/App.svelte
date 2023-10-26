<script lang="ts">
    import {onMount} from "svelte"
    import LanguageSwitcher from "./LanguageSwitcher.svelte"
    import DecisionSvelte from "./Decision.svelte"
    import BattleSvelte from "./Battle.svelte"
    import {GitShell} from "./gitshell.ts"

    import {Battle, Adventure, Decision} from "./cards.ts"

    let shell: GitShell
    let adventure: Adventure

    onMount(() => {
        shell = new GitShell()
        ;(window as any)["shell"] = shell

        shell.boot().then(() => {
            adventure = new Adventure((a) => {
                // The next event was entered!
                adventure = adventure
                console.log("The next event was entered:", a)
            })
        })
    })

    function decisionMade(event) {
        if (adventure.state instanceof Decision) {
            adventure.state.choose(event.detail)
            adventure = adventure
        } else {
            throw new Error("decisionMade called when not in a decision state")
        }
    }
</script>

<div id="container">
    <LanguageSwitcher />
    {#if adventure}
        {#if adventure.state instanceof Battle}
            <BattleSvelte battle={adventure.state} {shell} />
        {:else if adventure.state instanceof Decision}
            <DecisionSvelte
                choices={adventure.state.choices}
                deck={adventure.deck}
                on:choice={decisionMade}
            />
        {/if}
    {:else}
        Starting game...
    {/if}
</div>
