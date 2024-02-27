<script lang="ts">
    import {onMount} from "svelte"
    import {t} from "svelte-i18n-lingui"

    import TerminalSvelte from "./Terminal.svelte"
    import Hand from "./Hand.svelte"
    import StateIndicator from "./StateIndicator.svelte"
    import Achievements from "./Achievements.svelte"
    import RepositorySvelte from "./Repository.svelte"
    import RepoAdder from "./RepoAdder.svelte"

    import {Terminal} from "linux-browser-shell"
    import {Repository, GitBlob} from "./repository.ts"
    import {
        AchievementTracker,
        Achievement,
        getAchievements,
        getCardCatalogs,
    } from "./achievements.ts"
    import {CardID, Card, CommandCard, buildCard} from "./cards.ts"

    import {
        Battle,
        SideEffect,
        CommandSideEffect,
        SyncGameToDiskSideEffect,
        BattleUpdatedSideEffect,
        PlayerTurnState,
        RequirePlaceholderState,
        FilePlaceholder,
    } from "./cards.ts"

    export let battle: Battle

    export let backgroundTerminal: Terminal
    export let foregroundTerminal: Terminal

    let repos: Repository[] = []

    let achievementTracker = new AchievementTracker(achievementCompleted)
    for (let achievement of Object.values(getAchievements())) {
        achievementTracker.add(achievement, 1)
    }

    let points = 0

    function achievementCompleted(achievement: Achievement) {
        updateAchievementVisibility()
        //popup(`🏆 You completed an achievement: ${achievement.description}`)
    }

    function hasActiveAchievement(): boolean {
        for (let progress of achievementTracker.achievementProgresses) {
            if (progress.visible && progress.progress < progress.target) {
                return true
            }
        }
        return false
    }

    function popup(message: string) {
        alert(message)
    }

    function nextUsefulCard(): CardID | null {
        for (let progress of achievementTracker.achievementProgresses) {
            for (let card of progress.achievement.requiredCards) {
                if (!battle.hand.map((c) => c.id).includes(card as CardID)) {
                    return card as CardID
                }
            }
        }
        return null
    }

    let indexSlots: (CreatureCard | null)[]

    onMount(async () => {
        const repoPath = "/tmp/default"
        const remoteRepoPath = "/tmp/remote"

        repos = []
        await addRepo(repoPath)
        //await createRepo(remoteRepoPath, true)
        await addRepo(remoteRepoPath)
        //await createRepo(remoteRepoPath)
        //await createRepo(remoteRepoPath)

        await backgroundTerminal.script([
            `cd ${repoPath}`,
            "git init",
            "echo hi > fu",
            "git add .",
            "git commit -m 'Initial commit'",

            //`git remote add origin ${remoteRepoPath}`,
            //"git push -u origin main",

            "git config --global protocol.file.allow always",
            `cd ${remoteRepoPath}`,
            "git init",
            "echo hehe > bar",
            "git add .",
            "git commit -m 'Initial commit in submodule'",
            `cd ${repoPath}`,
            `git submodule add ${remoteRepoPath}`,
            "git add .",
            "git commit -m 'Add submodule'",
        ])

        await addRepo(remoteRepoPath + "/.git/modules/remote", true)

        repos = repos

        //await this.putFile("/root/repo/.gitattributes", ["* merge=cardgame"])
        //await this.putFile("/root/.gitignore", [".gitattributes"])
        foregroundTerminal.send(`cd ${repoPath}\nclear\n`)
        foregroundTerminal.onUserCommand(() => {
            updateACoupleOfTimes()
        })

        await update()
        battle.onSideEffect(realizeEffect)

        // TODO: Not actually hidden anymore.
        battle.onHiddenCommand(runCommand)

        //await battle.devSetup()
    })

    async function update() {
        let beforeRepo = repos[0].clone()

        // call r.update asynchronously for each repo, and wait for all to finish, one after the other
        for (let repo of repos) {
            await repo.update()
        }

        console.log("updating done")
        repos = repos
        updateAchievements(beforeRepo)
    }

    function updateAchievements(beforeRepo: Repository) {
        let pointsBefore = achievementTracker.getPoints()
        achievementTracker.update(beforeRepo, repos[0])
        achievementTracker = achievementTracker
        points = achievementTracker.getPoints()

        let pointsAdded = points - pointsBefore

        updateAchievementVisibility()

        alertNewAchievements(pointsAdded)
    }

    function alertNewAchievements(pointsAdded: number) {
        for (let catalog of getCardCatalogs()) {
            if (points >= catalog.cost && points - pointsAdded < catalog.cost) {
                popup(`📔 You unlocked a new catalog: ${catalog.name}`)
            }
        }
    }

    function updateAchievementVisibility() {
        for (let progress of achievementTracker.achievementProgresses) {
            let possible = true
            let availableCardIDs = []
            for (let catalog of getCardCatalogs()) {
                if (points >= catalog.cost) {
                    availableCardIDs = availableCardIDs.concat(catalog.cards)
                }
            }
            for (let card of progress.achievement.requiredCards) {
                if (!availableCardIDs.includes(card as CardID)) {
                    possible = false
                }
            }
            if (possible) {
                progress.visible = true
            }
        }
    }

    function updateACoupleOfTimes() {
        setTimeout(async () => {
            await update()
        }, 500)
    }

    async function cardDrag(e: CustomEvent) {
        console.log("drag", e.detail)
        const slot = e.detail.slotIndex + 1
        battle.playCardFromHand(e.detail.cardIndex)
        if (battle.state instanceof RequirePlaceholderState) {
            battle.state.resolveNext(slot)
            battle = battle
        }
        //await realizeEffects(effects)
    }

    async function endTurn() {
        battle.endTurn()
        await syncGameToDisk()
        //await realizeEffects(effects)
        battle = battle
    }

    async function realizeEffect(effect: SideEffect) {
        if (effect instanceof CommandSideEffect) {
            backgroundTerminal.send(effect.command + "\n")
            updateACoupleOfTimes()
        } else if (effect instanceof SyncGameToDiskSideEffect) {
            await syncGameToDisk()
        } else if (effect instanceof BattleUpdatedSideEffect) {
            battle = battle
        } else {
            throw new Error("Unknown sideeffect type")
        }
        battle = battle
    }

    async function runCommand(
        command: string,
    ): Promise<{output: string; exit_code: number}> {
        console.log(`Running command: ${command}`)
        foregroundTerminal.send(command + "\n")
        //let result = await shell.run_with_exit_code(command)
        //console.log(`Command output: ${result.output}`)
        updateACoupleOfTimes()
        //return result
    }

    async function syncGameToDisk() {
        for (let [index, card] of battle.slots.entries()) {
            if (card) {
                await backgroundTerminal.putFile((index + 1).toString(), [
                    card.stringify(),
                ])
            } else {
                await backgroundTerminal.run(`rm -f ${index + 1}`)
            }
        }
        updateACoupleOfTimes()
    }

    async function playCard(e: CustomEvent) {
        let card: CommandCard = e.detail
        battle.playCard(card)
    }

    function clickFile(e: CustomEvent) {
        if (battle.state instanceof RequirePlaceholderState) {
            let file = e.detail.file
            let filename = file.name
            battle.state.resolveNext(filename)
            battle = battle
        }
        battle = battle
    }

    function clickNode(e: CustomEvent) {
        console.log("click event", e.detail)
        if (battle.state instanceof RequirePlaceholderState) {
            battle.state.resolveNext(e.detail.node)
            battle = battle
        }
        battle = battle
    }

    async function dragToNode(e: CustomEvent) {
        console.log("drag", e.detail)
        const node = e.detail.node
        await battle.playCardFromHand(e.detail.cardIndex)
        if (battle.state instanceof RequirePlaceholderState) {
            battle.state.resolveNext(node)
            console.log("battle state is now", battle.state)
            battle = battle
        }
        //await realizeEffects(effects)
    }

    function textEntered(e: CustomEvent) {
        if (battle.state instanceof RequirePlaceholderState) {
            battle.state.resolveNext(e.detail)
            battle = battle
        }
    }

    async function addRepo(path: string, bare = false, init = true) {
        console.log(`creating repo at ${path}`)
        await backgroundTerminal.script([
            //`rm -rf ${path}`,
            `mkdir -p ${path}`,
        ])

        if (init) {
            await backgroundTerminal.run(`cd ${path}`)
            if (bare) {
                await backgroundTerminal.run("git init --bare")
            } else {
                await backgroundTerminal.run("git init")
            }
        }

        repos.push(new Repository(path, backgroundTerminal, bare))
        repos = repos
    }

    function addRepoEvent(e: CustomEvent) {
        let path = e.detail.path
        let bare = e.detail.bare
        let init = e.detail.init
        addRepo(path, bare, init)
    }

    function deleteRepo(e: CustomEvent) {
        repos = repos.filter((r) => r !== e.detail)
        repos = repos
    }
