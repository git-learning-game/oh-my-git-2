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

    async start() {
        this.shell.boot().then(async () => {
            console.log("Booted!")
            await this.shell.run("mkdir /root/repo")
            this.shell.type("cd repo\n")
            await this.shell.cd("/root/repo")
            await this.shell.run("git config --global init.defaultBranch main;")
            await this.shell.run("git config --global user.name 'You';")
            await this.shell.run(
                "git config --global user.email 'mail@example.com'",
            )
            await this.shell.run("git init")
            //"git init; echo hi > test.txt; git add .; git commit -m 'Initial commit'",
            //await this.shell.run("echo hi >> test.txt; git commit -am 'Second commit'")

            //updateLoop()
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
        setTimeout(() => this.update(), 50)
        setTimeout(() => this.update(), 500)
    }
}

let app = new App()
app.start()
