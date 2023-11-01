<script lang="ts">
    import {t} from "svelte-i18n-lingui"
    import {Battle, LogType} from "./cards.ts"

    export let battle: Battle
</script>

<div id="wrapper">
    <ul>
        {#each [...battle.eventLog].reverse() as [message, type]}
            <li class:error={type == LogType.Error}>{message}</li>
        {/each}
    </ul>
</div>

<style>
    #wrapper {
        background: lightgrey;
        padding: 0.5em;
    }
    ul {
        list-style: none;
        padding: 0;
        margin: 0;
    }
    li {
        padding: 0.2em 0.5em;
    }
    li:nth-child(odd) {
        background: rgba(255, 255, 255, 0.5);
    }
    .error {
        background: red !important;
        color: white;
    }
</style>