</script>

<div id="state">
    <StateIndicator {battle} on:textEntered={textEntered} />
</div>

<div id="grid">
    <div id="repos">
        {#each repos as repo}
            <RepositorySvelte {repo} on:deleteRepo={deleteRepo} />
        {/each}
        <RepoAdder on:addRepo={addRepoEvent} />
    </div>
    <div id="log">
        <Achievements tracker={achievementTracker} />
    </div>
    <div id="screen">
        <TerminalSvelte terminal={foregroundTerminal} />
    </div>
    <!--<div id="hand">
        <Hand on:endTurn={endTurn} {battle} {points} on:playCard={playCard} />
    </div>-->
</div>

<style>
    :root {
        --term-width: 730px;
        --term-height: 305px;
    }

    #grid {
        flex: 1;
        display: grid;
        grid-template-columns: 2fr 1fr 30em;
        grid-template-rows: 2fr 1fr;
        grid-template-areas:
            "repos repos log"
            "repos repos screen";
        background: lightgreen;
        overflow: hidden;
    }

    #state {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        bottom: 14.3em;
        z-index: 999;
    }

    #screen {
        grid-area: screen;
        font-family: Iosevka;
    }

    #repos {
        grid-area: repos;
        display: flex;
        gap: 2px;
        flex-direction: column;
        overflow: hidden;
        background: black;
    }

    #log,
    #screen {
        flex: 1;
        overflow: auto;
    }
</style>
