import WebShell from "./web-shell.ts"
import {cloneDeep} from "lodash"

class Card {
    constructor(public name: string) {}
}

class CreatureCard extends Card {
    constructor(
        name: string,
        public attack: number,
        public health: number,
    ) {
        super(name)
    }
}

class CommandCard extends Card {
    constructor(
        name: string,
        public command: Command,
    ) {
        super(name)
    }
}

class Command {
    // Template can contain the following placeholders:
    // FILE - a file name
    // REF - a Git ref
    constructor(public template: string) {}
}

const templates = {
    blobeater: new CreatureCard("Blob Eater", 1, 1),
    clonewarrior: new CreatureCard("Clone Warrior", 2, 2),
    add: new CommandCard("Add", new Command("git add FILE")),
    restore: new CommandCard("Restore", new Command("git restore FILE")),
}

function randomCard(): Card {
    const card =
        Object.values(templates)[
            Math.floor(Math.random() * Object.values(templates).length)
        ]
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
            let fileContent = [
                `name: ${card.name}`,
                `attack: ${card.attack}`,
                `health: ${card.health}`,
            ]
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
