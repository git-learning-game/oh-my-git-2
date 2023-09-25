import WebShell from "./web-shell.ts"
import * as d3 from "d3"

type ObjectID = string

enum GitObjectType {
    Blob = "blob",
    Tree = "tree",
    Commit = "commit",
    Tag = "tag",
}

class GitObject implements d3.SimulationNodeDatum {
    oid: ObjectID
    type: GitObjectType
    x?: number
    y?: number
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

export class Graph {
    repo: Repository
    div: HTMLDivElement

    nodes: GitObject[] = []
    simulation: d3.Simulation<
        d3.SimulationNodeDatum,
        d3.SimulationLinkDatum<d3.SimulationNodeDatum>
    >
    links: {source: GitObject; target: GitObject}[] = []

    nodeThing: d3.Selection<any, any, any, any>
    linkThing: d3.Selection<any, any, any, any>

    constructor(repo: Repository, div: HTMLDivElement) {
        this.repo = repo
        this.div = div
        this.initGraph()
    }

    updateNodesAndLinks(): void {
        this.nodes = Object.values(this.repo.objects)
        this.simulation.nodes(this.nodes)

        this.links = []
        for (let node of this.nodes) {
            if (node.type == GitObjectType.Commit) {
                for (let parent of (node as GitCommit).parents) {
                    this.links.push({
                        source: this.repo.objects[node.oid],
                        target: this.repo.objects[parent],
                    })
                }
                this.links.push({
                    source: this.repo.objects[node.oid],
                    target: this.repo.objects[(node as GitCommit).tree],
                })
            } else if (node.type == GitObjectType.Tree) {
                for (let entry of (node as GitTree).entries) {
                    this.links.push({
                        source: this.repo.objects[node.oid],
                        target: this.repo.objects[entry.oid],
                    })
                }
            }
        }
        let linkForce: d3.ForceLink<
            d3.SimulationNodeDatum,
            d3.SimulationLinkDatum<d3.SimulationNodeDatum>
        > = this.simulation.force("link")
        linkForce.links(this.links)

        this.nodeThing = this.nodeThing
            .data(this.nodes)
            .join((enter) =>
                enter.append("circle").attr("r", 10).attr("fill", "red"),
            )

        this.linkThing = this.linkThing
            .data(this.links)
            .join((enter) =>
                enter
                    .append("line")
                    .attr("stroke", "black")
                    .attr("stroke-width", 2),
            )

        this.simulation.alpha(1).restart()
    }

    initGraph(): void {
        // Specify the dimensions of the chart.
        const width = 928
        const height = 600

        // Specify the color scale.
        //const color = d3.scaleOrdinal(d3.schemeCategory10)

        // The force simulation mutates links and nodes, so create a copy
        // so that re-evaluating this cell produces the same result.
        //const links = data.links.map((d) => ({ ...d }))
        //const nodes = data.nodes.map((d) => ({ ...d }))

        // Set the position attributes of links and nodes each time the simulation ticks.
        let ticked = () => {
            this.linkThing
                .attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y)

            this.nodeThing.attr("cx", (d) => d.x).attr("cy", (d) => d.y)
        }

        // Create a simulation with several forces.
        this.simulation = d3
            .forceSimulation()
            .force("link", d3.forceLink().distance(50))
            .force("charge", d3.forceManyBody().strength(-100))
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
        this.linkThing = svg
            .append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .selectAll()

        this.nodeThing = svg
            .append("g")
            .attr("stroke", "#fff")
            .attr("stroke-width", 1.5)
            .selectAll()
        //.attr("fill", (d) => color(d.group))

        //node.append("title").text((d) => d.id)

        // Add a drag behavior.

        this.nodeThing.call(
            d3
                .drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended),
        )

        // Reheat the simulation when drag starts, and fix the subject position.
        function dragstarted(event) {
            if (!event.active) this.simulation.alphaTarget(0.3).restart()
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
            if (!event.active) this.simulation.alphaTarget(0)
            event.subject.fx = null
            event.subject.fy = null
        }

        // When this cell is re-run, stop the previous simulation. (This doesn’t
        // really matter since the target alpha is zero and the simulation will
        // stop naturally, but it’s a good practice.)
        //invalidation.then(() => simulation.stop())

        this.div.appendChild(svg.node())
    }
}
