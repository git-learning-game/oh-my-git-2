import WebShell from "./web-shell.ts"
import Repository from "./repository.ts"

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
    await shell.run("git init; touch test.txt; git add .;")
    setInterval(async () => {
        let objects = await repo.getGitObjects()
        document.getElementById("objects").innerText = JSON.stringify(
            objects,
            null,
            2,
        )
    }, 1000)
})
