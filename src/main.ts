import {boot, run} from "./web-shell.ts"

window["run"] = run

boot().then(async () => {
    console.log("Booted!")
    let output = await run("whoami")
    console.log(output)
})
