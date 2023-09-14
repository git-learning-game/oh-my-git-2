import WebShell from "./web-shell.ts"

enum GitObjectType {
    Blob = "blob",
    Tree = "tree",
    Commit = "commit",
    Tag = "tag",
}

class GitObject {
    oid: string
    type: GitObjectType
}

class GitBlob extends GitObject {
    content: string
}

class GitCommit extends GitObject {
    tree: string
    parents: string[]
    author: string
    message: string
}

class GitTree extends GitObject {
    entries: GitTreeEntry[]
}

type GitTreeEntry = {
    mode: string
    type: GitObjectType
    oid: string
    name: string
}

export default class Repository {
    path: string //absolute path
    shell: WebShell
    objects: {[key: string]: GitObject} = {}

    constructor(path: string, shell: WebShell) {
        this.path = path
        this.shell = shell
    }

    async getFileList(): Promise<string[]> {
        await this.shell.cd(this.path)
        let output = await this.shell.run("ls -1 --color=none")
        return output.split("\n")
    }

    async updateGitObjects(): Promise<void> {
        await this.shell.cd(this.path)
        let output = await this.shell.git(
            "cat-file --batch-check='%(objectname) %(objecttype)' --batch-all-objects",
        )
        let lines = output.split("\n")
        for (let line of lines) {
            let [oid, type] = line.split(" ")
            if (oid && type) {
                if (!this.objects[oid]) {
                    let content = await this.getGitObjectContent(oid)
                    if (type == GitObjectType.Tree) {
                        let entries: GitTreeEntry[] = []
                        for (let entry of content.split("\n")) {
                            let [mode, type, oid, name] = entry.split(" ")
                            entries.push({
                                mode,
                                type: type as GitObjectType,
                                oid,
                                name,
                            })
                        }
                        let tree = new GitTree()
                        tree.oid = oid
                        tree.type = GitObjectType.Tree
                        tree.entries = entries
                        this.objects[oid] = tree
                    } else if (type == GitObjectType.Commit) {
                        let lines = content.split("\n")
                        let tree = lines[0].split(" ")[1]
                        let parents: string[] = []
                        let author = ""
                        let message = ""
                        for (let line of lines.slice(1)) {
                            if (line.startsWith("parent")) {
                                parents.push(line.split(" ")[1])
                            } else if (line.startsWith("author")) {
                                author = line.split(" ").slice(1).join(" ")
                            } else if (line.startsWith("committer")) {
                                //ignore
                            } else {
                                message = line
                            }
                        }
                        let commit = new GitCommit()
                        commit.oid = oid
                        commit.type = GitObjectType.Commit
                        commit.tree = tree
                        commit.parents = parents
                        commit.author = author
                        commit.message = message
                        this.objects[oid] = commit
                    } else {
                        let blob = new GitBlob()
                        blob.oid = oid
                        blob.type = GitObjectType.Blob
                        blob.content = content
                        this.objects[oid] = blob
                    }
                }
            }
        }
    }

    async getGitObjectContent(oid: string): Promise<string> {
        let output = await this.shell.git(`cat-file -p ${oid}`)
        return output
    }
}
