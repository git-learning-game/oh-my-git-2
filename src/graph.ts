import {
    Repository,
    GitObject,
    GitObjectType,
    GitCommit,
    GitTree,
} from "./repository"

import * as d3 from "d3"

export class Graph {
    repo: Repository
    div: HTMLDivElement

    nodes: GitObject[] = []
    simulation: d3.Simulation<
        d3.SimulationNodeDatum,
        d3.SimulationLinkDatum<d3.SimulationNodeDatum>
    >
    links: {source: GitObject; target: GitObject}[] = []

    nodeGroup: d3.Selection<any, any, any, any>
    linkGroup: d3.Selection<any, any, any, any>

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

        this.nodeGroup = this.nodeGroup.data(this.nodes).join((enter) => {
            let enter2 = enter
                .append("circle")
                .attr("r", 15)
                .attr("fill", (d) => {
                    if (d.type == GitObjectType.Blob) {
                        return "gray"
                    } else if (d.type == GitObjectType.Tree) {
                        return "green"
                    } else if (d.type == GitObjectType.Commit) {
                        return "yellow"
                    } else {
                        return "red"
                    }
                })

            enter2.append("title").text((d) => d.content)

            return enter2
        })

        this.linkGroup = this.linkGroup
            .data(this.links)
            .join((enter) =>
                enter
                    .append("line")
                    .attr("stroke", "black")
                    .attr("stroke-width", 2),
            )

        this.nodeGroup.call(
            d3
                .drag()
                .on("start", (event) => {
                    console.log(event)
                    if (!event.active)
                        this.simulation.alphaTarget(0.3).restart()
                    event.subject.fx = event.subject.x
                    event.subject.fy = event.subject.y
                })
                .on("drag", (event) => {
                    event.subject.fx = event.x
                    event.subject.fy = event.y
                })
                .on("end", (event) => {
                    if (!event.active) this.simulation.alphaTarget(0)
                    event.subject.fx = null
                    event.subject.fy = null
                }),
        )

        this.simulation.alpha(1).restart()
    }

    initGraph(): void {
        const width = 928
        const height = 600

        let ticked = () => {
            this.linkGroup
                .attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y)

            this.nodeGroup.attr("cx", (d) => d.x).attr("cy", (d) => d.y)
        }

        this.simulation = d3
            .forceSimulation()
            .force("link", d3.forceLink().distance(50))
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(width / 2, height / 2))
            .on("tick", ticked)

        const svg = d3
            .create("svg")
            .attr("width", width)
            .attr("height", height)
            .attr("viewBox", [0, 0, width, height])
            .attr("style", "max-width: 100%; height: auto;")

        this.linkGroup = svg
            .append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", 2)
            .selectAll()

        this.nodeGroup = svg.append("g").selectAll()

        this.div.appendChild(svg.node())
    }
}
