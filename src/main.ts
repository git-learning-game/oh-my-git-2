import WebShell from "./web-shell.ts"

let shell = new WebShell(document.getElementById("terminal") as HTMLDivElement)

window["run"] = shell.run.bind(shell)

shell.boot().then(async () => {
    console.log("Booted!")
    let output = await shell.run("whoami")
    console.log(output)
})
