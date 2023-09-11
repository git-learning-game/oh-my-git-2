import { boot, run } from "./web-shell.ts"

window["run"] = run

boot().then(() => {
    console.log("Booted!")
})
