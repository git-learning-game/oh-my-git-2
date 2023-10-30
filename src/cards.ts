import {cloneDeep} from "lodash"
import * as YAML from "yaml"
import {gt, gPlural} from "svelte-i18n-lingui"

export class Card {
    constructor(
        public name: string,
        public energy: number,
    ) {}
}

export class CreatureCard extends Card {
    effects: [Trigger, Effect][] = []

    constructor(
        name: string,
        energy: number,
        public attack: number,
        public health: number,
    ) {
        super(name, energy)
    }

    stringify(): string {
        return YAML.stringify({
            name: this.name,
            energy: this.energy,
            attack: this.attack,
            health: this.health,
        })
    }

    static parse(content: string) {
        let result = YAML.parse(content)

        let name = result.name ?? "Unknown"
        let energy = result.energy ?? 0
        let attack = result.attack ?? 0
        let health = result.health ?? 0

        return new CreatureCard(name, energy, attack, health)
    }

    effectDescription(): string {
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

    triggerEffects(battle: Battle, trigger: Trigger, source: CardSource) {
        for (let [t, effect] of this.effects) {
            if (t === trigger) {
                effect.apply(battle, source)
            }
        }
    }
}

export class CommandCard extends Card {
    constructor(
        name: string,
        energy: number,
        public command: Command,
    ) {
        super(name, energy)
    }
}

export class EffectCard extends Card {
    constructor(
        name: string,
        energy: number,
        public effect: Effect,
    ) {
        super(name, energy)
    }
    effectDescription(): string {
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
        console.log(`Creating command from template: ${template}`)
        this.placeholders = []
        let regex = new RegExp(Object.keys(placeholderTypes).join("|"), "g")
        console.log(regex)
        template.match(regex)?.forEach((word) => {
            if (Object.keys(placeholderTypes).includes(word)) {
                this.placeholders.push(
                    new placeholderTypes[word](this.fulfill.bind(this)),
                )
            }
        })
    }

    fulfill(placeholder: Placeholder, value: string) {
        console.log(`Fulfilling placeholder ${placeholder} with ${value}`)
        console.log(placeholder)
        // TODO: Make more elegant
        if (placeholder instanceof FreeStringPlaceholder) {
            this.template = this.template.replace("STRING", value)
        } else if (placeholder instanceof RefPlaceholder) {
            this.template = this.template.replace("REF", value)
        } else if (placeholder instanceof SlotPlaceholder) {
            this.template = this.template.replace("SLOT", value)
        } else {
            throw new Error(`Unknown placeholder type: ${placeholder}`)
        }
        // Remove placeholder, as it is now resolved.
        this.placeholders = this.placeholders.splice(1)

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
        return this.card.name
    }
}

abstract class Effect {
    constructor() {}
    abstract getDescription(): string
    abstract apply(battle: Battle, source: CardSource): void
}

class CommandEffect extends Effect {
    constructor(public command: Command) {
        super()
    }

    getDescription(): string {
        return gt`run "${this.command.template}"`
    }

    apply(battle: Battle, _source: CardSource) {
        battle.runCommand(this.command)
    }
}

class AddCardToHandEffect extends Effect {
    constructor(public cardID: CardID) {
        super()
    }

    getDescription(): string {
        return gt`add a ${allCards()[this.cardID].name} to your hand`
    }

