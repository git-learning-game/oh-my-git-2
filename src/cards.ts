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

export class CreatureCard extends Card {
    effects: [Trigger, Effect][] = []

    constructor(
        id: CardID,
        energy: number,
        public name: string,
        public attack: number,
        public health: number,
        emoji?: string,
    ) {
        super(id, energy, emoji)
    }

    stringify(): string {
        return YAML.stringify({
            id: this.id,
            energy: this.energy,
            attack: this.attack,
            health: this.health,
        })
    }

    static parse(content: string) {
        let result = YAML.parse(content)

        let name = result.id as CardID

        let card = cloneDeep(allCards()[name]) as CreatureCard

        if (result.energy) {
            card.energy = result.energy
        }
        if (result.attack) {
            card.attack = result.attack
        }
        if (result.health) {
            card.health = result.health
        }

        return card
    }

    getTitle(): string {
        return (allCards()[this.id] as CreatureCard).name
    }

    getDescription(): string {
        const triggerDescriptions: Record<Trigger, string> = {
            [Trigger.Played]: gt`when this card is played`,
            [Trigger.Dies]: gt`when this card dies`,
        }

        let description = ""
        for (let [trigger, effect] of this.effects) {
            let newEffect = `${
                triggerDescriptions[trigger]
            }, ${effect.getDescription()}.`
            description +=
                newEffect.charAt(0).toUpperCase() + newEffect.slice(1)
        }
        return description
    }

    addEffect(trigger: Trigger, effect: Effect): CreatureCard {
        this.effects.push([trigger, effect])
        return this
    }

    async triggerEffects(battle: Battle, trigger: Trigger, source: CardSource) {
        for (let [t, effect] of this.effects) {
            if (t === trigger) {
                await effect.apply(battle, source)
            }
        }
    }
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

export class SlotPlaceholder extends Placeholder {}

export class RefPlaceholder extends Placeholder {}

const placeholderTypes: Record<string, typeof Placeholder> = {
    STRING: FreeStringPlaceholder,
    REF: RefPlaceholder,
    SLOT: SlotPlaceholder,
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
        } else if (placeholder instanceof SlotPlaceholder) {
            this.template = this.template.replace("SLOT", value)
        } else {
            throw new Error(`Unknown placeholder type: ${placeholder}`)
        }
        */
        this.template = this.template.replace(/(STRING|REF|SLOT)/, value)

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

async function evalNumber(
    value: NumericValue,
    battle: Battle,
): Promise<number> {
    if (typeof value === "number") {
        return value
    } else {
        let result = await value.eval(battle)
        console.log(`Evaluated ${value} to ${result}`)
        return result
    }
}

function describeNumber(value: NumericValue): string {
    if (typeof value === "number") {
        return `${value}`
    } else {
        let result = value.getDescription()
        return result
    }
}

abstract class Effect {
    constructor() {}
    abstract getDescription(): string
    abstract apply(battle: Battle, source: CardSource): Promise<void>

    describeAmount(value: NumericValue, unit?: string): string {
        if (typeof value === "number") {
            if (unit === undefined) {
                return `${value}`
            } else {
                return `${value} ${unit}`
            }
        } else {
            if (unit === undefined) {
                return value.getDescription()
            } else {
                return gt`${unit} equal to ${value.getDescription()}`
            }
        }
    }
}

class HealPlayerEffect extends Effect {
    constructor(public amount: NumericValue) {
        super()
    }

    getDescription(): string {
        return gt`heal yourself by ${this.describeAmount(this.amount)}`
    }

    async apply(battle: Battle, _source: CardSource) {
        let amount = await evalNumber(this.amount, battle)
        battle.log(gt`Healed for ${amount}`)
        battle.health += amount
    }
}

class GainEnergyEffect extends Effect {
    constructor(public amount: NumericValue) {
        super()
    }

    getDescription(): string {
        return gt`gain ${this.describeAmount(this.amount, gt`energy`)}`
    }

