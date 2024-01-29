import {cloneDeep} from "lodash"
import * as YAML from "yaml"
import {gt, gPlural} from "svelte-i18n-lingui"

export abstract class Card {
    constructor(
        public id: CardID,
        public energy: number,
        public emoji?: string,
    ) {}

    abstract getTitle(): string

    abstract getDescription(): string
}

export class CommandCard extends Card {
    constructor(
        id: CardID,
        energy: number,
        public description: string,
        public command: Command,
        emoji?: string,
    ) {
        super(id, energy, emoji)
    }

    getTitle(): string {
        return (allCards()[this.id] as CommandCard).command.template
    }

    getDescription(): string {
        return (allCards()[this.id] as CommandCard).description
    }
}

export class EffectCard extends Card {
    constructor(
        id: CardID,
        energy: number,
        public name: string,
        public effect: Effect,
        emoji?: string,
    ) {
        super(id, energy, emoji)
    }

    getTitle(): string {
        return (allCards()[this.id] as EffectCard).name
    }

    getDescription(): string {
        let description = this.effect.getDescription()
        return description.charAt(0).toUpperCase() + description.slice(1) + "."
    }
}

class Placeholder {
    constructor(
        public onResolveCallback: (
            placeholder: Placeholder,
            value: string,
        ) => void,
    ) {}

    resolve(value: string) {
        console.log(this)
        this.onResolveCallback(this, value)
    }
}

export class FreeStringPlaceholder extends Placeholder {}

export class FilePlaceholder extends Placeholder {}

export class RefPlaceholder extends Placeholder {}

const placeholderTypes: Record<string, typeof Placeholder> = {
    STRING: FreeStringPlaceholder,
    REF: RefPlaceholder,
    FILE: FilePlaceholder,
}

class Command {
    placeholders: Placeholder[]
    onResolveCallback: (command: Command) => void = () => {
        console.log("default callback")
    }

    constructor(public template: string) {
        this.placeholders = []
        let regex = new RegExp(Object.keys(placeholderTypes).join("|"), "g")
        template.match(regex)?.forEach((word) => {
            if (Object.keys(placeholderTypes).includes(word)) {
                this.placeholders.push(
                    new placeholderTypes[word](this.fulfill.bind(this)),
                )
            }
        })
    }

    fulfill(placeholder: Placeholder, value: string) {
        console.log(`Fulfilling placeholder`, placeholder, `with ${value}`)
        console.log(placeholder)
        // TODO: Make more elegant
        /*
        if (placeholder instanceof FreeStringPlaceholder) {
            this.template = this.template.replace("STRING", value)
        } else if (placeholder instanceof RefPlaceholder) {
            this.template = this.template.replace("REF", value)
        } else if (placeholder instanceof FilePlaceholder) {
            this.template = this.template.replace("FILE", value)
        } else {
            throw new Error(`Unknown placeholder type: ${placeholder}`)
        }
        */
        this.template = this.template.replace(/(STRING|REF|FILE)/, value)

        // Remove placeholder, as it is now resolved.
        this.placeholders.shift()

        console.log(this.placeholders)
        if (this.placeholders.length === 0) {
            console.log(
                `All placeholders resolved, resolving command: ${this.template}`,
            )
            this.onResolveCallback(this)
        }
    }
}

enum Trigger {
    Played,
    Dies,
}

class CardSource {
    constructor(
        public player: boolean,
        public card: Card,
    ) {}
    sourceDescription(): string {
        return this.card.getTitle()
    }
}

abstract class Effect {
    constructor() {}
    abstract getDescription(): string
    abstract apply(battle: Battle, source: CardSource): Promise<void>
}

export enum CardID {
    Joker = "Joker",
    Touch = "Touch",
    Add = "Add",
    AddAll = "AddAll",
    Remove = "Remove",
    Restore = "Restore",
    RestoreAll = "RestoreAll",
    RestoreS = "RestoreS",
    RestoreStaged = "RestoreStaged",
    RestoreStagedS = "RestoreStagedS",
    Commit = "Commit",
    CommitAll = "CommitAll",
    Copy = "Copy",
    Move = "Move",
    GitMove = "GitMove",
    Branch = "Branch",
    Tag = "Tag",
    Switch = "Switch",
    SwitchDetach = "SwitchDetach",
    //Checkout = "Checkout",
    Stash = "Stash",
    StashPop = "StashPop",
    Merge = "Merge",
}

