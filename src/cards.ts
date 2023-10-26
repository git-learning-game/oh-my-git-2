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
        let description = ""
        for (let [trigger, effect] of this.effects) {
            let newEffect = `${triggerDescriptions[trigger]}, ${effect.description}.`
            description +=
                newEffect.charAt(0).toUpperCase() + newEffect.slice(1)
        }
        return description
    }

    addEffect(trigger: Trigger, effect: Effect): CreatureCard {
        this.effects.push([trigger, effect])
        return this
    }

    triggerEffects(battle: Battle, trigger: Trigger, source: Source) {
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

class Command {
    // Template can contain the following placeholders:
    // FILE - a file name
    // REF - a Git ref
    constructor(public template: string) {}
}

enum Trigger {
    Played,
}

export const triggerDescriptions: Record<Trigger, string> = {
    [Trigger.Played]: gt`when this card is played`,
}

abstract class Effect {
    constructor(public description: string) {}
    abstract apply(battle: Battle, source: Source): void
}

class Source {}

class CreatureSource extends Source {
    constructor(
        public player: boolean,
        public slot: number,
    ) {
        super()
    }
}

class DeleteRandomEnemyEffect extends Effect {
    constructor() {
        super(gt`delete a random enemy`)
    }

    apply(battle: Battle, source: Source) {
        if (source instanceof CreatureSource) {
            let targetSideCreatures = source.player
                ? battle.enemySlots
                : battle.slots

            let slotsWithCreature = (targetSideCreatures as CreatureCard[])
                .map((card, i) => [card, i])
                .filter((card) => card[0] !== null)
            if (slotsWithCreature.length > 0) {
                let slotToDelete = randomPick(slotsWithCreature)[1] as number
                let card = targetSideCreatures[slotToDelete]
                targetSideCreatures[slotToDelete] = null
                let sourceCreature = source.player
                    ? battle.slots[source.slot]
                    : battle.enemySlots[source.slot]
                console.log({sourceCreature, card})
                if (sourceCreature && card) {
                    battle.log(`${sourceCreature.name} killed ${card.name}.`)
                } else {
                    throw new Error(
                        "Source or target of a random enemy deletion was null.",
                    )
                }
            }
        } else {
            throw new Error(
                "DeleteRandomEnemyEffect can only have a creature as a source.",
            )
        }
    }
}

class DrawCardEffect extends Effect {
    constructor(public count: number) {
        super(
            gPlural(count, {
                one: "draw a card",
                other: "draw # cards",
            }),
        )
    }

    apply(battle: Battle, source: Source) {
        if (source instanceof CreatureSource) {
            if (source.player) {
                for (let i = 0; i < this.count; i++) {
                    battle.drawCard()
                }
            }
        } else {
            throw new Error(
                "DrawCardEffect can only have a creature as a source.",
            )
        }
    }
}

class GiveFriendsEffect extends Effect {
    constructor(
        public attack: number,
        public health: number,
    ) {
        super(gt`give all friends +${attack.toString()}/${health.toString()}`)
    }

    apply(battle: Battle, source: Source) {
        if (source instanceof CreatureSource) {
            let targetSideCreatures = source.player
                ? battle.slots
                : battle.enemySlots
            for (let i = 0; i < targetSideCreatures.length; i++) {
                let card = targetSideCreatures[i]
                if (card) {
                    card.attack += this.attack
                    card.health += this.health
                    let sourceCreature = source.player
                        ? battle.slots[source.slot]
                        : battle.enemySlots[source.slot]
                    if (sourceCreature) {
                        battle.log(
                            `${sourceCreature.name} gave ${card.name} +${this.attack}/${this.health}.`,
                        )
                    } else {
                        throw new Error(
                            "Source of a GiveFriendsEffect was null.",
                        )
                    }
                }
            }
        } else {
            throw new Error(
                "GiveFriendsEffect can only have a creature as a source.",
            )
        }
    }
}

console.log("Cards are now being defined.")
function creatureTemplates(): Record<string, CreatureCard> {
    return {
        graphGnome: new CreatureCard(gt`Graph Gnome`, 1, 1, 2),
        blobEater: new CreatureCard(gt`Blob Eater`, 2, 2, 2).addEffect(
            Trigger.Played,
            new DeleteRandomEnemyEffect(),
        ),
        timeSnail: new CreatureCard(gt`Time Snail`, 1, 1, 1),
        cloneWarrior: new CreatureCard(gt`Clone Warrior`, 4, 2, 5),
        mergeMoster: new CreatureCard(gt`Merge Monster`, 4, 4, 4),
        detachedHead: new CreatureCard(gt`Detached Head`, 1, 0, 2),
        rubberDuck: new CreatureCard(gt`Rubber Duck`, 1, 1, 1).addEffect(
            Trigger.Played,
            new DrawCardEffect(1),
        ),
        collabCentaur: new CreatureCard(gt`Collab Centaur`, 1, 1, 1).addEffect(
            Trigger.Played,
            new GiveFriendsEffect(1, 1),
        ),
    }
}

function commandTemplates(): Record<string, CommandCard> {
    return {
        //new CommandCard(gt`Init`, 0, new Command("git init")),
        add: new CommandCard(gt`Add`, 1, new Command("git add FILE")),
        addAll: new CommandCard(gt`Add all`, 2, new Command("git add .")),
        remove: new CommandCard(gt`Remove`, 0, new Command("rm FILE")),
        restore: new CommandCard(
            gt`Restore`,
            2,
            new Command("git restore FILE"),
        ),
        commit: new CommandCard(
            gt`Commit`,
            2,
            new Command("git commit -m 'Commit'"),
        ),
        commitAll: new CommandCard(
            gt`Commit all`,
            3,
            new Command("git add .; git commit -m 'Commit'"),
        ),
        makeCopies: new CommandCard(
            gt`Make copies`,
            3,
            new Command("cp FILE tmp; cp tmp 1; cp tmp 2; cp tmp 3; rm tmp"),
        ),
        //new CommandCard(gt`Stash`, 3, new Command("git stash")),
        //new CommandCard(gt`Pop stash`, 2, new Command("git stash pop")),
        //new CommandCard(gt`Branch`, 1, new Command("git branch FILE")), // TODO: Allow branch targets
        //new CommandCard(gt`Switch`, 1, new Command("git switch -f FILE")), // TODO: Allow branch targets
        //new CommandCard(gt`Merge`, 2, new Command("git merge FILE")), // TODO: Allow branch targets

        /* TODO:
    cp
    mv
    restore -s
    restore
    */
    }
}

function allCardTemplates(): Card[] {
    return [
        ...Object.values(creatureTemplates()),
        ...Object.values(commandTemplates()),
    ]
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

export class FileChangeSideEffect extends SideEffect {
    constructor(
        public path: string,
        public content: string,
    ) {
        super()
    }
}

export class FileDeleteSideEffect extends SideEffect {
    constructor(public path: string) {
        super()
    }
}

export class CommandSideEffect extends SideEffect {
    constructor(public command: string) {
        super()
    }
}

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
        this.battle.playCardAsEnemy(
            new CreatureCard("Time Snail", 1, 1, 1),
            randomSlot,
        )
    }
}

