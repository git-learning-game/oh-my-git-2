<script lang="ts">
    import {onMount} from "svelte"
    import {t} from "svelte-i18n-lingui"

    import Terminal from "./Terminal.svelte"
    import Graph from "./Graph.svelte"
    import Cards from "./Cards.svelte"
    import Hand from "./Hand.svelte"
    import EventLog from "./EventLog.svelte"
    import StateIndicator from "./StateIndicator.svelte"
    import Achievements from "./Achievements.svelte"

    import {GitShell} from "./gitshell.ts"
    import {Repository, GitBlob} from "./repository.ts"
    import {
        AchievementTracker,
        Achievement,
        achievements,
    } from "./achievements.ts"
    import {CardID, buildCard} from "./cards.ts"

    import {
        Battle,
        CreatureCard,
        SideEffect,
        CommandSideEffect,
        SyncGameToDiskSideEffect,
        BattleUpdatedSideEffect,
        PlayerTurnState,
        RequirePlaceholderState,
        FreeStringPlaceholder,
        RefPlaceholder,
        SlotPlaceholder,
    } from "./cards.ts"

    export let battle: Battle
    export let shell: GitShell

    let repo: Repository
    let graph: Graph

    let achievementTracker = new AchievementTracker(achievementCompleted)
    for (let achievement of Object.values(achievements)) {
        achievementTracker.add(achievement, 3)
    }

    function achievementCompleted(achievement: Achievement) {
        while (!hasActiveAchievement()) {
            let cardID = nextUsefulCard()
            if (cardID !== null) {
                let card = buildCard(cardID)
                battle.hand.push(card)
                updateAchievementVisibility()
            } else {
                return
            }
        }
    }

    function hasActiveAchievement(): boolean {
        for (let progress of achievementTracker.achievementProgresses) {
            if (progress.visible && progress.progress < progress.target) {
                return true
            }
        }
        return false
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

    function keydown(e: KeyboardEvent) {
        if (shell.getKeyboardActive()) {
            if (e.key == "Enter") {
                updateACoupleOfTimes()
            }
        } else {
            if (e.key == "Enter") {
                if (battle.state instanceof PlayerTurnState) {
                    endTurn()
                }
            }
            if (e.key == "Escape") {
                battle.cancelAction()
                battle = battle
            }
            // if any number, play from hand, or resolve slot, depending on mode
            if (e.key.match(/^[1-9]$/)) {
                if (battle.state instanceof PlayerTurnState) {
                    battle.playCardFromHand(parseInt(e.key) - 1)
                    battle = battle
                } else if (battle.state instanceof RequirePlaceholderState) {
                    if (
                        battle.state.currentPlaceholder() instanceof
                        SlotPlaceholder
                    ) {
                        if (parseInt(e.key) > 3) {
                            return
                        }
                        battle.state.resolveNext(e.key)
                        battle = battle
                    }
                }
            }
        }
    }

    onMount(async () => {
        await shell.enterNewGitRepo()
        repo = new Repository("/root/repo", shell)
        await update()
        battle.onSideEffect(realizeEffect)
        battle.onHiddenCommand(runCommand)

        //await battle.devSetup()
    })

    async function update() {
        console.log("update begin")
        if (graph) {
            graph.setRefreshing(true)
        }

        let beforeRepo = repo.clone()
        await repo.update()
        console.log("repo update done, updating achievments")
        updateAchievements(beforeRepo)

        syncDiskToGame()
        repo = repo
        //graph.update()
        if (graph) {
            graph.setRefreshing(false)
        }
    }

    function updateAchievements(beforeRepo: Repository) {
        achievementTracker.update(beforeRepo, repo)
        achievementTracker = achievementTracker

        updateAchievementVisibility()
    }

    function updateAchievementVisibility() {
        for (let progress of achievementTracker.achievementProgresses) {
            let possible = true
            let cardIDsInHand = battle.hand.map((c) => c.id)
            for (let card of progress.achievement.requiredCards) {
                if (!cardIDsInHand.includes(card as CardID)) {
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
            shell.type(effect.command + "\n")
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
        let result = await shell.run_with_exit_code(command)
        console.log(`Command output: ${result.output}`)
        updateACoupleOfTimes()
        return result
    }

    async function syncGameToDisk() {
        for (let [index, card] of battle.slots.entries()) {
            if (card) {
                await shell.putFile((index + 1).toString(), [card.stringify()])
            } else {
                await shell.run(`rm -f ${index + 1}`)
            }
        }
        updateACoupleOfTimes()
    }

    function syncDiskToGame() {
        battle.slots = [null, null, null]
        for (let entry of repo.workingDirectory.entries) {
            let content = ""
            if (entry.oid) {
                let blob = repo.objects[entry.oid]
                if (blob instanceof GitBlob) {
                    content = blob.content
                } else {
                    throw new Error("Requested OID is not a blob")
                }
            } else {
                content = repo.files[entry.name].content
            }

            if (["1", "2", "3"].includes(entry.name)) {
                battle.slots[parseInt(entry.name) - 1] =
                    CreatureCard.parse(content)
            }
        }

        indexSlots = [null, null, null]
        for (let entry of repo.index.entries) {
            let blob = repo.objects[entry.oid]
            let content = ""
            if (blob instanceof GitBlob) {
                content = blob.content
            } else {
                throw new Error("Requested OID is not a blob")
            }
            if (["1", "2", "3"].includes(entry.name)) {
                indexSlots[parseInt(entry.name) - 1] =
                    CreatureCard.parse(content)
            }
        }

        battle = battle
    }

    async function playCard(e: CustomEvent) {
        await battle.playCardFromHand(e.detail.index)
        battle = battle
    }

    function clickSlot(e: CustomEvent) {
        if (battle.state instanceof RequirePlaceholderState) {
            battle.state.resolveNext(e.detail.index + 1)
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
</script>

<div id="state">
    <StateIndicator {battle} on:textEntered={textEntered} />
</div>

<svelte:window on:keydown={keydown} />

<div id="topdown">
    <div id="columns">
        <div id="left">
            <div id="graph">
                <Graph
                    {repo}
                    bind:this={graph}
                    on:clickNode={clickNode}
                    on:dragToNode={dragToNode}
                />
            </div>
        </div>
        <div id="cards">
            <Cards
                on:clickSlot={clickSlot}
                on:drag={cardDrag}
                on:endTurn={endTurn}
                {battle}
                {indexSlots}
            />
        </div>
        <div id="right">
            <div id="log">
                <Achievements tracker={achievementTracker} />
            </div>

            <div id="screen">
                <Terminal {shell} />
            </div>
        </div>
    </div>
    <div id="hand">
        <Hand on:endTurn={endTurn} {battle} on:playCard={playCard} />
    </div>
</div>

<style>
    :root {
        --term-width: 730px;
        --term-height: 305px;
    }

    #state {
        position: absolute;
        left: 50%;
        transform: translateX(-50%);
        bottom: 14.3em;
        z-index: 999;
    }

    #topdown {
        display: flex;
        flex-direction: column;
        height: 100%;
        background: #f0e2b9;
    }

    #columns {
        width: 100%;
        display: flex;
        flex: 1;
        overflow: auto;
    }

    #graph {
        flex: 1;
        overflow: auto;
        width: 36em;
    }

    #cards {
        width: 48em;
        overflow: auto;
    }

    #right,
    #left {
        flex: 1;
        display: flex;
        flex-direction: column;
    }

    #screen {
        font-family: Iosevka;
    }

    #log,
    #screen {
        flex: 1;
        overflow: auto;
    }
</style>
