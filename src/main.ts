import WebShell from "./web-shell.ts"

let shell = new WebShell()

window["run"] = shell.run

shell.boot().then(async () => {
    console.log("Booted!")
    let output = await shell.run("whoami")
    console.log(output)
})
