<script lang="ts">
    import {t} from "svelte-i18n-lingui"
    import {AchievementTracker} from "./achievements.ts"

    export let tracker: AchievementTracker
</script>

<div id="wrapper">
    <ul>
        {#each tracker.achievementProgresses as progress}
            <li class:fullfilled={progress.progress >= progress.target}>
                {progress.achievement.description}: {progress.progress}/{progress.target}
            </li>
        {/each}
    </ul>
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
</style>