    async apply(battle: Battle, _source: CardSource) {
        let amount = await evalNumber(this.amount, battle)
        battle.log(gt`Gain ${amount} energy`)
        battle.energy += amount
    }
}

class CommandEffect extends Effect {
    constructor(public command: Command) {
        super()
    }

    getDescription(): string {
        return gt`run "${this.command.template}"`
    }

    async apply(battle: Battle, _source: CardSource) {
        try {
            await battle.runCommand(this.command)
        } catch (_) {}
    }
}

class AddCardToHandEffect extends Effect {
    constructor(public cardID: CardID) {
        super()
    }

    getDescription(): string {
        return gt`add a ${allCards()[this.cardID].getTitle()} to your hand`
    }

    async apply(battle: Battle, source: CardSource) {
        if (source.player) {
            battle.hand.push(buildCard(this.cardID))
            battle.log(
                gt`Added a ${allCards()[this.cardID].getTitle()} to your hand.`,
            )
        }
    }
}

class DeleteRandomEnemyEffect extends Effect {
    constructor() {
        super()
    }

    getDescription(): string {
        return gt`delete a random enemy`
    }

    async apply(battle: Battle, source: CardSource) {
        console.log("source", source)

        let targetSideCreatures = source.player
            ? battle.enemySlots
            : battle.slots

        let slotsWithCreature = (targetSideCreatures as CreatureCard[])
            .map((card, i) => [card, i])
            .filter((card) => card[0] !== null)
        if (slotsWithCreature.length > 0) {
            let slotToDelete = randomPick(slotsWithCreature)[1] as number
            battle.kill(!source.player, slotToDelete, source)
        }
    }
}

class DrawCardEffect extends Effect {
    constructor(public count: number) {
        super()
    }

    getDescription(): string {
        return gPlural(this.count, {
            one: "draw a card",
            other: "draw # cards",
        })
    }

    async apply(battle: Battle, source: CardSource) {
        if (source.player) {
            for (let i = 0; i < this.count; i++) {
                battle.drawCard()
            }
        }
    }
}

class GiveSelfEffect extends Effect {
    constructor(
        public attack: NumericValue,
        public health: NumericValue,
    ) {
        super()
    }

    getDescription(): string {
        let description = []
        if (typeof this.attack !== "number" || this.attack !== 0) {
            description.push(
                gt`increase its own attack by ${this.describeAmount(
                    this.attack,
                )}`,
            )
        }
        if (typeof this.health !== "number" || this.health !== 0) {
            description.push(
                gt`increase its own health by ${this.describeAmount(
                    this.health,
                )}`,
            )
        }
        return description.join(gt` and `)
    }

    async apply(battle: Battle, source: CardSource) {
        let a = await evalNumber(this.attack, battle)
        let h = await evalNumber(this.health, battle)
        let card = source.card as CreatureCard
        card.attack += a
        card.health += h
        battle.log(`${source.sourceDescription()} increased by +${a}/${h}.`)
    }
}

class GiveFriendsEffect extends Effect {
    constructor(
        public attack: NumericValue,
        public health: NumericValue,
    ) {
        super()
    }

    getDescription(): string {
        return gt`give all allies +${this.describeAmount(
            this.attack,
        )}/${this.describeAmount(this.health)}`
    }

    async apply(battle: Battle, source: CardSource) {
        let targetSideCreatures = source.player
            ? battle.slots
            : battle.enemySlots
        for (let i = 0; i < targetSideCreatures.length; i++) {
            let card = targetSideCreatures[i]
            if (card) {
                let attackEval = await evalNumber(this.attack, battle)
                let healthEval = await evalNumber(this.health, battle)
                card.attack += attackEval
                card.health += healthEval
                battle.log(
                    `${source.sourceDescription()} gave ${card.getTitle()} +${attackEval}/${healthEval}.`,
                )
            }
        }
    }
}

abstract class DynamicNumericValue {
    abstract eval(battle: Battle): Promise<number>

