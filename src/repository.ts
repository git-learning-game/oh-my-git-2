import WebShell from "./web-shell.ts"

type ObjectID = string

export enum GitNodeType {
    Blob = "blob",
    Tree = "tree",
    Commit = "commit",
    Tag = "tag",
    Ref = "ref",
}

export abstract class GitNode implements d3.SimulationNodeDatum {
    type: GitNodeType
    label?: string
    tooltip?: string

    x?: number
    y?: number

    abstract id(): string
}

export class GitRef extends GitNode {
    name: string
    target: string

    id(): string {
        return this.name
    }
}

export class GitObject extends GitNode {
    oid: ObjectID

    id(): string {
        return this.oid
    }
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
    type: GitNodeType
    oid: ObjectID
    name: string
}

export class Repository {
    path: string //absolute path
    shell: WebShell
    objects: {[key: ObjectID]: GitObject} = {}
    refs: {[key: string]: GitRef} = {}

    private allNodes: string[] = []

    constructor(path: string, shell: WebShell) {
        this.path = path
        this.shell = shell
    }

    resolve(what: string): GitNode | undefined {
        if (this.objects[what]) {
            return this.objects[what]
        } else if (this.refs[what]) {
            return this.refs[what]
        } else {
            return undefined
        }
    }

    async refTarget(ref: string): Promise<string> {
        // Test whether this is a symbolic ref.
        let ret = await this.shell.run(`git symbolic-ref -q ${ref} || true`)
        if (ret == "") {
            // If it's not, it's probably a regular ref.
            if (ref == "HEAD") {
                ret = (
                    await this.shell.run("git show-ref --head " + ref)
                ).split(" ")[0]
            } else {
                ret = (await this.shell.run("git show-ref " + ref)).split(
                    " ",
                )[0]
            }
        }
        return ret
    }

    async update(): Promise<void> {
        // Keep track of all nodes, so we can delete removed stuff later.
        this.allNodes = []

        await this.updateRefs()
        await this.updateGitObjects()
        await this.updateHead()

        this.removeDeletedNodes()
    }

    removeDeletedNodes(): void {
        for (let o in this.objects) {
            if (!this.allNodes.includes(o)) {
                delete this.objects[o]
            }
        }
        for (let r in this.refs) {
            if (!this.allNodes.includes(r)) {
                delete this.refs[r]
            }
        }
    }

    async getFileList(): Promise<string[]> {
        await this.shell.cd(this.path)
        let output = await this.shell.run("ls -1 --color=none")
        return output.split("\n")
    }

    async updateRefs(): Promise<void> {
        await this.shell.cd(this.path)
        let output = await this.shell.git("show-ref")
        let lines = output.split("\n")
        for (let line of lines) {
            let [oid, name] = line.split(" ")
            if (oid && name) {
                this.allNodes.push(name)
                if (this.refs[name] === undefined) {
                    let ref = new GitRef()
                    ref.name = name
                    ref.target = oid
                    ref.label = name
                    ref.type = GitNodeType.Ref
                    this.refs[name] = ref
                } else {
                    this.refs[name].target = oid
                }
            }
        }
    }

    async updateHead(): Promise<void> {
        this.allNodes.push("HEAD")
        if (this.refs["HEAD"] === undefined) {
            let target = await this.refTarget("HEAD")
            let ref = new GitRef()
            ref.name = "HEAD"
            ref.target = target
            ref.label = "HEAD"
            ref.type = GitNodeType.Ref
            this.refs["HEAD"] = ref
        } else {
            this.refs["HEAD"].target = await this.refTarget("HEAD")
        }
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
                this.allNodes.push(oid)
                if (!this.objects[oid]) {
                    let content = await this.getGitObjectContent(oid)
                    if (type == GitNodeType.Tree) {
                        let entries: GitTreeEntry[] = []
                        for (let line of content.split("\n")) {
                            // line is 'mode type oid\tname'. So split by space and tab!
                            let [mode, type, oid, name] = line.split(/[\s\t]/)
                            entries.push({
                                mode: mode,
                                type: type as GitNodeType,
                                oid: oid,
                                name: name,
                            })
                        }

                        let tree = new GitTree()
                        tree.oid = oid
                        tree.tooltip = content
                        tree.type = GitNodeType.Tree
                        tree.entries = entries
                        this.objects[oid] = tree
                    } else if (type == GitNodeType.Commit) {
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
                        commit.tooltip = content
                        commit.label = oid.slice(0, 7)
                        commit.type = GitNodeType.Commit
                        commit.tree = tree
                        commit.parents = parents
                        commit.author = author
                        commit.message = message
                        this.objects[oid] = commit
                    } else {
                        let blob = new GitBlob()
                        blob.oid = oid
                        blob.tooltip = content
                        blob.type = GitNodeType.Blob
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