function allCards(): Record<CardID, Card> {
    return {
        //new CommandCard(gt`Init`, 0, new Command("git init")),
        [CardID.Touch]: new CommandCard(
            CardID.Touch,
            0,
            gt`Create an empty file in the working directory.`,
            new Command("touch STRING"),
        ),
        [CardID.Joker]: new CommandCard(
            CardID.Joker,
            4,
            gt`Joker! Run an arbitrary command.`,
            new Command("STRING"),
            "🃏",
        ),
        [CardID.Add]: new CommandCard(
            CardID.Add,
            1,
            gt`Copy a card from the working directory to the index.`,
            new Command("git add FILE"),
        ),
        [CardID.AddAll]: new CommandCard(
            CardID.AddAll,
            2,
            gt`Copy all cards from the working directory to the index.`,
            new Command("git add ."),
        ),
        [CardID.Remove]: new CommandCard(
            CardID.Remove,
            0,
            gt`Remove a card in the working directory.`,
            new Command("rm FILE"),
        ),
        [CardID.Restore]: new CommandCard(
            CardID.Restore,
            2,
            gt`Copy a card from the index to the working directory.`,
            new Command("git restore FILE"),
        ),
        [CardID.RestoreAll]: new CommandCard(
            CardID.RestoreAll,
            3,
            gt`Copy all cards from the index to the working directory.`,
            new Command("git restore ."),
        ),
        [CardID.RestoreS]: new CommandCard(
            CardID.RestoreS,
            2,
            gt`Copy a card from the specified commit to the working directory.`,
            new Command("git restore -s REF FILE"),
        ),
        [CardID.RestoreStaged]: new CommandCard(
            CardID.RestoreStaged,
            2,
            gt`Copy a card from the HEAD commit to the index.`,
            new Command("git restore --staged FILE"),
        ),
        [CardID.RestoreStagedS]: new CommandCard(
            CardID.RestoreStagedS,
            2,
            gt`Copy a card from the specified commit to the index.`,
            new Command("git restore --staged -s REF FILE"),
        ),
        [CardID.Commit]: new CommandCard(
            CardID.Commit,
            2,
            gt`Commit`,
            new Command("git commit -m 'Commit'"),
        ),
        [CardID.CommitAll]: new CommandCard(
            CardID.CommitAll,
            3,
            gt`Commit all`,
            new Command("git add .; git commit -m 'Commit'"),
        ),
        [CardID.Copy]: new CommandCard(
            CardID.Copy,
            3,
            gt`Copy a card from one working directory file to another.`,
            new Command("cp FILE FILE"),
        ),
        [CardID.Move]: new CommandCard(
            CardID.Move,
            3,
            gt`Move a card from one working directory file to another.`,
            new Command("mv FILE STRING"),
        ),
        [CardID.GitMove]: new CommandCard(
            CardID.GitMove,
            3,
            gt`Move a card from one file to another in both the working directory and index.`,
            new Command("git mv FILE FILE"),
        ),
        [CardID.Stash]: new CommandCard(
            CardID.Stash,
            1,
            gt`Convert working directory and index into stash commits. Then, reset them to the HEAD commit.`,
            new Command("git stash -u"),
        ),
        [CardID.StashPop]: new CommandCard(
            CardID.StashPop,
            0,
            gt`Merge the last working directory stash commit into the working directory.`,
            new Command("git stash pop"),
        ),
        [CardID.Branch]: new CommandCard(
            CardID.Branch,
            0,
            gt`Create a new branch at the HEAD commit.`,
            new Command("git branch $RANDOM"),
        ),
        [CardID.Tag]: new CommandCard(
            CardID.Tag,
            0,
            gt`Create a new tag at the HEAD commit.`,
            new Command("git tag $RANDOM"),
        ),
        [CardID.Switch]: new CommandCard(
            CardID.Switch,
            1,
            gt`Set HEAD to a branch, and reset the working directory and index to that commit.`,
            new Command("git switch -f REF"),
        ),
        [CardID.SwitchDetach]: new CommandCard(
            CardID.SwitchDetach,
            1,
            gt`Set HEAD to a commit, and reset the working directory and index to that commit.`,
            new Command("git switch -f --detach REF"),
        ),
        /*[CardID.Checkout]: new CommandCard(
            CardID.Checkout,
            1,
            gt`Checkout`,
            new Command("git checkout -f REF"),
        ),*/
        [CardID.Merge]: new CommandCard(
            CardID.Merge,
            2,
            gt`Merge the specified commit into the current HEAD commit, and set index and working directory to the result. Does nothing if the specified commit is already an ancestor of HEAD.`,
            new Command("git merge REF"),
        ),
    }
}