    abstract getDescription(): string
}

class DynamicGitValue extends DynamicNumericValue {
    constructor(public type: DynamicValueType) {
        super()
    }

    async eval(battle: Battle): Promise<number> {
        return await battle.evaluateDynamicValue(this.type)
    }

    getDescription(): string {
        let descriptions = {
            [DynamicValueType.TagCount]: gt`the number of tags in your repository`,
            [DynamicValueType.CommitCount]: gt`the number of commits in your repository`,
            [DynamicValueType.BranchLength]: gt`the length of the current branch`,
            [DynamicValueType.BranchCount]: gt`the number of branches in your repository`,
        }
        return descriptions[this.type]
    }
}

class DynamicSubtraction extends DynamicNumericValue {
    constructor(
        public value1: NumericValue,
        public value2: NumericValue,
    ) {
        super()
    }

    async eval(battle: Battle): Promise<number> {
        let evaluatedValue1 = await evalNumber(this.value1, battle)
        let evaluatedValue2 = await evalNumber(this.value2, battle)
        return evaluatedValue1 - evaluatedValue2
    }

    getDescription(): string {
        return gt`${describeNumber(this.value1)} minus ${describeNumber(
            this.value2,
        )}`
    }
}

enum DynamicValueType {
    TagCount,
    CommitCount,
    BranchLength,
    BranchCount,
}

type NumericValue = number | DynamicNumericValue

enum CardID {
    TimeSnail = "TimeSnail",
    RepoRaven = "RepoRaven",
    GraphGnome = "GraphGnome",
    BlobEater = "BlobEater",
    CloneWarrior = "CloneWarrior",
    MergeMonster = "MergeMonster",
    DetachedHead = "DetachedHead",
    RubberDuck = "RubberDuck",
    CollabCentaur = "CollabCentaur",
    TagTroll = "TagTroll",
    Joker = "Joker",
    Add = "Add",
    AddAll = "AddAll",
    Remove = "Remove",
    Restore = "Restore",
    RestoreAll = "RestoreAll",
    RestoreS = "RestoreS",
    RestoreStaged = "RestoreStaged",
    RestoreStagedS = "RestoreStagedS",
    //Commit = "Commit",
    //CommitAll = "CommitAll",
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
    HealthPotion = "HealthPotion",
    DrawCard = "DrawCard",
    Bandaid = "Bandaid",
    Inspiration = "Inspiration",
}

function allCards(): Record<CardID, Card> {
    return {
        [CardID.GraphGnome]: new CreatureCard(
            CardID.GraphGnome,
            3,
            gt`Graph Gnome`,
            1,
            4,
            "👺",
        ).addEffect(
            Trigger.Played,
            new GiveSelfEffect(
                new DynamicGitValue(DynamicValueType.CommitCount),
                0,
            ),
        ),
        [CardID.BlobEater]: new CreatureCard(
            CardID.BlobEater,
            4,
            gt`Blob Eater`,
            2,
            6,
            "🐡",
        ).addEffect(Trigger.Played, new DeleteRandomEnemyEffect()),
        [CardID.TimeSnail]: new CreatureCard(
            CardID.TimeSnail,
            1,
            gt`Time Snail`,
            1,
            1,
            "🐌",
        ),
        [CardID.RepoRaven]: new CreatureCard(
            CardID.RepoRaven,
            2,
            gt`Repo Raven`,
            2,
            2,
            "🐦",
        ),
        [CardID.CloneWarrior]: new CreatureCard(
            CardID.CloneWarrior,
            4,
            gt`Clone Warrior`,
            2,
            5,
            "🪖",
        ).addEffect(Trigger.Dies, new AddCardToHandEffect(CardID.TimeSnail)),
        [CardID.MergeMonster]: new CreatureCard(
            CardID.MergeMonster,
            4,
            gt`Merge Monster`,
            8,
            8,
            "🧌",
        ),
        [CardID.DetachedHead]: new CreatureCard(
            CardID.DetachedHead,
            1,
            gt`Detached Head`,
            0,
            3,
            "👤",
        ),
        [CardID.RubberDuck]: new CreatureCard(
            CardID.RubberDuck,
            1,
            gt`Rubber Duck`,
            1,
            1,
            "🦆",
        ).addEffect(Trigger.Played, new DrawCardEffect(1)),
        [CardID.CollabCentaur]: new CreatureCard(
            CardID.CollabCentaur,
            3,
            gt`Collab Centaur`,
            2,
            2,
            "🐴",
        ).addEffect(Trigger.Played, new GiveFriendsEffect(1, 1)),
        [CardID.TagTroll]: new CreatureCard(
            CardID.TagTroll,
            3,
            gt`Tag Troll`,
            5,
            1,
            "👿",
        ).addEffect(
            Trigger.Played,
            new CommandEffect(new Command("git tag $RANDOM")),
        ),
        //new CommandCard(gt`Init`, 0, new Command("git init")),
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
            new Command("git add SLOT"),
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
            new Command("rm SLOT"),
        ),
        [CardID.Restore]: new CommandCard(
            CardID.Restore,
            2,
            gt`Copy a card from the index to the working directory.`,
            new Command("git restore SLOT"),
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
            new Command("git restore -s REF SLOT"),
        ),
        [CardID.RestoreStaged]: new CommandCard(
            CardID.RestoreStaged,
            2,
            gt`Copy a card from the HEAD commit to the index.`,
            new Command("git restore --staged SLOT"),
        ),
        [CardID.RestoreStagedS]: new CommandCard(
            CardID.RestoreStagedS,
            2,
            gt`Copy a card from the specified commit to the index.`,
            new Command("git restore --staged -s REF SLOT"),
        ),
        /*
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
        */
        [CardID.Copy]: new CommandCard(
            CardID.Copy,
            3,
            gt`Copy a card from one working directory slot to another.`,
            new Command("cp SLOT SLOT"),
        ),
        [CardID.Move]: new CommandCard(
            CardID.Move,
            3,
            gt`Move a card from one working directory slot to another.`,
            new Command("mv SLOT SLOT"),
        ),
        [CardID.GitMove]: new CommandCard(
            CardID.GitMove,
            3,
            gt`Move a card from one slot to another in both the working directory and index.`,
            new Command("git mv SLOT SLOT"),
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
        //[CardID.HealthPotion]: new CommandCard(
        //    CardID.HealthPotion,
        //    gt`Health potion`,
        //    1,
        //    new Command(
        //        `slot=SLOT; health=$(cat $slot | grep health | cut -d':' -f2); health=$((health+2)); sed -i "s/health: .*/health: $health/" $slot`,
        //    ),
        //),
        [CardID.HealthPotion]: new EffectCard(
            CardID.HealthPotion,
            2,
            gt`Health potion`,
            new GiveFriendsEffect(
                0,
                new DynamicSubtraction(
                    5,
                    new DynamicGitValue(DynamicValueType.BranchLength),
                ),
            ),
            "🧪",
        ),
        [CardID.DrawCard]: new EffectCard(
            CardID.DrawCard,
            1,
            gt`Library`,
            new DrawCardEffect(2),
            "📚",
        ),
        [CardID.Bandaid]: new EffectCard(
            CardID.Bandaid,
            1,
            gt`Bandaid`,
            new HealPlayerEffect(
                new DynamicGitValue(DynamicValueType.TagCount),
            ),
            "🩹",
        ),
        [CardID.Inspiration]: new EffectCard(
            CardID.Inspiration,
            0,
            gt`Inspiration`,
            new GainEnergyEffect(
                new DynamicGitValue(DynamicValueType.BranchCount),
            ),
            "💡",
        ),
    }
}

function randomCardID(): CardID {
    const enumValues = Object.values(allCards())
    return randomPick(enumValues).id
}

function randomCreatureCardID(): CardID {
    // TODO: Make more elegant...
    let options = [
        CardID.GraphGnome,
        CardID.BlobEater,
        CardID.TimeSnail,
        CardID.CloneWarrior,
        CardID.MergeMonster,
        CardID.DetachedHead,
        CardID.RubberDuck,
        CardID.CollabCentaur,
        CardID.RepoRaven,
    ]
    return randomPick(options)
}

function randomCard(): Card {
    return buildCard(randomCardID())
}

function randomGift(currentDeck: Card[]): Card[] {
    // Cards on the first side need one of the other to make sense.
    let requirements = [
        [[CardID.Bandaid], [CardID.Tag, CardID.TagTroll]],
        [[CardID.Tag], [CardID.Bandaid]],
        [[CardID.Inspiration], [CardID.Branch]],
        [[CardID.Switch], [CardID.Branch]],
        [[CardID.Branch], [CardID.Switch]],
        [
            [CardID.Restore, CardID.RestoreAll],
            [CardID.Add, CardID.AddAll],
        ],
        [[CardID.Merge], [CardID.SwitchDetach]],
        [[CardID.StashPop], [CardID.Stash]],
    ]

    let gift
    while (!gift) {
        //let card = buildCard(CardID.Tag)
        let card: CardID

        if (Math.random() < 0.4) {
            card = randomCreatureCardID()
        } else {
            card = randomCardID()
        }

        // Check if this card is any where in the requirements list, and compile a list of required cards.
        let requiredCards: CardID[] = []
        for (let requirement of requirements) {
            if (requirement[0].includes(card)) {
                requiredCards = requirement[1]
            }
        }

        // Does our deck already have one of them?
        if (requiredCards.some((id) => currentDeck.some((c) => c.id === id))) {
            // If so, we're good!
            requiredCards = []
        }

        if (requiredCards.length > 0) {
            // Add one of them to a bundle! :sparkles:
            gift = [buildCard(randomPick(requiredCards)), buildCard(card)]
        } else {
            // Otherwise, it's fine!
            gift = [buildCard(card)]
        }
    }
    return gift
}

function buildCard(id: CardID): Card {
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

class Enemy {
    constructor(public battle: Battle) {}

    makeMove(): void {}

    freeSlots(): number[] {
        return this.battle.enemySlots
            .map((card, i) => [card, i])
            .filter((card) => card[0] === null)
            .map((card) => card[1]) as number[]
    }
}

class AlwaysPassingEnemy extends Enemy {
    makeMove() {
        // pass
    }
}

class EasyEnemy extends Enemy {
    makeMove() {
        if (this.freeSlots().length === 0) {
            return
        }
        let randomSlot = randomPick(this.freeSlots())
        if (Math.random() < 0.5) {
            this.battle.playCardAsEnemy(CardID.TimeSnail, randomSlot)
        } else if (Math.random() < 0.6) {
            this.battle.playCardAsEnemy(CardID.DetachedHead, randomSlot)
        } else {
            // pass
        }
    }
}

let blueprints: CardID[][][] = [
    [[CardID.TimeSnail], [], [CardID.TimeSnail], []],
    [[CardID.TimeSnail], [], [CardID.GraphGnome], [], [CardID.MergeMonster]],
    [[CardID.TimeSnail], [CardID.TimeSnail], [], [CardID.BlobEater]],
    [[CardID.CloneWarrior], [], [], [], [CardID.MergeMonster]],
    [[CardID.DetachedHead], [], [], [], [CardID.MergeMonster]],
]

class BluePrintEnemy extends Enemy {
    turn = -1
    blueprint = randomPick(blueprints, true)

    makeMove() {
        if (this.freeSlots().length === 0) {
            return
        }
        let randomSlot = randomPick(this.freeSlots())

        this.turn += 1

        let nextCard: CardID
        if (this.blueprint.length > this.turn) {
            let nextCardOptions = this.blueprint[this.turn]
            if (nextCardOptions.length === 0) {
                return
            }
            nextCard = randomPick(nextCardOptions)
        } else {
            if (Math.random() > 0.5) {
                return
            }
            let nextCardOptions = randomPick(this.blueprint)
            if (nextCardOptions.length === 0) {
                return
            }
            nextCard = randomPick(nextCardOptions)
        }
        this.battle.playCardAsEnemy(nextCard, randomSlot)
    }
}

class OPEnemy extends Enemy {
    makeMove() {
        if (this.freeSlots().length === 0) {
            return
        }
        let randomSlot = randomPick(this.freeSlots())
        let card: CardID
        if (Math.random() < 0.5) {
            if (Math.random() < 0.5) {
                card = randomCreatureCardID()
            } else {
                card = CardID.MergeMonster
            }
            this.battle.playCardAsEnemy(card, randomSlot)
        } else {
            // pass
        }
    }
}

class RandomEnemy extends Enemy {
    turn = -1
    makeMove() {
        this.turn += 1

        if (Math.random() < 0.5) {
            return
        }

        if (this.freeSlots().length === 0) {
            return
        }
        let randomCard = randomCreatureCardID()
        let randomSlot = randomPick(this.freeSlots())
        this.battle.playCardAsEnemy(randomCard, randomSlot)
    }
}

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
        let cards = [
            CardID.TimeSnail,
            CardID.TimeSnail,
            CardID.RepoRaven,
            CardID.RubberDuck,
            CardID.GraphGnome,
            CardID.Add,
            CardID.Add,
            CardID.Add,
            CardID.Restore,
            CardID.Joker,
        ]

        this.deck = cards.map((id) => buildCard(id))

        //let deckSize = 15
        //for (let i = 0; i < deckSize; i++) {
        //    this.deck.push(randomCard())
        //}

        //for (let card of Object.values(allCards())) {
        //  this.deck.push(cloneDeep(card))
        //}

        this.path = [
            new BattleEvent(EasyEnemy),
            new NewCardEvent(),
            new BattleEvent(BluePrintEnemy),
            new NewCardEvent(),
            new BattleEvent(BluePrintEnemy),
            new CardRemovalEvent(),
            new BattleEvent(RandomEnemy),
            new NewCardEvent(),
            new BattleEvent(RandomEnemy),
            new NewCardEvent(),
            new BattleEvent(OPEnemy),
            new WinEvent(),
        ]

        this.state = this
    }

