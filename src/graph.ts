import {
    Repository,
    GitNode,
    GitNodeType,
    GitCommit,
    GitTree,
    GitBlob,
    GitRef,
} from "./repository"

import * as d3 from "d3"

export class Graph {
    repo: Repository
    div: HTMLDivElement

    nodes: GitNode[] = []
    simulation: d3.Simulation<
        d3.SimulationNodeDatum,
        d3.SimulationLinkDatum<d3.SimulationNodeDatum>
    >
    links: {source: GitNode; target: GitNode}[] = []

    nodeGroup: d3.Selection<any, any, any, any>
    linkGroup: d3.Selection<any, any, any, any>

    constructor(repo: Repository, div: HTMLDivElement) {
        this.repo = repo
        this.div = div
        this.initGraph()
    }

    update(): void {
        this.nodes = Object.values(this.repo.objects)
        this.nodes = this.nodes.concat(Object.values(this.repo.refs))

        this.simulation.nodes(this.nodes)

        this.links = []
        for (let node of this.nodes) {
            if (node instanceof GitCommit) {
                for (let parent of (node as GitCommit).parents) {
                    this.links.push({
                        source: this.repo.resolve(node.id()),
                        target: this.repo.resolve(parent),
                    })
                }
                this.links.push({
                    source: this.repo.resolve(node.id()),
                    target: this.repo.resolve((node as GitCommit).tree),
                })
            } else if (node instanceof GitTree) {
                for (let entry of (node as GitTree).entries) {
                    this.links.push({
                        source: this.repo.resolve(node.id()),
                        target: this.repo.resolve(entry.oid),
                    })
                }
            } else if (node instanceof GitRef) {
                this.links.push({
                    source: this.repo.resolve(node.id()),
                    target: this.repo.resolve((node as GitRef).target),
                })
            }
        }
        let linkForce: d3.ForceLink<
            d3.SimulationNodeDatum,
            d3.SimulationLinkDatum<d3.SimulationNodeDatum>
        > = this.simulation.force("link")
        linkForce.links(this.links)

        this.nodeGroup = this.nodeGroup.data(this.nodes).join((enter) => {
            let g = enter.append("g")
            let circle = g
                .append("circle")
                .attr("r", 15)
                .attr("fill", (d) => {
                    if (d instanceof GitBlob) {
                        return "gray"
                    } else if (d instanceof GitTree) {
                        return "green"
                    } else if (d instanceof GitCommit) {
                        return "yellow"
                    } else if (d instanceof GitRef) {
                        return "#3c99dc"
                    } else {
                        return "red"
                    }
                })

            g.append("text").text((d) => d.label)
            circle.append("title").text((d) => d.tooltip)

            return g
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

            this.nodeGroup.attr("transform", (d) => {
                return `translate(${d.x}, ${d.y})`
            })
        }

        this.simulation = d3
            .forceSimulation()
            .force("link", d3.forceLink().distance(50))
            .force("charge", d3.forceManyBody().strength(-100))
            .force("center", d3.forceCenter(width / 2, height * 0.6))
            /*.force(
                "commit-y",
                d3.forceY(height / 2).strength((d) => {
                    if (d instanceof GitCommit) {
                        return 1
                    } else {
                        return 0
                    }
                }),
            )
            .force(
                "ref-y",
                d3.forceY(height / 4).strength((d) => {
                    if (d instanceof GitRef) {
                        return 1
                    } else {
                        return 0
                    }
                }),
            )*/
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
