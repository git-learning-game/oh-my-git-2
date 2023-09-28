import WebShell from "./web-shell.ts"

type ObjectID = string

export enum GitNodeType {
    Blob = "blob",
    Tree = "tree",
    Commit = "commit",
    Tag = "tag",
}

export abstract class GitNode implements d3.SimulationNodeDatum {
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

export class GitBlob extends GitObject {
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
    oid: ObjectID
    name: string
}

export class GitIndex extends GitNode {
    entries: IndexEntry[] = []

    id(): string {
        return "INDEX"
    }
}

type IndexEntry = {
    mode: string
    oid: ObjectID
    name: string
}

export class UnAddedFile extends GitNode {
    name: string
    content: string

    id(): string {
        return this.name
        // TODO collision potential!
    }
}

type WorkingDirectoryEntry = {
    name: string
    oid?: ObjectID
}

export class WorkingDirectory extends GitNode {
    entries: WorkingDirectoryEntry[] = []

    id(): string {
        return "WORKING_DIRECTORY"
    }
}

export class Repository {
    path: string //absolute path
    shell: WebShell
    objects: {[key: ObjectID]: GitObject} = {}
    refs: {[key: string]: GitRef} = {}
    index: GitIndex = new GitIndex()
    files: {[key: string]: UnAddedFile} = {}
    workingDirectory: WorkingDirectory = new WorkingDirectory()

    private allNodes: string[] = []

    constructor(path: string, shell: WebShell) {
        this.path = path
        this.shell = shell

        this.index.label = "Index"

        this.workingDirectory.label = "Working dir"
    }

    resolve(what: string): GitNode | undefined {
        if (this.objects[what]) {
            return this.objects[what]
        } else if (this.refs[what]) {
            return this.refs[what]
        } else if (this.files[what]) {
            return this.files[what]
        } else if (what == "INDEX") {
            return this.index
        } else if (what == "WORKING_DIRECTORY") {
            return this.workingDirectory
        } else {
            return undefined
        }
    }

    async refTarget(ref: string): Promise<string> {
        // Test whether this is a symbolic ref.
        let ret = await this.shell.run(`git symbolic-ref -q ${ref} || true`)
        if (ret == "") {
            // If it's not, it's probably a regular ref.
            ret = await this.shell.run(`git rev-parse ${ref}`)
        }
        return ret
    }

    // The difference to the previous version is that this might return undefined,
    // if the ref doesn't exist.
    async maybeRefTarget(ref: string): Promise<string | undefined> {
        let ret = await this.shell.run(`git symbolic-ref -q ${ref} || true`)
        if (ret == "") {
            try {
                ret = await this.shell.run(`git rev-parse ${ref}`)
            } catch (e) {
                return undefined
            }
        }
        return ret
    }

    async update(): Promise<void> {
        // Keep track of all nodes, so we can delete removed stuff later.
        this.allNodes = []

        await this.updateRefs()
        await this.updateGitObjects()
        await this.updateSpecialRefs()
        await this.updateIndex()
        await this.updateWorkingDirectory()

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
        let output = await this.shell.run("ls -1 --color=none")
        return output.split("\n")
    }

    async updateRefs(): Promise<void> {
        let output = await this.shell.git("show-ref || true")
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
                    this.refs[name] = ref
                } else {
                    this.refs[name].target = oid
                }
            }
        }
    }

    async updateSpecialRefs(): Promise<void> {
        let specialRefs = ["HEAD", "FETCH_HEAD", "ORIG_HEAD", "MERGE_HEAD"]
        for (let ref of specialRefs) {
            await this.updateSpecialRef(ref)
        }
    }

    async updateSpecialRef(name: string): Promise<void> {
        let target = await this.maybeRefTarget(name)

        if (target === undefined) {
            // Ref doesn't exist. That's okay.
        } else {
            if (this.refs[name] === undefined) {
                let ref = new GitRef()
                ref.name = name
                ref.label = name
                this.refs[name] = ref
            }
            this.refs[name].target = target
            this.allNodes.push(name) // TODO: This might conflict with an OID hash?
        }
    }

    async updateIndex(): Promise<void> {
        let output = await this.shell.git("ls-files -s")
        this.index.tooltip = output
        let lines = output.split("\n")
        this.index.entries = []
        for (let line of lines) {
            if (line !== "") {
                let [mode, oid, _, name] = line.split(/[\s\t]/)
                this.index.entries.push({
                    mode,
                    oid,
                    name,
                })
            }
        }
    }

    async updateWorkingDirectory(): Promise<void> {
        var output = await this.shell.run(
            "find . -type f -not -path '*/\\.git/*'",
        )
        let lines = output.split("\n")
        this.workingDirectory.entries = []
        this.workingDirectory.tooltip = output
        this.files = {}
        for (let line of lines) {
            let name = line.substr(2)
            if (name !== "") {
                // Check if this file has already been hashed.
                try {
                    // Yup!
                    let oid = await this.shell.run(`git hash-object "${name}"`)
                    this.workingDirectory.entries.push({name, oid})
                } catch (e) {
                    // Nope!
                    this.workingDirectory.entries.push({name})
                    this.files[name] = await this.buildUnAddedFile(name)
                    this.allNodes.push(name)
                }
            }
        }
    }

    async buildUnAddedFile(name: string): Promise<UnAddedFile> {
        let file = new UnAddedFile()
        let content = await this.shell.run(`cat "${name}"`)
        file.content = content
        file.label = name
        file.tooltip = content
        return file
    }

    buildTree(content: string): GitTree {
        let tree = new GitTree()

        let entries: GitTreeEntry[] = []
        for (let line of content.split("\n")) {
            if (line !== "") {
                // line is 'mode type oid\tname'. So split by space and tab!
                let [mode, _, oid, name] = line.split(/[\s\t]/)
                entries.push({
                    mode: mode,
                    oid: oid,
                    name: name,
                })
            }
        }

        tree.entries = entries
        return tree
    }

    buildCommit(content: string): GitCommit {
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
        commit.tree = tree
        commit.parents = parents
        commit.author = author
        commit.message = message
        return commit
    }

    async updateGitObjects(): Promise<void> {
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
                    let object: GitObject
                    if (type == GitNodeType.Tree) {
                        object = this.buildTree(content)
                    } else if (type == GitNodeType.Commit) {
                        object = this.buildCommit(content)
                    } else {
                        object = new GitBlob()
                    }
                    object.oid = oid
                    object.tooltip = content
                    object.label = oid.slice(0, 7)
                    this.objects[oid] = object
                }
            }
        }
    }

    async getGitObjectContent(oid: string): Promise<string> {
        let output = await this.shell.git(`cat-file -p ${oid}`)
        return output
    }
}