    openPath() {
        this.state = this
        this.onNextEvent(this.state)
    }

    enterNextEvent() {
        if (this.currentEvent === null) {
            this.currentEvent = this.path[0]
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
            this.state = new Battle(
                this.deck,
                this.currentEvent.enemy,
                (won) => {
                    if (won) {
                        this.openPath()
                    } else {
                        alert("GAME OVER")
                    }
                },
            )
        } else if (this.currentEvent instanceof NewCardEvent) {
            this.startNewCardEvent()
        } else if (this.currentEvent instanceof CardRemovalEvent) {
            this.startCardRemovalEvent()
        } else if (this.currentEvent instanceof WinEvent) {
            this.state = new Win()
        } else {
            throw new Error(`Unknown event type: ${this.currentEvent}`)
        }
        this.onNextEvent(this.state)
    }

    startNewCardEvent() {
        let options = Array(3)
            .fill(0)
            .map(() => randomGift(this.deck))
        this.state = new Decision(
            gt`Add a card to your deck!`,
            options,
            (cards) => {
                this.deck.push(...cards)
                this.openPath()
            },
        )
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
    constructor(public enemy: typeof Enemy) {
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
    energy = 1
    maxEnergy = 1

    enemyHealth = 20

    drawPile: Card[] = []
    hand: Card[] = []
    discardPile: Card[] = []
    activeCard?: Card

    slots: (CreatureCard | null)[] = [null, null, null]

    enemyUpcomingSlots: (CreatureCard | null)[] = [null, null, null]
    enemySlots: (CreatureCard | null)[] = [null, null, null]

    enemy: Enemy

    constructor(
        deck: Card[],
        enemyType: typeof Enemy,
        public onBattleFinished: (won: boolean) => void,
    ) {
        //for (let i = 0; i < deckSize; i++) {
        //    this.drawPile.push(randomPick(templates, true))
        //}
        for (let card of deck) {
            this.drawPile.push(card)
        }
        shuffle(this.drawPile)

        const handSize = 5
        for (let i = 0; i < handSize; i++) {
            this.drawCard()
        }

        this.enemy = new enemyType(this)
        this.enemy.makeMove()

        this.state = new PlayerTurnState()
    }

    async devSetup() {
        this.slots[0] = buildCard(CardID.TimeSnail) as CreatureCard
        this.slots[1] = buildCard(CardID.GraphGnome) as CreatureCard
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

    async evaluateDynamicValue(value: DynamicValueType): Promise<number> {
        let commands = {
            [DynamicValueType.TagCount]: "git tag | wc -l",
            [DynamicValueType.CommitCount]: "git rev-list --all --count",
            [DynamicValueType.BranchLength]:
                "git rev-list HEAD --count || echo 0",
            [DynamicValueType.BranchCount]: "git branch | wc -l",
        }
        let result = await this.runHiddenCommand(commands[value])
        if (result.exit_code !== 0) {
            throw new Error(`Command failed: ${result.output}`)
        }
        return parseInt(result.output)
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

    async playCardFromHand(i: number) {
        if (i < 0 || i >= this.hand.length) {
            throw new Error(`Invalid hand index: ${i}`)
        }

        const card = cloneDeep(this.hand[i])

        if (card.energy > this.energy) {
            this.log(
                gt`Not enough energy to play ${card.getTitle()}.`,
                LogType.Error,
            )
            return
        }

        this.activeCard = this.hand[i]

        if (card instanceof CreatureCard) {
            let placeholder = new SlotPlaceholder(async (_, slotString) => {
                let slot = parseInt(slotString)
                this.energy -= card.energy
                this.slots[slot - 1] = cloneDeep(card)
                this.log(gt`Played ${card.getTitle()} to slot ${slotString}.`)
                await card.triggerEffects(
                    this,
                    Trigger.Played,
                    new CardSource(true, this.slots[slot - 1] as CreatureCard),
                )
                this.discardHandCard(i)
                this.state = new PlayerTurnState()
                await this.sideeffect(new SyncGameToDiskSideEffect())
            })
            this.state = new RequirePlaceholderState([placeholder])
        } else if (card instanceof CommandCard) {
            let command = new Command(card.command.template)
            try {
                await this.runCommand(command)
                this.energy -= card.energy
                this.log(gt`Played ${card.getTitle()}.`)
                this.discardHandCard(i)
            } catch (_) {
                // Playing the card failed.
                this.activeCard = undefined
            }
        } else if (card instanceof EffectCard) {
            this.energy -= card.energy
            this.log(gt`Played ${card.getTitle()}.`)
            await card.effect.apply(this, new CardSource(true, card))
            this.discardHandCard(i)
        } else {
            throw new Error(`Unknown card type: ${card}`)
        }
    }

    playCardAsEnemy(cardID: CardID, slot: number) {
        let card = buildCard(cardID)
        if (!(card instanceof CreatureCard)) {
            throw new Error(`Card ${cardID} is not a creature card.`)
        }
        this.enemyUpcomingSlots[slot] = card
        this.log(gt`Enemy announced ${card.getTitle()} at slot ${slot + 1}.`)
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

    fight() {
        for (let i = 0; i < this.slots.length; i++) {
            const playerCard = this.slots[i]
            const enemyCard = this.enemySlots[i]
            if (playerCard && enemyCard) {
                // Both players have a card in this slot. They fight!
                playerCard.health -= enemyCard.attack
                this.log(
                    gt`Enemy ${enemyCard.getTitle()} dealt ${
                        enemyCard.attack
                    } damage to ${playerCard.getTitle()}.`,
                )

                enemyCard.health -= playerCard.attack
                this.log(
                    gt`Your ${playerCard.getTitle()} dealt ${
                        playerCard.attack
                    } damage to ${enemyCard.getTitle()}.`,
                )
                if (playerCard.health <= 0) {
                    this.kill(true, i, new CardSource(true, enemyCard))
                }
                if (enemyCard.health <= 0) {
                    this.kill(false, i, new CardSource(false, playerCard))
                }
            } else if (playerCard) {
                // Only the player has a card in this slot. It attacks the enemy player.
                this.enemyHealth -= playerCard.attack
                this.log(
                    gt`${playerCard.getTitle()} dealt ${
                        playerCard.attack
                    } damage to the enemy player.`,
                )
                if (this.enemyHealth < 1) {
                    this.onBattleFinished(true)
                }
            } else if (enemyCard) {
                // Only the enemy has a card in this slot. It attacks the player.
                this.health -= enemyCard.attack
                this.log(
                    gt`Enemy ${enemyCard.getTitle()} dealt ${
                        enemyCard.attack
                    } damage to you.`,
                )
                if (this.health < 1) {
                    this.onBattleFinished(false)
                }
            }
        }
    }

    moveEnemyForward() {
        for (let i = 0; i < this.enemySlots.length; i++) {
            let upcomingCard = this.enemyUpcomingSlots[i]
            let card = this.enemySlots[i]

            if (upcomingCard !== null && card === null) {
                this.enemySlots[i] = this.enemyUpcomingSlots[i]
                this.enemyUpcomingSlots[i] = null

                upcomingCard.triggerEffects(
                    this,
                    Trigger.Played,
                    new CardSource(false, upcomingCard),
                )
            }
        }
    }

    endTurn() {
        this.log("--- " + gt`You ended your turn` + " ---")

        this.autoCommit()

        this.fight()

        this.moveEnemyForward()

        this.enemy.makeMove()

        this.drawCardStep()

        if (this.maxEnergy < 5) {
            this.maxEnergy += 1
        }
        this.energy = this.maxEnergy
    }

    drawCardStep() {
        // Discard all cards in hand.
        //while (this.hand.length > 0) {
        //    this.discardHandCard(0)
        //}

        // Draw at least 1 card.
        this.drawCard()

        // Draw more cards so player has at least 3 in hand.
        while (this.hand.length < 3) {
            this.drawCard()
        }
    }

    drawCard() {
        if (this.drawPile.length === 0 && this.discardPile.length === 0) {
            this.log(
                gt`Tried to draw a card, but both draw and discard pile are empty.`,
            )
            return
        }
        if (this.drawPile.length === 0) {
            this.drawPile = this.discardPile
            shuffle(this.drawPile)
            this.discardPile = []
            this.log(gt`Shuffled discard pile into draw pile.`)
        }
        const card = this.drawPile.pop()
        if (card) {
            this.hand.push(card)
            this.log(gt`You drew ${card.getTitle()}.`)
        }
    }

    cancelAction() {
        this.activeCard = undefined
        this.state = new PlayerTurnState()
    }

    kill(playerSideToKill: boolean, slot: number, source: CardSource) {
        let targetSideCreatures = playerSideToKill
            ? this.slots
            : this.enemySlots
        let card = targetSideCreatures[slot]
        if (card) {
            card.triggerEffects(
                this,
                Trigger.Dies,
                new CardSource(playerSideToKill, card),
            )
            targetSideCreatures[slot] = null
            this.log(`${source.sourceDescription()} killed ${card.getTitle()}.`)
        } else {
            throw new Error("Target of a random enemy deletion was null.")
        }
    }

    discardHandCard(i: number) {
        if (i < 0 || i >= this.hand.length) {
            throw new Error(`Invalid hand index: ${i}`)
        }
        if (this.activeCard === this.hand[i]) {
            this.activeCard = undefined
        }
        const card = this.hand.splice(i, 1)[0]
        this.discardPile.push(card)
    }
}
