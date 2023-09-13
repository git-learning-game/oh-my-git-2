import WebShell from "./web-shell.ts"
import Repository from "./repository.ts"

let shell = new WebShell(document.getElementById("terminal") as HTMLDivElement)
let repo = new Repository("/root", shell)

window["run"] = shell.run.bind(shell)

shell.boot().then(async () => {
    console.log("Booted!")
    let output = await shell.run("whoami")
    console.log(output)

    await shell.cd("/root")
    await shell.run("git init; touch test.txt; git add .;")
    console.log(await repo.getGitObjects())
})
