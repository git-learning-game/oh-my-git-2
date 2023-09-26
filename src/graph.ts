import {
    Repository,
    GitNode,
    GitCommit,
    GitTree,
    GitBlob,
    GitRef,
    GitIndex,
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
        //const old = new Map(this.nodeGroup.data().map((d) => [d.id(), d]))
        this.nodes = Object.values(this.repo.objects)
        /*this.nodes = this.nodes.map((d) =>
            Object.assign(old.get(d.id()) || {}, d),
        )*/
        this.nodes = this.nodes.concat(Object.values(this.repo.refs))
        this.nodes.push(this.repo.index)

        this.simulation.nodes(this.nodes)

        this.links = []

        let tryAddLink = (sourceID: string, targetID: string): void => {
            let source = this.repo.resolve(sourceID)
            if (source === undefined) {
                throw new Error(
                    `Link source with id ${sourceID} not found in repo`,
                )
            }
            let target = this.repo.resolve(targetID)
            if (target === undefined) {
                throw new Error(
                    `Link target with id ${targetID} not found in repo`,
                )
            }
            this.links.push({source, target})
        }

        for (let node of this.nodes) {
            if (node instanceof GitCommit) {
                for (let parent of (node as GitCommit).parents) {
                    tryAddLink(node.id(), parent)
                }
                tryAddLink(node.id(), (node as GitCommit).tree)
            } else if (node instanceof GitTree) {
                for (let entry of (node as GitTree).entries) {
                    tryAddLink(node.id(), entry.oid)
                }
            } else if (node instanceof GitRef) {
                let target = this.repo.resolve((node as GitRef).target)
                if (target !== undefined) {
                    tryAddLink(node.id(), (node as GitRef).target)
                }
            }
        }

        for (let entry of this.repo.index.entries) {
            tryAddLink(this.repo.index.id(), entry.oid)
        }

        //this.links = this.links.map((d) => Object.assign({}, d))

        let linkForce: d3.ForceLink<
            d3.SimulationNodeDatum,
            d3.SimulationLinkDatum<d3.SimulationNodeDatum>
        > = this.simulation.force("link")
        linkForce.links(this.links)

        this.nodeGroup = this.nodeGroup
            .data(this.nodes, (d) => d.id())
            .join(
                (enter) => {
                    let g = enter.append("g")

                    g.append("svg:image")
                        .attr("x", -15)
                        .attr("y", -15)
                        .attr("width", 30)
                        .attr("height", 30)
                        .attr("xlink:href", (d) => {
                            if (d instanceof GitBlob) {
                                return "images/blob.png"
                            } else if (d instanceof GitTree) {
                                return "images/tree.png"
                            } else if (d instanceof GitCommit) {
                                return "images/commit.png"
                            } else if (d instanceof GitRef) {
                                return "images/ref.png"
                            } else if (d instanceof GitIndex) {
                                return "images/index.png"
                            } else {
                                return "images/generic.png"
                            }
                        })

                    g.on("mouseover", function (_, __) {
                        d3.select(this)
                            .select(".tooltip text")
                            .style("visibility", "visible")
                    }).on("mouseout", function (_, __) {
                        d3.select(this)
                            .select(".tooltip text")
                            .style("visibility", "hidden")
                    })

                    g.append("text").text((d) => d.label)

                    let tooltip = g
                        .append("g")
                        .attr("class", "tooltip")
                        .attr("transform", "translate(0, 20)")
                        .style("visibility", "hidden")

                    tooltip.append("text").text((d) => d.tooltip)

                    return g
                },
                (update) => {
                    update.select("text").text((d) => d.label)
                    update.select("title").text((d) => d.tooltip)
                    update.select(".tooltip text").text((d) => d.tooltip)
                    return update
                },
                (exit) => {
                    exit.remove()
                    return exit
                },
            )

        this.linkGroup = this.linkGroup
            .data(this.links)
            .join((enter) =>
                enter
                    .append("line")
                    .attr("stroke", "black")
                    .attr("stroke-width", 2)
                    .attr("marker-end", "url(#arrowhead)"),
            )

        this.nodeGroup.call(
            d3
                .drag()
                .on("start", (event) => {
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
            .force("charge", d3.forceManyBody().strength(-50))
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

        const g = svg.append("g")

        svg.call(
            d3
                .zoom()
                .extent([
                    [0, 0],
                    [width, height],
                ])
                .scaleExtent([1, 8])
                .on("zoom", ({transform}) => {
                    g.attr("transform", transform)
                }),
        )

        // Add a marker for the arrowhead.
        let markerBoxWidth = 10
        let markerBoxHeight = 10
        let refX = 13
        let refY = 2.5
        let arrowPoints: [number, number][] = [
            [0, 0],
            [0, 5],
            [5, 2.5],
        ]
        svg.append("defs")
            .append("marker")
            .attr("id", "arrowhead")
            .attr("viewBox", [0, 0, markerBoxWidth, markerBoxHeight])
            .attr("refX", refX)
            .attr("refY", refY)
            .attr("markerWidth", markerBoxWidth)
            .attr("markerHeight", markerBoxHeight)
            .attr("orient", "auto-start-reverse")
            .append("path")
            .attr("d", d3.line()(arrowPoints))
            .attr("stroke", "black")

        this.linkGroup = g
            .append("g")
            .attr("stroke", "#999")
            .attr("stroke-opacity", 0.6)
            .attr("stroke-width", 2)
            .selectAll()

        this.nodeGroup = g.append("g").selectAll()

        this.div.appendChild(svg.node())
    }
}
