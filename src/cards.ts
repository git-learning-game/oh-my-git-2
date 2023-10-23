import WebShell from "./web-shell.ts"
import {cloneDeep} from "lodash"
import * as YAML from "yaml"

export class Card {
    constructor(
        public name: string,
        public energy: number,
    ) {}
}

export class CreatureCard extends Card {
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

const creatureTemplates = [
    new CreatureCard("Graph Gnome", 1, 1, 2),
    new CreatureCard("Blob Eater", 2, 2, 2),
    new CreatureCard("Time Snail", 1, 1, 1),
    new CreatureCard("Clone Warrior", 4, 2, 5),
    new CreatureCard("Merge Monster", 4, 4, 4),
    new CreatureCard("Detached Head", 1, 0, 2),
    new CreatureCard("Rubber Duck", 1, 1, 1),
    new CreatureCard("Collab Centaur", 1, 1, 1),
]

const commandTemplates = [
    //new CommandCard("Init", 0, new Command("git init")),
    new CommandCard("Remove", 0, new Command("git rm FILE")),
    new CommandCard("Add", 1, new Command("git add FILE")),
    new CommandCard("Add all", 2, new Command("git add .")),
    new CommandCard("Restore", 2, new Command("git restore FILE")),
    new CommandCard("Commit", 2, new Command("git commit -m 'Commit'")),
    new CommandCard(
        "Commit all",
        3,
        new Command("git add .; git commit -m 'Commit'"),
    ),
    //new CommandCard("Stash", 3, new Command("git stash")),
    //new CommandCard("Pop stash", 2, new Command("git stash pop")),
    new CommandCard("Branch", 1, new Command("git branch FILE")), // TODO: Allow branch targets
    new CommandCard("Switch", 1, new Command("git switch -f FILE")), // TODO: Allow branch targets
    new CommandCard("Merge", 2, new Command("git merge FILE")), // TODO: Allow branch targets

    /* TODO:
    cp
    mv
    restore -s
    restore
    */
]

const templates = [...creatureTemplates, ...commandTemplates]

function randomCard(array: Card[]): Card {
    const card = array[Math.floor(Math.random() * array.length)]
    return cloneDeep(card)
}

// https://stackoverflow.com/a/12646864/248734
function shuffle(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
    }
}

export class SideEffect {}

export class FileChangeEffect extends SideEffect {
    constructor(
        public path: string,
        public content: string,
    ) {
        super()
    }
}

export class FileDeleteEffect extends SideEffect {
    constructor(public path: string) {
        super()
    }
}

export class CommandEffect extends SideEffect {
    constructor(public command: string) {
        super()
    }
}

export class CardGame {
    eventLog: string[] = []

    health = 20
    enemyHealth = 20

    drawPile: Card[] = []
    hand: Card[] = []
    discardPile: Card[] = []

    slots: (CreatureCard | null)[] = [null, null, null]
    enemySlots: (CreatureCard | null)[] = [null, null, null]

    constructor(private shell: WebShell) {
        //for (let i = 0; i < deckSize; i++) {
        //    this.drawPile.push(randomCard(templates))
        //}
        for (let template of templates) {
            this.drawPile.push(cloneDeep(template))
        }
        shuffle(this.drawPile)
        const handSize = 5
        for (let i = 0; i < handSize; i++) {
            this.drawCard()
        }
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
        console.log(card)
        let success = false
        let output = ""
        if (card instanceof CreatureCard) {
            this.slots[target - 1] = cloneDeep(card)
            let fileContent = card.stringify()
            effects.push(
                new FileChangeEffect(`/root/repo/${target}`, fileContent),
            )
            this.log(`Played ${card.name} to slot ${target}.`)
            success = true
        } else if (card instanceof CommandCard) {
            const command = card.command.template.replace("FILE", `${target}`)
            effects.push(new CommandEffect(command))
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
                    effects.push(new FileDeleteEffect(`/root/repo/${i + 1}`))
                    this.log(`Your ${playerCard.name} died.`)
                } else {
                    let fileContent = playerCard.stringify()
                    effects.push(
                        new FileChangeEffect(
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
            } else if (enemyCard) {
                // Only the enemy has a card in this slot. It attacks the player.
                this.health -= enemyCard.attack
                this.log(
                    `Enemy ${enemyCard.name} dealt ${enemyCard.attack} damage to you.`,
                )
            }
        }

        // Add a random enemy.
        let randomSlot = Math.floor(Math.random() * this.enemySlots.length)
        let randomEnemy = randomCard(creatureTemplates) as CreatureCard
        this.enemySlots[randomSlot] = randomEnemy
        this.log(`Enemy played ${randomEnemy.name} to slot ${randomSlot + 1}.`)

        this.drawCard()

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
