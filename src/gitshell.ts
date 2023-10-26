import WebShell from "./web-shell.ts"

export class GitShell extends WebShell {
    constructor() {
        super()
    }

    async boot() {
        await super.boot()
        //this.shell.type("stty rows 15\n")
        //this.shell.type("clear\n")
        //this..setKeyboardActive(false)
        await this.runConfigureCommands()

        //await runLazynessCommands()

        //this.shell.setKeyboardActive(true)
        //shell.type("source ~/.aliases\n")

        /*this.shell.type("cd repo\n")
        this.shell.type("clear\n")
        this.shell.type(
            "# If you're not usig a QWERTY keyboard, you can set your keyboard layout using this command: loadkeys <de/fr/...>\n",
        )*/
    }

    async enterNewGitRepo() {
        await this.script([
            "rm -rf /root/repo",
            "mkdir /root/repo",
            "cd /root/repo",
            "git init",
        ])
        this.type("cd /root/repo\nclear\n")
    }

    async runConfigureCommands() {
        await this.putFile("~/.gitconfig", [
            "[init]",
            "    defaultBranch = main",
            "[user]",
            "    name = You",
            "    email = mail@example.com",
            "[alias]",
            "    graph = log --graph --pretty=oneline --abbrev-commit --all --decorate",
            "    st = status",
            "    take = checkout -b",
            "[color]",
            "    ui = never",
        ])
    }

    async runLazynessCommands() {
        await this.putFile("~/.aliases", [
            "alias ga='git add'",
            "alias gc='git commit'",
            "alias gca='git commit -a'",
            "alias gcaa='git commit -a --amend'",
            "alias gco='git checkout'",
            "alias gd='git diff'",
            "alias gg='git graph'",
            "alias gs='git status --short'",
            "alias gec='git commit --allow-empty -m \"Empty commit\"'",

            "alias l='ls -al'",
        ])
    }
}