class OPEnemy extends Enemy {
    makeMove() {
        if (this.freeSlots().length === 0) {
            return
        }
        let randomSlot = randomPick(this.freeSlots())
        let card: CreatureCard
        if (Math.random() < 0.5) {
            card = randomPick(Object.values(creatureTemplates()), true)
        } else {
            card = new CreatureCard("Merge Monster", 4, 4, 4)
        }
        this.battle.playCardAsEnemy(card, randomSlot)
    }
}

class RandomEnemy extends Enemy {
    makeMove() {
        if (this.freeSlots().length === 0) {
            return
        }
        let randomCard = randomPick(Object.values(creatureTemplates()), true)
        let randomSlot = randomPick(this.freeSlots())
        this.battle.playCardAsEnemy(randomCard, randomSlot)
    }
}

const possibleEnemies = [RandomEnemy, OPEnemy]

//I'm going on an adventure!
export class Adventure {
    deck: Card[] = []
    //battle: Battle
    state: Battle | Decision | null

    path: Event[]

    constructor(public onNextEvent: () => void) {
        let creaturecards = [
            "timeSnail",
            "timeSnail",
            "timeSnail",
            "timeSnail",
            "timeSnail",
            "timeSnail",
        ]
        let commandcards = ["add", "add", "restore", "restore"]
        this.deck = [
            ...creaturecards.map((name) =>
                cloneDeep(creatureTemplates()[name]),
            ),
            ...commandcards.map((name) => cloneDeep(commandTemplates()[name])),
        ]
        this.state = null

        this.path = [
            new BattleEvent(SnailEnemy),
            new DecisionEvent(),
            new BattleEvent(RandomEnemy),
            new DecisionEvent(),
            new BattleEvent(OPEnemy),
        ]

        //this.battle = new Battle(this.deck)
        this.enterNextEvent()
    }

    enterNextEvent() {
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
        this.onNextEvent()
    }

