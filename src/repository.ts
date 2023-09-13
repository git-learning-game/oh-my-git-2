import WebShell from "./web-shell.ts"

export default class Repository {
    path: string //absolute path
    shell: WebShell

    constructor(path: string, shell: WebShell) {
        this.path = path
        this.shell = shell
    }

    async getFileList(): Promise<string[]> {
        await this.shell.cd(this.path)
        let output = await this.shell.run("ls -1 --color=none")
        return output.split("\n")
    }

    async getGitObjects(): Promise<string[]> {
        await this.shell.cd(this.path)
        let output = await this.shell.git(
            "cat-file --batch-check='%(objectname) %(objecttype)' --batch-all-objects | cut -f1 -d' '",
        )
        return output.split("\n")
    }
}
