import WebShell from "./web-shell.ts"
import {Repository} from "./repository.ts"
import {Graph} from "./graph.ts"

let shell = new WebShell(
    document.getElementById("screen") as HTMLDivElement,
    document.getElementById("serial") as HTMLDivElement,
)
let repo = new Repository("/root/repo", shell)

window["run"] = shell.run.bind(shell)
window["shell"] = shell

window.addEventListener("keydown", (e) => {
    console.log(e)
})

let graph = new Graph(repo, document.getElementById("graph") as HTMLDivElement)

shell.boot().then(async () => {
    console.log("Booted!")
    await shell.run("mkdir /root/repo")
    await shell.cd("/root/repo")
    await shell.run("git config --global user.name 'You';")
    await shell.run("git config --global user.email 'mail@example.com'")
    await shell.run(
        "git init; echo hi > test.txt; git add .; git commit -m 'Initial commit'",
    )
    //await shell.run("echo hi >> test.txt; git commit -am 'Second commit'")

    //updateLoop()
})

async function update() {
    await repo.updateGitObjects()
    let objects = repo.objects
    document.getElementById("objects").innerText = JSON.stringify(
        objects,
        null,
        2,
    )
    graph.updateNodesAndLinks()
}

async function updateLoop() {
    await update()
    setTimeout(updateLoop, 1000)
}

document.getElementById("update").addEventListener("click", update)
