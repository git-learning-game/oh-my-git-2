import WebShell from "./web-shell.ts"
import {Repository} from "./repository.ts"
import {Graph} from "./graph.ts"

// Show a warning when the user tries to leave the page (for example, by pressing Ctrl-W...)
//window.onbeforeunload = function (e) {
//    e.preventDefault()
//    e.returnValue = ""
//}

class App {
    shell: WebShell
    repo: Repository
    graph: Graph

    constructor() {
        this.shell = new WebShell(
            document.getElementById("screen") as HTMLDivElement,
            document.getElementById("serial") as HTMLDivElement,
        )

        window["run"] = this.shell.run.bind(this.shell)
        window["this.shell"] = this.shell

        this.repo = new Repository("/root/repo", this.shell)

        this.graph = new Graph(
            this.repo,
            document.getElementById("graph") as HTMLDivElement,
        )
    }

    async runConfigureCommands() {
        await this.shell.putFile("~/.gitconfig", [
            "[init]",
            "    defaultBranch = main",
            "[user]",
            "    name = You",
            "    email = mail@example.com",
            "[alias]",
            "    graph = log --graph --pretty=oneline --abbrev-commit --all --decorate",
            "    st = status",
            "    take = checkout -b",
            "[color]",
            "    ui = never",
        ])
    }

    async runLazynessCommands() {
        await this.shell.putFile("~/.aliases", [
            "alias ga='git add'",
            "alias gc='git commit'",
            "alias gca='git commit -a'",
            "alias gcaa='git commit -a --amend'",
            "alias gco='git checkout'",
            "alias gd='git diff'",
            "alias gg='git graph'",
            "alias gs='git status --short'",
            "alias gec='git commit --allow-empty -m \"Empty commit\"'",

            "alias l='ls -al'",
        ])
        this.shell.type("source ~/.aliases\nclear\n")
    }

    async runInitCommands() {
        await this.shell.script([
            "mkdir /root/repo",
            "cd /root/repo",

            "git init",

            "touch apple",
            "git add .",
            "git commit -m 'Apple exists'",
            "echo 'green' > apple",
            "git commit -am 'Apple is green'",
            "git checkout @^",
            "echo 'red' > apple",
            "git commit -am 'Apple is red'",
        ])
    }

    async start() {
        this.shell.boot().then(async () => {
            console.log("Booted!")
            await this.runConfigureCommands()
            await this.runLazynessCommands()
            await this.runInitCommands()

            this.shell.type("cd repo\nclear\n")

            this.updateACoupleOfTimes()

            window.addEventListener("keydown", (e) => {
                if (e.key == "Enter") {
                    this.updateACoupleOfTimes()
                }
            })
        })
    }

    async update() {
        console.log(this, this.repo)
        await this.repo.update()
        let displayed = {
            index: this.repo.index,
            objects: this.repo.objects,
            refs: this.repo.refs,
        }
        document.getElementById("objects").innerText = JSON.stringify(
            displayed,
            null,
            2,
        )

        this.graph.update()
    }

    updateACoupleOfTimes() {
        setTimeout(async () => {
            await this.update(), setTimeout(() => this.update(), 450)
        }, 50)
    }
}

let app = new App()
app.start()
