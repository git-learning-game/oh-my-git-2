<script lang="ts">
    import {t} from "svelte-i18n-lingui"
    import {Battle} from "./cards.ts"

    export let battle: Battle
</script>

<h2>{$t`Event log`}</h2>

<div id="log">
    <ul>
        {#each [...battle.eventLog].reverse() as event}
            <li>{event}</li>
        {/each}
    </ul>
</div>

<style>
    #log {
        overflow: auto;
        height: 200px;
    }
</style>
