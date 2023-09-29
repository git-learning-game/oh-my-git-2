// @ts-ignore
import V86Starter from "../public/v86/libv86.js"

import {Mutex} from "async-mutex"

class WebShell {
    private mutex: Mutex
    private mutex2: Mutex
    private emulator: any

    // Whether or not to restore the VM state from a file. Set to false to perform a regular boot.
    private restoreState = true
    private config: any = {
        wasm_path: "./v86/v86.wasm",
        memory_size: 64 * 1024 * 1024,
        vga_memory_size: 2 * 1024 * 1024,
        bios: {url: "./v86/seabios.bin"},
        vga_bios: {url: "./v86/vgabios.bin"},
        cdrom: {url: "./v86/image.iso.zst"},
        disable_mouse: true,
        autostart: true,
    }
    private serialDiv?: HTMLDivElement

    private prompt = "/ # "

    private serialBuffer = ""

    constructor(screen?: HTMLDivElement, serial?: HTMLDivElement) {
        this.mutex = new Mutex()
        this.mutex2 = new Mutex()

        if (screen) {
            let screenDiv = screen
            screenDiv.style.whiteSpace = "pre"
            screenDiv.style.fontFamily = "Iosevka"
            screenDiv.style.fontSize = "18px"
            screenDiv.style.lineHeight = "20px"

            let innerDiv = document.createElement("div")
            let canvas = document.createElement("canvas")
            canvas.style.display = "none"

            screenDiv.appendChild(innerDiv)
            screenDiv.appendChild(canvas)

            this.config["screen_container"] = screenDiv
        }

        if (typeof serial !== "undefined") {
            this.serialDiv = serial
        }

        if (this.restoreState) {
            this.config["initial_state"] = {
                url: "./v86/booted-state.bin.zst",
            }
        }
    }

    private appendToSerialDiv(text: string) {
        /* Disabled for performance reasons!
        this.serialBuffer += text
        if (this.serialBuffer.includes("\n")) {
            if (typeof this.serialDiv !== "undefined") {
                let currentContent = this.serialDiv.textContent
                let maxLength = 10000
                if (currentContent === null) {
                    currentContent = ""
                }
                if (currentContent.length > maxLength) {
                    currentContent = currentContent.slice(
                        currentContent.length - maxLength,
                    )
                }
                this.serialDiv.textContent = currentContent + this.serialBuffer
                this.serialBuffer = ""
            } else {
                console.log(this.serialBuffer)
            }
        }
        */
    }

    async send(chars: string): Promise<void> {
        this.emulator.serial0_send(chars)
        this.appendToSerialDiv(chars)
    }

    wait_for(chars: string): Promise<void> {
        return new Promise((resolve, _) => {
            let output = ""
            let listener = (char: string) => {
                if (char !== "\r") {
                    output += char
                    this.appendToSerialDiv(char)
                }
                if (output.endsWith(chars)) {
                    this.emulator.remove_listener(
                        "serial0-output-char",
                        listener,
                    )
                    resolve()
                }
            }
            this.emulator.add_listener("serial0-output-char", listener)
        })
    }

    git(command: string): Promise<string> {
        return this.run(`git ${command}`)
    }

    async cd(path: string): Promise<void> {
        await this.run(`cd ${path}`)
    }

    async run(cmd: string): Promise<string> {
        await this.mutex2.acquire()
        let output = await this.run_unsafe(cmd)
        let exit_code = await this.run_unsafe("echo $?")
        this.mutex2.release()

        if (exit_code != "0") {
            throw new Error(`Command '${cmd}' exited with code '${exit_code}'`)
        }
        return output
    }

    async script(cmds: string[]): Promise<void> {
        for (let cmd of cmds) {
            await this.run(cmd)
        }
    }

    // Run a command via the serial port (/dev/ttyS0) and return the output.
    run_unsafe(
        cmd: string,
        skip_one_prompt = false,
        echo_on = true,
    ): Promise<string> {
        return new Promise(async (resolve, _) => {
            await this.mutex.acquire()
            let startTime = Date.now()

            this.emulator.serial0_send(cmd + "\n")
            if (!echo_on) {
                this.appendToSerialDiv(cmd + "\n")
            }

            var output = ""
            var listener = (char: string) => {
                if (char !== "\r") {
                    output += char
                    this.appendToSerialDiv(char)
                }

                if (output.endsWith(this.prompt)) {
                    if (skip_one_prompt) {
                        skip_one_prompt = false
                        return
                    }
                    this.emulator.remove_listener(
                        "serial0-output-char",
                        listener,
                    )

                    // Remove prompt.
                    output = output.slice(0, -this.prompt.length)

                    if (echo_on) {
                        // Remove entered command.
                        output = output.slice(cmd.length + 1)
                    }

                    if (output.endsWith("\n")) {
                        output = output.slice(0, -1)
                    }

                    // Add timing information.
                    let endTime = Date.now()
                    let duration = endTime - startTime
                    this.appendToSerialDiv(`(${duration} ms) `)
                    if (this.serialDiv !== undefined) {
                        this.serialDiv.scrollTop = this.serialDiv.scrollHeight
                    }

                    resolve(output)
                    this.mutex.release()
                }
            }
            this.emulator.add_listener("serial0-output-char", listener)
        })
    }

    boot(): Promise<void> {
        return new Promise((resolve, _) => {
            // Start the this.emulator!
            //@ts-ignore
            this.emulator = new V86Starter(this.config)

            // Wait for the this.emulator to start, then resolve the promise.
            var interval = setInterval(async () => {
                if (this.emulator.is_running()) {
                    clearInterval(interval)

                    this.prompt = "WEB_SHELL_PROMPT> "
                    await this.run_unsafe(
                        `export PS1='${this.prompt}'`,
                        true,
                        true,
                    )

                    // Set terminal width so that input lines don't wrap.
                    await this.run_unsafe("stty cols 1000", false, true)

                    // By default HOME seems to be set to "/"?
                    await this.run_unsafe("export HOME=/root")

                    resolve()
                }
            }, 100)
        })
    }

    type(text: string): void {
        this.emulator.keyboard_send_text(text)
    }

    async putFile(path: string, lines: string[]): Promise<void> {
        let escapedContent = lines.join("\n").replace(/'/g, "'\\''")
        await this.run(`echo '${escapedContent}' > ${path}`)
        return
    }

    setKeyboardActive(active: boolean): void {
        this.emulator.keyboard_set_status(active)
    }
}

export default WebShell
