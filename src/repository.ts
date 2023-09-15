import WebShell from "./web-shell.ts"
import * as d3 from "d3"

type ObjectID = string

enum GitObjectType {
    Blob = "blob",
    Tree = "tree",
    Commit = "commit",
    Tag = "tag",
}

class GitObject {
    oid: ObjectID
    type: GitObjectType
}

class GitBlob extends GitObject {
    content: string
}

class GitCommit extends GitObject {
    tree: ObjectID
    parents: ObjectID[]
    author: string
    message: string
}

class GitTree extends GitObject {
    entries: GitTreeEntry[]
}

type GitTreeEntry = {
    mode: string
    type: GitObjectType
    oid: ObjectID
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

    initGraph(div: HTMLDivElement): void {
        // Specify the dimensions of the chart.
        const width = 928
        const height = 600

        // Specify the color scale.
        //const color = d3.scaleOrdinal(d3.schemeCategory10)

        const nodeDict: {[key: string]: d3.SimulationNodeDatum} = {
            abc: {},
            def: {},
            ghi: {},
        }

        const nodes = [nodeDict["abc"], nodeDict["def"], nodeDict["ghi"]]

        const links = [
            {source: nodeDict["abc"], target: nodeDict["def"]},
            {source: nodeDict["abc"], target: nodeDict["ghi"]},
        ]

        // The force simulation mutates links and nodes, so create a copy
        // so that re-evaluating this cell produces the same result.
        //const links = data.links.map((d) => ({ ...d }))
        //const nodes = data.nodes.map((d) => ({ ...d }))

        // Create a simulation with several forces.
        const simulation = d3
            .forceSimulation(nodes as d3.SimulationNodeDatum[])
            .force(
                "link",
                d3.forceLink(links), //.id((d) => d.id),
            )
            .force("charge", d3.forceManyBody())
            .force("center", d3.forceCenter(width / 2, height / 2))
            .on("tick", ticked)

        // Create the SVG container.
        const svg = d3
            .create("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("style", "max-width: 100%; height: auto;")

        // Add a line for each link, and a circle for each node.
        const link = svg
            .append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll()
            .data(links)
            .join("line")
        //.attr("stroke-width", (d) => Math.sqrt(d.value))

        const node = svg
            .append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll()
            .data(nodes)
            .join("circle")
            .attr("r", 5)
        //.attr("fill", (d) => color(d.group))

        //node.append("title").text((d) => d.id)

        // Add a drag behavior.
        node.call(
            d3
                .drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended),
        )

        // Set the position attributes of links and nodes each time the simulation ticks.
        function ticked() {
            link.attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y)

            node.attr("cx", (d) => d.x).attr("cy", (d) => d.y)
        }

        // Reheat the simulation when drag starts, and fix the subject position.
        function dragstarted(event) {
            if (!event.active) simulation.alphaTarget(0.3).restart()
            event.subject.fx = event.subject.x
            event.subject.fy = event.subject.y
        }

        // Update the subject (dragged node) position during drag.
        function dragged(event) {
            event.subject.fx = event.x
            event.subject.fy = event.y
        }

        // Restore the target alpha so the simulation cools after dragging ends.
        // Unfix the subject position now that it’s no longer being dragged.
        function dragended(event) {
            if (!event.active) simulation.alphaTarget(0)
            event.subject.fx = null
            event.subject.fy = null
        }

        // When this cell is re-run, stop the previous simulation. (This doesn’t
        // really matter since the target alpha is zero and the simulation will
        // stop naturally, but it’s a good practice.)
        //invalidation.then(() => simulation.stop())

        div.appendChild(svg.node())
    }

    async getGitObjectContent(oid: string): Promise<string> {
        let output = await this.shell.git(`cat-file -p ${oid}`)
        return output
    }
}
