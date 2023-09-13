import {expect, test} from "vitest"
import WebShell from "./web-shell.ts"
let shell = new WebShell()

test("run a simple command", async () => {
    await shell.boot()
    const result = await shell.run("echo hello")
    expect(result).toBe("hello")
})