    startNewDecision() {
        this.state = new Decision(
            [
                randomPick(allCardTemplates(), true),
                randomPick(allCardTemplates(), true),
            ],
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

export class Battle {
    eventLog: string[] = []

    health = 10
    energy = 1
    maxEnergy = 1

    enemyHealth = 10

    drawPile: Card[] = []
    hand: Card[] = []
    discardPile: Card[] = []

    slots: (CreatureCard | null)[] = [null, null, null]
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
    }

    log(event: string) {
        this.eventLog.push(event)
    }

    async playCardFromHand(i: number, target: number): Promise<SideEffect[]> {
        let effects = []

        if (i < 0 || i >= this.hand.length) {
            throw new Error(`Invalid hand index: ${i}`)
        }

        const card = this.hand[i]

        if (card.energy > this.energy) {
            this.log(`Not enough energy to play ${card.name}.`)
            return []
        } else {
            this.energy -= card.energy
        }

        let success = false
        let output = ""
        if (card instanceof CreatureCard) {
            let newCard = cloneDeep(card)
            this.slots[target - 1] = newCard
            let fileContent = card.stringify()
            effects.push(
                new FileChangeSideEffect(`/root/repo/${target}`, fileContent),
            )
            this.log(`Played ${card.name} to slot ${target}.`)
            newCard.triggerEffects(
                this,
                Trigger.Played,
                new CreatureSource(true, target - 1),
            )
            success = true
        } else if (card instanceof CommandCard) {
            const command = card.command.template.replace("FILE", `${target}`)
            effects.push(new CommandSideEffect(command))
            if (card.command.template.includes("FILE")) {
                this.log(`Played ${card.name} to slot ${target}.`)
            } else {
                this.log(`Played ${card.name}.`)
            }
            success = true
        } else {
            throw new Error(`Unknown card type: ${card}`)
        }
        if (success) {
            this.discardHandCard(i)
        }
        return effects
    }

    playCardAsEnemy(card: CreatureCard, slot: number) {
        this.enemySlots[slot] = card
        this.log(`Enemy played ${card.name} to slot ${slot + 1}.`)
        card.triggerEffects(
            this,
            Trigger.Played,
            new CreatureSource(false, slot),
        )
    }

    endTurn() {
        this.log("--- You ended your turn ---")
        let effects = []
        // Fight! Let creatures take damage. If there is no defense, damage goes to players.
        for (let i = 0; i < this.slots.length; i++) {
            const playerCard = this.slots[i]
            const enemyCard = this.enemySlots[i]
            if (playerCard && enemyCard) {
                // Both players have a card in this slot. They fight!
                playerCard.health -= enemyCard.attack
                this.log(
                    `Enemy ${enemyCard.name} dealt ${enemyCard.attack} damage to ${playerCard.name}.`,
                )

                enemyCard.health -= playerCard.attack
                this.log(
                    `Your ${playerCard.name} dealt ${playerCard.attack} damage to ${enemyCard.name}.`,
                )
                if (playerCard.health <= 0) {
                    this.slots[i] = null
                    effects.push(
                        new FileDeleteSideEffect(`/root/repo/${i + 1}`),
                    )
                    this.log(`Your ${playerCard.name} died.`)
                } else {
                    let fileContent = playerCard.stringify()
                    effects.push(
                        new FileChangeSideEffect(
                            `/root/repo/${i + 1}`,
                            fileContent,
                        ),
                    )
                }
                if (enemyCard.health <= 0) {
                    this.enemySlots[i] = null
                    this.log(`Enemy ${enemyCard.name} died.`)
                }
            } else if (playerCard) {
                // Only the player has a card in this slot. It attacks the enemy player.
                this.enemyHealth -= playerCard.attack
                this.log(
                    `${playerCard.name} dealt ${playerCard.attack} damage to the enemy player.`,
                )
                if (this.enemyHealth < 1) {
                    this.onBattleFinished(true)
                }
            } else if (enemyCard) {
                // Only the enemy has a card in this slot. It attacks the player.
                this.health -= enemyCard.attack
                this.log(
                    `Enemy ${enemyCard.name} dealt ${enemyCard.attack} damage to you.`,
                )
                if (this.health < 1) {
                    this.onBattleFinished(false)
                }
            }
        }

        // Let the enemy act.
        this.enemy.makeMove()

        this.drawCard()
        if (this.maxEnergy < 5) {
            this.maxEnergy += 1
        }
        this.energy = this.maxEnergy

        return effects
    }

    drawCard() {
        if (this.drawPile.length === 0) {
            this.drawPile = this.discardPile
            shuffle(this.drawPile)
            this.discardPile = []
            this.log(`Shuffled discard pile into draw pile.`)
        }
        const card = this.drawPile.pop()
        if (card) {
            this.hand.push(card)
            this.log(`You drew ${card.name}.`)
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
