import WebShell from "./web-shell.ts"
import {Graph} from "./graph.ts"

type ObjectID = string

export enum GitObjectType {
    Blob = "blob",
    Tree = "tree",
    Commit = "commit",
    Tag = "tag",
}

export class GitObject implements d3.SimulationNodeDatum {
    oid: ObjectID
    type: GitObjectType
    content: string
    x?: number
    y?: number
}

class GitBlob extends GitObject {
    content: string
}

export class GitCommit extends GitObject {
    tree: ObjectID
    parents: ObjectID[]
    author: string
    message: string
}

export class GitTree extends GitObject {
    entries: GitTreeEntry[]
}

type GitTreeEntry = {
    mode: string
    type: GitObjectType
    oid: ObjectID
    name: string
}

export class Repository {
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
                        for (let line of content.split("\n")) {
                            // line is 'mode type oid\tname'. So split by space and tab!
                            let [mode, type, oid, name] = line.split(/[\s\t]/)
                            entries.push({
                                mode: mode,
                                type: type as GitObjectType,
                                oid: oid,
                                name: name,
                            })
                        }

                        let tree = new GitTree()
                        tree.oid = oid
                        tree.content = content
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
                        commit.content = content
                        commit.type = GitObjectType.Commit
                        commit.tree = tree
                        commit.parents = parents
                        commit.author = author
                        commit.message = message
                        this.objects[oid] = commit
                    } else {
                        let blob = new GitBlob()
                        blob.oid = oid
                        blob.content = content
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
