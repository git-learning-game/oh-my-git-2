<script lang="ts">
    import {t} from "svelte-i18n-lingui"
    import {AchievementTracker} from "./achievements.ts"
    import {createEventDispatcher} from "svelte"
    const dispatch = createEventDispatcher()

    export let tracker: AchievementTracker

    $: points = tracker.getPoints()
</script>

<div id="wrapper">
    <ul>
        {#each tracker.achievementProgresses as progress}
            <li
                class:fullfilled={progress.progress >= progress.target}
                class:peak={!progress.visible}
            >
                {progress.achievement.description}
            </li>
        {/each}
    </ul>
    {#if tracker.isComplete()}
        <button
            on:click={() => {
                dispatch("showDiploma")
            }}>Show Diploma</button
        >
    {:else}
        <br /><b>Complete all achievements to get your Git diploma!</b>
    {/if}
</div>

<style>
    #wrapper {
        background: lightgrey;
        padding: 0.5em;
        min-height: 100%;
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
    .fullfilled {
        background: darkgreen !important;
        color: white;
    }
    .peak {
        opacity: 0.35;
    }
</style>
