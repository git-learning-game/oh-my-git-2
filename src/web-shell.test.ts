import {expect, test} from "vitest"
import {boot, run} from "./web-shell.ts"

test("run a simple command", async () => {
    await boot()
    const result = await run("echo hello")
    expect(result).toBe("hello")
})
