import V86Starter from "../external/v86/build/libv86.js"
import {Mutex} from "async-mutex"
const PROMPT = "WEB_SHELL_PROMPT> "

class WebShell {
    mutex: Mutex
    emulator: any
    // Whether or not to restore the VM state from a file. Set to false to perform a regular boot.
    restoreState = true
    config = {
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

    constructor() {
        this.mutex = new Mutex()

        if (this.restoreState) {
            this.config["initial_state"] = {
                url: "./images/booted-state.bin.zst",
            }
        }
    }

    // Run a command via the serial port (/dev/ttyS0) and return the output.
    run(
        cmd: string,
        skip_one_prompt = false,
        remove_command_echo = true,
    ): Promise<string> {
        console.log("Called run " + cmd)
        return new Promise(async (resolve, _) => {
            await this.mutex.acquire()
            this.emulator.serial0_send(cmd + "\n")

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
                    this.emulator.remove_listener(
                        "serial0-output-char",
                        listener,
                    )

                    // Remove prompt.
                    output = output.slice(0, -PROMPT.length)
                    console.log(output)

                    if (remove_command_echo) {
                        output = output.slice(output.indexOf("\n") + 1)
                    }

                    if (output.endsWith("\n")) {
                        output = output.slice(0, -1)
                    }

                    console.log(`Resolving for command ${cmd} as '${output}'`)
                    resolve(output)
                    this.mutex.release()
                }
            }
            console.log("Registering listener for command: " + cmd)
            this.emulator.add_listener("serial0-output-char", listener)
        })
    }

    boot(): Promise<void> {
        console.log("Called boot")
        return new Promise((resolve, _) => {
            // Start the this.emulator!
            this.emulator = new V86Starter(this.config)

            // Wait for the this.emulator to start, then resolve the promise.
            var interval = setInterval(async () => {
                if (this.emulator.is_running()) {
                    clearInterval(interval)

                    await this.run(`export PS1='${PROMPT}'`, true, true)
                    //await run("stty -echo", false, true)
                    //await run("whoami")

                    resolve()
                }
            }, 100)
        })
    }
}

export default WebShell
