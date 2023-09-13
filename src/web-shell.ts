import V86Starter from "../external/v86/build/libv86.js"

import {Mutex} from "async-mutex"
const mutex = new Mutex()

const PROMPT = "WEB_SHELL_PROMPT> "

var emulator: any

// Whether or not to restore the VM state from a file. Set to false to perform a regular boot.
let restoreState = true

// Run a command via the serial port (/dev/ttyS0) and return the output.
export function run(
    cmd: string,
    skip_one_prompt = false,
    remove_command_echo = true
): Promise<string> {
    console.log("Called run " + cmd)
    return new Promise(async (resolve, _) => {
        await mutex.acquire()
        emulator.serial0_send(cmd + "\n")

        var output = ""
        var listener = (char: string) => {
            if (char !== "\r") {
                output += char
                document.getElementById("output").innerText += char
            }

            if (output.endsWith(PROMPT)) {
                if (skip_one_prompt) {
                    skip_one_prompt = false
                    return
                }
                emulator.remove_listener("serial0-output-char", listener)

                // Remove prompt.
                output = output.slice(0, -PROMPT.length)
                console.log(output)

                if (remove_command_echo) {
                    output = output.slice(output.indexOf("\n") + 1)
                }

                if (output.endsWith("\n")) {
                    output = output.slice(0, -1)
                }

                emulator.remove_listener("serial0-output-char", listener)
                console.log(`Resolving for command ${cmd} as '${output}'`)
                resolve(output)
                mutex.release()
            }
        }
        console.log("Registering listener for command: " + cmd)
        emulator.add_listener("serial0-output-char", listener)
    })
}

/*

// Run a test command and return true if the exit code is 0, false otherwise.
async function test(condition) {
    let result = await run(`test ${condition} && echo 'yes' || echo 'no'`)
    return result == "yes"
}

*/

// Set emulator config.
let config = {
    wasm_path: "../external/v86/build/v86.wasm",
    memory_size: 64 * 1024 * 1024,
    vga_memory_size: 2 * 1024 * 1024,
    screen_container: document.getElementById("screen_container"),
    bios: {url: "./images/seabios.bin"},
    vga_bios: {url: "./images/vgabios.bin"},
    cdrom: {url: "./images/image.iso.zst"},
    disable_mouse: true,
    autostart: true,
}
if (restoreState) {
    config["initial_state"] = {
        url: "./images/booted-state.bin.zst",
    }
}

export function boot(): Promise<void> {
    console.log("Called boot")
    return new Promise((resolve, _) => {
        // Start the emulator!
        emulator = new V86Starter(config)

        // Wait for the emulator to start, then resolve the promise.
        var interval = setInterval(async () => {
            if (emulator.is_running()) {
                clearInterval(interval)

                await run(`export PS1='${PROMPT}'`, true, true)
                //await run("stty -echo", false, true)
                //await run("whoami")

                resolve()
            }
        }, 100)
    })
}

/*

// Allow saving and restoring the state using the buttons below the console.
var state
document.getElementById("save_restore").onclick = async function () {
    var button = this

    if (state) {
        button.value = "Save state"
        await emulator.restore_state(state)
        state = undefined
    } else {
        const new_state = await emulator.save_state()
        console.log("Saved state of " + new_state.byteLength + " bytes")
        button.value = "Restore state"
        state = new_state
    }

    button.blur()
}
document.getElementById("save_file").onclick = async function () {
    const new_state = await emulator.save_state()
    var a = document.createElement("a")
    a.download = "v86state.bin"
    a.href = window.URL.createObjectURL(new Blob([new_state]))
    a.dataset.downloadurl =
        "application/octet-stream:" + a.download + ":" + a.href
    a.click()

    this.blur()
}
document.getElementById("restore_file").onchange = function () {
    if (this.files.length) {
        var filereader = new FileReader()
        emulator.stop()

        filereader.onload = async function (e) {
            await emulator.restore_state(e.target.result)
            emulator.run()
        }

        filereader.readAsArrayBuffer(this.files[0])

        this.value = ""
    }

    this.blur()
}

*/
