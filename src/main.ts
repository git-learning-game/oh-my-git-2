import WebShell from "./web-shell.ts"
import {Repository, Graph} from "./repository.ts"

let shell = new WebShell(document.getElementById("terminal") as HTMLDivElement)
let repo = new Repository("/root", shell)

window["run"] = shell.run.bind(shell)
window["shell"] = shell

window.addEventListener("keydown", (e) => {
    console.log(e)
})

shell.boot().then(async () => {
    console.log("Booted!")
    await shell.cd("/root")
    await shell.run("git config --global user.name 'You';")
    await shell.run("git config --global user.email 'mail@example.com'")
    await shell.run(
        "git init; touch test.txt; git add .; git commit -m 'Initial commit'",
    )
    await shell.run("echo hi >> test.txt; git commit -am 'Second commit'")

    let objects = repo.objects
    document.getElementById("objects").innerText = JSON.stringify(
        objects,
        null,
        2,
    )

    await repo.updateGitObjects()
    let graph = new Graph(
        repo,
        document.getElementById("graph") as HTMLDivElement,
    )
})