function randomCardID(): CardID {
    const enumValues = Object.values(allCards())
    return randomPick(enumValues).id
}

function randomCard(): Card {
    return buildCard(randomCardID())
}

export function buildCard(id: CardID): Card {
    return cloneDeep(allCards()[id])
}

function randomPick<T>(array: T[], clone = false): T {
    const thing = array[Math.floor(Math.random() * array.length)]
    if (clone) {
        return cloneDeep(thing)
    } else {
        return thing
    }
}

// https://stackoverflow.com/a/12646864/248734
function shuffle(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
    }
}

export class SideEffect {}

export class CommandSideEffect extends SideEffect {
    constructor(public command: string) {
        super()
    }
}

export class SyncGameToDiskSideEffect extends SideEffect {}

export class BattleUpdatedSideEffect extends SideEffect {}

// Hm.
export class Win {}

type AdventureState = Battle | Decision | Adventure | Win

//I'm going on an adventure!
export class Adventure {
    deck: Card[] = []
    //battle: Battle
    state: AdventureState | null

    path: AdventureEvent[]
    currentEvent: AdventureEvent | null = null

    constructor(public onNextEvent: (e: AdventureState | null) => void) {
        let cards: CardID[] = []

        this.deck = cards.map((id) => buildCard(id))

        //let deckSize = 15
        //for (let i = 0; i < deckSize; i++) {
        //    this.deck.push(randomCard())
        //}

        //for (let card of Object.values(allCards())) {
        //  this.deck.push(cloneDeep(card))
        //}

        this.path = [new BattleEvent()]

        this.state = this
    }

    openPath() {
        this.state = this
        this.onNextEvent(this.state)
    }

    enterNextEvent() {
        if (this.currentEvent === null) {
            this.currentEvent = this.path[0]
            this.enterEvent(this.currentEvent)
        } else {
            if (this.currentEvent === this.path[this.path.length - 1]) {
                alert("You are a beautiful aweome person and you win!")
                return
            }
            this.enterEvent(this.path[this.path.indexOf(this.currentEvent) + 1])
        }
    }

    enterEvent(event: AdventureEvent) {
        this.currentEvent = event
        if (this.currentEvent instanceof BattleEvent) {
            this.state = new Battle(this.deck, (won) => {
                if (won) {
                    this.openPath()
                } else {
                    alert("GAME OVER")
                }
            })
        } else if (this.currentEvent instanceof CardRemovalEvent) {
            this.startCardRemovalEvent()
        } else if (this.currentEvent instanceof WinEvent) {
            this.state = new Win()
        } else {
            throw new Error(`Unknown event type: ${this.currentEvent}`)
        }
        this.onNextEvent(this.state)
    }

    startCardRemovalEvent() {
        this.state = new Decision(
            gt`You may remove a card from your deck!`,
            this.deck.map((card) => [card]),
            (cards) => {
                this.deck = this.deck.filter((c) => !cards.includes(c))
                this.openPath()
            },
        )
    }
}

export class Decision {
    constructor(
        public message: string,
        public choices: Card[][],
        public onChoice: (cards: Card[]) => void,
    ) {}

    choose(cards: Card[]) {
        this.onChoice(cards)
    }
}

export class AdventureEvent {}

export class BattleEvent extends AdventureEvent {
    constructor() {
        super()
    }
}

export class NewCardEvent extends AdventureEvent {
    constructor() {
        super()
    }
}

export class CardRemovalEvent extends AdventureEvent {
    constructor() {
        super()
    }
}

export class WinEvent extends AdventureEvent {
    constructor() {
        super()
    }
}

export class BattleState {}

export class PlayerTurnState extends BattleState {}

export class WaitingState extends BattleState {}

export class RequirePlaceholderState extends BattleState {
    constructor(public placeholders: Placeholder[]) {
        super()
    }

    currentPlaceholder(): Placeholder {
        return this.placeholders[0]
    }

    resolveNext(value: string) {
        this.currentPlaceholder().resolve(value)
    }
}

export type CommandResult = {
    exit_code: number
    output: string
}

export enum LogType {
    Normal,
    Error,
}