    apply(battle: Battle, source: CardSource) {
        if (source.player) {
            battle.hand.push(buildCard(this.cardID))
            battle.log(
                gt`Added a ${allCards()[this.cardID].name} to your hand.`,
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

    apply(battle: Battle, source: CardSource) {
        let targetSideCreatures = source.player
            ? battle.enemySlots
            : battle.slots

        let slotsWithCreature = (targetSideCreatures as CreatureCard[])
            .map((card, i) => [card, i])
            .filter((card) => card[0] !== null)
        if (slotsWithCreature.length > 0) {
            let slotToDelete = randomPick(slotsWithCreature)[1] as number
            battle.kill(source.player, slotToDelete, source)
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

    apply(battle: Battle, source: CardSource) {
        if (source.player) {
            for (let i = 0; i < this.count; i++) {
                battle.drawCard()
            }
        }
    }
}

class GiveFriendsEffect extends Effect {
    constructor(
        public attack: number,
        public health: number,
    ) {
        super()
    }

    getDescription(): string {
        return gt`give all friends +${this.attack.toString()}/${this.health.toString()}`
    }

    apply(battle: Battle, source: CardSource) {
        let targetSideCreatures = source.player
            ? battle.slots
            : battle.enemySlots
        for (let i = 0; i < targetSideCreatures.length; i++) {
            let card = targetSideCreatures[i]
            if (card) {
                card.attack += this.attack
                card.health += this.health
                battle.log(
                    `${source.sourceDescription()} gave ${card.name} +${
                        this.attack
                    }/${this.health}.`,
                )
            }
        }
    }
}

enum CardID {
    GraphGnome,
    BlobEater,
    TimeSnail,
    CloneWarrior,
    MergeMonster,
    DetachedHead,
    RubberDuck,
    CollabCentaur,
    TagTroll,
    Add,
    AddAll,
    Remove,
    Restore,
    RestoreAll,
    RestoreS,
    RestoreStaged,
    RestoreStagedS,
    Commit,
    CommitAll,
    Copy,
    Move,
    Branch,
    Switch,
    Checkout,
    Stash,
    StashPop,
    Merge,
    HealthPotion,
    DrawCard,
}

function allCards(): Record<CardID, Card> {
    return {
        [CardID.GraphGnome]: new CreatureCard(gt`Graph Gnome`, 2, 1, 2),
        [CardID.BlobEater]: new CreatureCard(gt`Blob Eater`, 3, 2, 2).addEffect(
            Trigger.Played,
            new DeleteRandomEnemyEffect(),
        ),
        [CardID.TimeSnail]: new CreatureCard(gt`Time Snail`, 1, 1, 1),
        [CardID.CloneWarrior]: new CreatureCard(
            gt`Clone Warrior`,
            4,
            2,
            5,
        ).addEffect(Trigger.Dies, new AddCardToHandEffect(CardID.TimeSnail)),
        [CardID.MergeMonster]: new CreatureCard(gt`Merge Monster`, 4, 4, 4),
        [CardID.DetachedHead]: new CreatureCard(gt`Detached Head`, 0, 0, 2),
        [CardID.RubberDuck]: new CreatureCard(
            gt`Rubber Duck`,
            1,
            1,
            1,
        ).addEffect(Trigger.Played, new DrawCardEffect(1)),
        [CardID.CollabCentaur]: new CreatureCard(
            gt`Collab Centaur`,
            1,
            1,
            1,
        ).addEffect(Trigger.Played, new GiveFriendsEffect(1, 1)),
        [CardID.TagTroll]: new CreatureCard(gt`Tag Troll`, 2, 3, 1).addEffect(
            Trigger.Played,
            new CommandEffect(new Command("git tag $RANDOM")),
        ),
        //new CommandCard(gt`Init`, 0, new Command("git init")),
        [CardID.Add]: new CommandCard(gt`Add`, 1, new Command("git add SLOT")),
        [CardID.AddAll]: new CommandCard(
            gt`Add all`,
            2,
            new Command("git add ."),
        ),
        [CardID.Remove]: new CommandCard(gt`Remove`, 0, new Command("rm SLOT")),
        [CardID.Restore]: new CommandCard(
            gt`Restore`,
            2,
            new Command("git restore SLOT"),
        ),
        [CardID.RestoreAll]: new CommandCard(
            gt`Restore All`,
            3,
            new Command("git restore ."),
        ),
        [CardID.RestoreS]: new CommandCard(
            gt`Restore`,
            2,
            new Command("git restore -s REF SLOT"),
        ),
        [CardID.RestoreStaged]: new CommandCard(
            gt`Restore staged`,
            2,
            new Command("git restore --staged SLOT"),
        ),
        [CardID.RestoreStagedS]: new CommandCard(
            gt`Restore staged`,
            2,
            new Command("git restore --staged -s REF SLOT"),
        ),
        [CardID.Commit]: new CommandCard(
            gt`Commit`,
            2,
            new Command("git commit -m 'Commit'"),
        ),
        [CardID.CommitAll]: new CommandCard(
            gt`Commit all`,
            3,
            new Command("git add .; git commit -m 'Commit'"),
        ),
        [CardID.Copy]: new CommandCard(
            gt`Copy`,
            3,
            new Command("cp SLOT SLOT"),
        ),
        [CardID.Move]: new CommandCard(
            gt`Move`,
            3,
            new Command("mv SLOT SLOT"),
        ),
        [CardID.Stash]: new CommandCard(gt`Stash`, 3, new Command("git stash")),
        [CardID.StashPop]: new CommandCard(
            gt`Pop stash`,
            2,
            new Command("git stash pop"),
        ),
        [CardID.Branch]: new CommandCard(
            gt`Branch`,
            1,
            new Command("git branch STRING"),
        ),
        [CardID.Switch]: new CommandCard(
            gt`Switch`,
            1,
            new Command("git switch -f REF"),
        ),
        [CardID.Checkout]: new CommandCard(
            gt`Checkout`,
            1,
            new Command("git checkout REF"),
        ),
        [CardID.Merge]: new CommandCard(
            gt`Merge`,
            2,
            new Command("git merge REF"),
        ),
        [CardID.HealthPotion]: new CommandCard(
            gt`Health potion`,
            1,
            new Command(
                `slot=SLOT; health=$(cat $slot | grep health | cut -d':' -f2); health=$((health+2)); sed -i "s/health: .*/health: $health/" $slot`,
            ),
        ),
        [CardID.DrawCard]: new EffectCard(
            gt`Library`,
            1,
            new DrawCardEffect(2),
        ),
        // Card ideas: restore all
    }
}

function randomCardID(): CardID {
    // TODO: Make more typesafe?
    const enumValues = Object.values(allCards())
    const index = Math.floor(Math.random() * enumValues.length)
    return index
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
    ]
    return randomPick(options)
}

function randomCard(): Card {
    return buildCard(randomCardID())
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

class SnailEnemy extends Enemy {
    makeMove() {
        if (this.freeSlots().length === 0) {
            return
        }
        let randomSlot = randomPick(this.freeSlots())
        this.battle.playCardAsEnemy(CardID.TimeSnail, randomSlot)
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
            card = randomCreatureCardID()
        } else {
            card = CardID.MergeMonster
        }
        this.battle.playCardAsEnemy(card, randomSlot)
    }
}

class RandomEnemy extends Enemy {
    turn = -1
    makeMove() {
        this.turn += 1

        if (this.turn % 2 == 1) {
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

//I'm going on an adventure!
export class Adventure {
    deck: Card[] = []
    //battle: Battle
    state: Battle | Decision | null

    path: Event[]

    constructor(public onNextEvent: (e: Battle | Decision | null) => void) {
        let cards = [
            CardID.TimeSnail,
            CardID.DetachedHead,
            CardID.BlobEater,
            CardID.TagTroll,
            CardID.Add,
            CardID.Add,
            CardID.Add,
            CardID.AddAll,
            CardID.Restore,
            CardID.RestoreAll,
        ]

        this.deck = cards.map((id) => buildCard(id))

        //let deckSize = 10
        //for (let i = 0; i < deckSize; i++) {
        //    this.deck.push(randomCard())
        //}

        //for (let card of Object.values(allCards())) {
        //    this.deck.push(cloneDeep(card))
        //}

        this.state = null

        this.path = [
            //new BattleEvent(SnailEnemy),
            new DecisionEvent(),
            new BattleEvent(BluePrintEnemy),
            new DecisionEvent(),
            new BattleEvent(BluePrintEnemy),
            new DecisionEvent(),
            new BattleEvent(RandomEnemy),
            new DecisionEvent(),
            new BattleEvent(RandomEnemy),
            new DecisionEvent(),
            new BattleEvent(OPEnemy),
        ]

        //this.battle = new Battle(this.deck)
        this.enterNextEvent()
    }

    enterNextEvent() {
        if (this.path.length === 0) {
            alert("You are a beautiful aweome person and you win!")
            return
        }
        let nextEvent = this.path.shift()
        if (nextEvent instanceof BattleEvent) {
            this.state = new Battle(this.deck, nextEvent.enemy, (won) => {
                if (won) {
                    this.enterNextEvent()
                } else {
                    alert("GAME OVER")
                }
            })
        } else if (nextEvent instanceof DecisionEvent) {
            this.startNewDecision()
        } else {
            throw new Error(`Unknown event type: ${nextEvent}`)
        }
        this.onNextEvent(this.state)
    }

    startNewDecision() {
        this.state = new Decision(
            [randomCard(), randomCard(), randomCard()],
            (card) => {
                this.deck.push(card)
                this.enterNextEvent()
            },
        )
    }
}

export class Decision {
    constructor(
        public choices: Card[],
        public onChoice: (a: Card) => void,
    ) {}

    choose(card: Card) {
        this.onChoice(card)
    }
}

class Event {}

class BattleEvent extends Event {
    constructor(public enemy: typeof Enemy) {
        super()
    }
}

class DecisionEvent extends Event {
    constructor() {
        super()
    }
}

export class BattleState {}

export class PlayerTurnState extends BattleState {}

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

export class Battle {
    state: BattleState
    onSideeffectCallback: (sideEffect: SideEffect) => void = () => {}

    eventLog: string[] = []

    health = 10
    energy = 1
    maxEnergy = 1

    enemyHealth = 10

    drawPile: Card[] = []
    hand: Card[] = []
    discardPile: Card[] = []

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

    log(event: string) {
        this.eventLog.push(event)
    }

    onSideEffect(callback: (sideEffect: SideEffect) => void) {
        this.onSideeffectCallback = callback
    }

    sideeffect(sideEffect: SideEffect) {
        this.onSideeffectCallback(sideEffect)
    }

    async playCardFromHand(i: number) {
        if (i < 0 || i >= this.hand.length) {
            throw new Error(`Invalid hand index: ${i}`)
        }

        const card = cloneDeep(this.hand[i])

        if (card.energy > this.energy) {
            this.log(gt`Not enough energy to play ${card.name}.`)
            return
        }

        if (card instanceof CreatureCard) {
            let placeholder = new SlotPlaceholder((_, slotString) => {
                let slot = parseInt(slotString)
                this.energy -= card.energy
                let newCard = cloneDeep(card)
                this.slots[slot - 1] = newCard
                this.log(gt`Played ${card.name} to slot ${slotString}.`)
                newCard.triggerEffects(
                    this,
                    Trigger.Played,
                    new CardSource(true, this.slots[slot - 1] as CreatureCard),
                )
                this.discardHandCard(i)
                this.state = new PlayerTurnState()
                this.sideeffect(new SyncGameToDiskSideEffect())
            })
            this.state = new RequirePlaceholderState([placeholder])
        } else if (card instanceof CommandCard) {
            let command = new Command(card.command.template)
            this.runCommand(command, () => {
                this.log(`Played ${card.name}.`)
                this.discardHandCard(i)
            })
        } else if (card instanceof EffectCard) {
            this.energy -= card.energy
            this.log(`Played ${card.name}.`)
            card.effect.apply(this, new CardSource(true, card))
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
        this.log(
            gt`Enemy announced ${card.name} at slot ${(slot + 1).toString()}.`,
        )
    }

    runCommand(command: Command, onResolveCallback: () => void = () => {}) {
        command.onResolveCallback = () => {
            this.sideeffect(new CommandSideEffect(command.template))
            onResolveCallback()
            this.state = new PlayerTurnState()
        }
        if (command.placeholders.length === 0) {
            command.onResolveCallback(command)
        } else {
            this.state = new RequirePlaceholderState(command.placeholders)
        }
    }

    autoCommit() {
        this.log(gt`Automatically creating a commit.`)
        this.runCommand(new Command("git commit -m'Automatic commit'"))
    }

    fight() {
        for (let i = 0; i < this.slots.length; i++) {
            const playerCard = this.slots[i]
            const enemyCard = this.enemySlots[i]
            if (playerCard && enemyCard) {
                // Both players have a card in this slot. They fight!
                playerCard.health -= enemyCard.attack
                this.log(
                    gt`Enemy ${
                        enemyCard.name
                    } dealt ${enemyCard.attack.toString()} damage to ${
                        playerCard.name
                    }.`,
                )

                enemyCard.health -= playerCard.attack
                this.log(
                    gt`Your ${
                        playerCard.name
                    } dealt ${playerCard.attack.toString()} damage to ${
                        enemyCard.name
                    }.`,
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
                    gt`${
                        playerCard.name
                    } dealt ${playerCard.attack.toString()} damage to the enemy player.`,
                )
                if (this.enemyHealth < 1) {
                    this.onBattleFinished(true)
                }
            } else if (enemyCard) {
                // Only the enemy has a card in this slot. It attacks the player.
                this.health -= enemyCard.attack
                this.log(
                    gt`Enemy ${
                        enemyCard.name
                    } dealt ${enemyCard.attack.toString()} damage to you.`,
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

        this.drawCard()

        if (this.maxEnergy < 5) {
            this.maxEnergy += 1
        }
        this.energy = this.maxEnergy
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
            this.log(gt`You drew ${card.name}.`)
        }
    }

    kill(player: boolean, slot: number, source: CardSource) {
        let targetSideCreatures = player ? this.slots : this.enemySlots
        let card = targetSideCreatures[slot]
        if (card) {
            card.triggerEffects(
                this,
                Trigger.Dies,
                new CardSource(player, card),
            )
            targetSideCreatures[slot] = null
            this.log(`${source.sourceDescription()} killed ${card.name}.`)
        } else {
            throw new Error(
                "Source or target of a random enemy deletion was null.",
            )
        }
    }

    discardHandCard(i: number) {
        if (i < 0 || i >= this.hand.length) {
            throw new Error(`Invalid hand index: ${i}`)
        }
        const card = this.hand.splice(i, 1)[0]
        this.discardPile.push(card)
    }
}
