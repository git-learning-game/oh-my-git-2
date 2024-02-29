<script lang="ts">
    import LanguageSwitcher from "./LanguageSwitcher.svelte"
</script>

<div id="menu">
    <h1>Oh My Git 2.0</h1>
    <h2>
        by <a href="https://bleeptrack.de" _target="blank">bleeptrack</a> &
        <a href="https://blinry.org" _target="blank">blinry</a>
    </h2>
    <span class="filler"></span>
    <a href="https://github.com/git-learning-game/oh-my-git-2" _target="blank"
        >GitHub</a
    >
    <LanguageSwitcher />
</div>

<style>
    #menu {
        background: grey;
        display: flex;
        align-items: center;
        gap: 1em;
    }
    #menu * {
        font-size: 1.3rem;
        color: black;
    }
    #menu h1 {
        margin-left: 0.5em;
    }
    .filler {
        flex: 1;
    }
    a {
        text-decoration: none;
        color: #244a87 !important;
    }
    a:hover {
        text-decoration: underline;
    }
</style>
