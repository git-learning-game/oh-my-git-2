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

const templates = [
    new CommandCard("Init", 0, new Command("git init")),
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
    new CommandCard("Stash", 3, new Command("git stash")),
    new CommandCard("Pop stash", 2, new Command("git stash pop")),
    new CommandCard("Branch", 1, new Command("git branch FILE")), // TODO: Allow branch targets
    new CommandCard("Switch", 1, new Command("git switch -f FILE")), // TODO: Allow branch targets
    new CommandCard("Merge", 2, new Command("git merge FILE")), // TODO: Allow branch targets

    /* TODO:
    cp
    mv
    restore -s
    restore
    */

    new CreatureCard("Graph Gnome", 1, 1, 2),
    new CreatureCard("Blob Eater", 2, 2, 2),
    new CreatureCard("Time Snail", 1, 1, 1),
    new CreatureCard("Clone Warrior", 4, 2, 5),
    new CreatureCard("Merge Monster", 4, 4, 4),
    new CreatureCard("Detached Head", 1, 0, 2),
    new CreatureCard("Rubber Duck", 1, 1, 1),
    new CreatureCard("Collab Centaur", 1, 1, 1),
]

function randomCard(): Card {
    const card = templates[Math.floor(Math.random() * templates.length)]
    return cloneDeep(card)
}

// https://stackoverflow.com/a/12646864/248734
function shuffle(array: any[]) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        ;[array[i], array[j]] = [array[j], array[i]]
    }
}

export class CardGame {
    drawPile: Card[] = []
    hand: Card[] = []
    discardPile: Card[] = []

    slots: (CreatureCard | null)[] = [null, null, null]
    enemySlots: (CreatureCard | null)[] = [null, null, null]

    constructor(private shell: WebShell) {
        const deckSize = 10
        for (let i = 0; i < deckSize; i++) {
            this.drawPile.push(randomCard())
        }
        const handSize = 5
        for (let i = 0; i < handSize; i++) {
            this.drawCard()
        }
    }

    async playCardFromHand(i: number, target: number) {
        if (i < 0 || i >= this.hand.length) {
            throw new Error(`Invalid hand index: ${i}`)
        }
        const card = this.hand[i]
        console.log(card)
        let success = false
        let output = ""
        if (card instanceof CreatureCard) {
            let fileContent = [card.stringify()]
            this.shell.putFile(`/root/repo/${target}`, fileContent)
            success = true
        } else if (card instanceof CommandCard) {
            const command = card.command.template.replace("FILE", `${target}`)
            const result = await this.shell.run_with_exit_code(command)
            if (result.exit_code == 0) {
                success = true
            }
            output = result.output
        } else {
            throw new Error(`Unknown card type: ${card}`)
        }
        if (success) {
            this.discardHandCard(i)
        }
        return output
    }

    drawCard() {
        if (this.drawPile.length === 0) {
            this.drawPile = this.discardPile
            shuffle(this.drawPile)
            this.discardPile = []
        }
        const card = this.drawPile.pop()
        if (card) {
            this.hand.push(card)
        }
    }

    discardHandCard(i: number) {
        if (i < 0 || i >= this.hand.length) {
            throw new Error(`Invalid hand index: ${i}`)
        }
        const card = this.hand.splice(i, 1)[0]
        this.discardPile.push(card)
    }

    print() {
        console.log("Hand:")
        for (const card of this.hand) {
            console.log(card)
        }
    }
}