export class Battle {
    state: BattleState
    onSideeffectCallback: (sideEffect: SideEffect) => Promise<void> =
        async () => {}
    onHiddenCommandCallback:
        | undefined
        | ((command: string) => Promise<CommandResult>)

    eventLog: [string, LogType][] = []

    health = 20
    energy = 10
    maxEnergy = 1

    enemyHealth = 20

    drawPile: Card[] = []
    hand: Card[] = []
    discardPile: Card[] = []
    activeCard?: Card

    constructor(
        deck: Card[],
        public onBattleFinished: (won: boolean) => void,
    ) {
        //for (let i = 0; i < deckSize; i++) {
        //    this.drawPile.push(randomPick(templates, true))
        //}
        for (let card of deck) {
            this.drawPile.push(card)
        }
        shuffle(this.drawPile)

        this.state = new PlayerTurnState()
    }

    async devSetup() {
        //this.slots[0] = buildCard(CardID.TimeSnail) as CreatureCard
        //this.slots[1] = buildCard(CardID.GraphGnome) as CreatureCard
        await this.sideeffect(new SyncGameToDiskSideEffect())
        console.log("sync done")
        console.log(await this.runHiddenCommand("ls"))
        await this.runCommand(
            new Command(
                "git commit --allow-empty -m 'Empty';git branch second;git add 1; git commit -m'Snail'; git tag test;git switch second;mv 2 1;git add 1; git commit -m'Gnome'",
            ),
        )
    }

    log(event: string, type: LogType = LogType.Normal) {
        this.eventLog.push([event, type])
    }

    onSideEffect(callback: (sideEffect: SideEffect) => Promise<void>) {
        this.onSideeffectCallback = callback
    }

    onHiddenCommand(callback: (command: string) => Promise<CommandResult>) {
        this.onHiddenCommandCallback = callback
    }

    async runHiddenCommand(command: string): Promise<CommandResult> {
        if (this.onHiddenCommandCallback) {
            this.state = new WaitingState()
            this.sideeffect(new BattleUpdatedSideEffect())
            let result = await this.onHiddenCommandCallback(command)
            this.state = new PlayerTurnState()
            this.sideeffect(new BattleUpdatedSideEffect())
            return result
        } else {
            throw new Error(`No hidden command callback set to run ${command}`)
        }
    }

    async sideeffect(sideEffect: SideEffect) {
        if (sideEffect instanceof CommandSideEffect) {
            this.log(gt`Running "${sideEffect.command}"`)
            let result = await this.runHiddenCommand(sideEffect.command)
            this.log(`Output was: ${result}`)
        } else {
            await this.onSideeffectCallback(sideEffect)
        }
    }

    async playCard(card: CommandCard) {
        this.activeCard = card

        let command = new Command(card.command.template)
        try {
            await this.runCommand(command)
            //this.energy -= card.energy
            this.log(gt`Played ${card.getTitle()}.`)
        } catch (_) {
            // Playing the card failed.
            this.activeCard = undefined
        }
    }

    runCommand(command: Command): Promise<CommandResult> {
        console.log("runCommand called", command)
        return new Promise((resolve, reject) => {
            command.onResolveCallback = async () => {
                this.log(gt`Running "${command.template}"`)
                let result = await this.runHiddenCommand(command.template)
                if (result.exit_code === 0) {
                    resolve(result)
                } else {
                    this.log(
                        gt`Command failed: ${result.output}`,
                        LogType.Error,
                    )
                    reject(result)
                }
                this.state = new PlayerTurnState()
            }
            if (command.placeholders.length === 0) {
                command.onResolveCallback(command)
            } else {
                this.state = new RequirePlaceholderState(command.placeholders)
                this.sideeffect(new BattleUpdatedSideEffect())
                console.log("set state to", this.state)
            }
        })
    }

    async autoCommit() {
        this.log(gt`Automatically creating a commit.`)
        try {
            await this.runCommand(
                new Command("git commit -m'Automatic commit'"),
            )
        } catch (_) {
            // Do nothing.
        }
    }

    cancelAction() {
        this.activeCard = undefined
        this.state = new PlayerTurnState()
    }

    discardHandCard(_: number) {
        // Don't discard cards for now.
        /*
        if (i < 0 || i >= this.hand.length) {
            throw new Error(`Invalid hand index: ${i}`)
        }
        if (this.activeCard === this.hand[i]) {
            this.activeCard = undefined
        }
        const card = this.hand.splice(i, 1)[0]
        this.discardPile.push(card)
        */
    }
}
