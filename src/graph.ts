import {
    Repository,
    GitNode,
    GitCommit,
    GitTree,
    GitBlob,
    GitRef,
    GitIndex,
    WorkingDirectory,
    UnAddedFile,
} from "./repository"

import * as d3 from "d3"

export class Graph {
    repo: Repository
    div: HTMLDivElement

    simulation: d3.Simulation<
        d3.SimulationNodeDatum,
        d3.SimulationLinkDatum<d3.SimulationNodeDatum>
    >

    nodeGroup: d3.Selection<any, any, any, any>
    linkGroup: d3.Selection<any, any, any, any>

    constructor(repo: Repository, div: HTMLDivElement) {
        this.repo = repo
        this.div = div

        const width = 928
        const height = 600

        let ticked = () => {
            this.linkGroup
                .select("line")
                .attr("x1", (d) => d.source.x)
                .attr("y1", (d) => d.source.y)
                .attr("x2", (d) => d.target.x)
                .attr("y2", (d) => d.target.y)

            this.linkGroup.select("text").attr("transform", (d) => {
                let x = (d.source.x + d.target.x) / 2
                let y = (d.source.y + d.target.y) / 2
                return `translate(${x}, ${y})`
            })

            this.nodeGroup.attr("transform", (d) => {
                return `translate(${d.x}, ${d.y})`
            })
        }

        this.simulation = d3
            .forceSimulation()
            .force(
                "link",
                d3.forceLink().distance((d: any) => {
                    if (d.label !== undefined) {
                        return 100
                    } else {
                        return 50
                    }
                }),
            )
            .force("charge", d3.forceManyBody().strength(-100))
            .force(
                "center",
                d3.forceCenter(width / 2, height / 2).strength(0.2),
            )
            /*.force(
                "x",
                d3
                    .forceX(function (d) {
                        if (d instanceof GitCommit) {
                            return width * 0.4
                        } else if (d instanceof GitBlob) {
                            return width * 0.6
                        } else if (
                            d instanceof GitIndex ||
                            d instanceof WorkingDirectory
                        ) {
                            return width * 0.8
                        } else {
                            return 0
                        }
                    })
                    .strength(function (d) {
                        if (
                            d instanceof GitCommit ||
                            d instanceof GitBlob ||
                            d instanceof GitIndex ||
                            d instanceof WorkingDirectory
                        ) {
                            return 0.3
                        } else {
                            return 0
                        }
                    }),
            )*/
            .force("cx", d3.forceX(width / 2).strength(0.01))
            .force("cy", d3.forceY(height / 2).strength(0.01))
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

        function zoomed(event: d3.D3ZoomEvent<SVGSVGElement, unknown>) {
            g.attr("transform", event.transform as any)
        }

        svg.call(
            d3
                .zoom()
                .extent([
                    [0, 0],
                    [width, height],
                ])
                .scaleExtent([0.5, 8])
                .on("zoom", zoomed) as any,
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
            .attr("fill", "#111")

        this.linkGroup = g.append("g").selectAll()

        this.nodeGroup = g.append("g").selectAll()

        let svgNode = svg.node()
        if (svgNode !== null) {
            this.div.appendChild(svgNode)
        }
    }

    update(): void {
        //const old = new Map(this.nodeGroup.data().map((d) => [d.id(), d]))
        let nodes: GitNode[] = Object.values(this.repo.objects)
        /*this.nodes = this.nodes.map((d) =>
            Object.assign(old.get(d.id()) || {}, d),
        )*/
        nodes = nodes.concat(Object.values(this.repo.refs))
        //nodes = nodes.concat(Object.values(this.repo.files))
        //nodes.push(this.repo.index)
        //nodes.push(this.repo.workingDirectory)

        this.simulation.nodes(nodes).alphaTarget(0.3)

        let links: {source: GitNode; target: GitNode; label?: string}[] = []

        let tryAddLink = (
            sourceID: string,
            targetID: string,
            label?: string,
        ): void => {
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
            links.push({source, target, label})
        }

        for (let node of nodes) {
            if (node instanceof GitCommit) {
                for (let parent of (node as GitCommit).parents) {
                    tryAddLink(node.id(), parent)
                }
                //tryAddLink(node.id(), (node as GitCommit).tree)
                /* } else if (node instanceof GitTree) {
                for (let entry of (node as GitTree).entries) {
                    tryAddLink(node.id(), entry.oid, entry.name)
                }
            } */
            } else if (node instanceof GitRef) {
                let target = this.repo.resolve((node as GitRef).target)
                if (target !== undefined) {
                    tryAddLink(node.id(), (node as GitRef).target)
                }
            }
        }

        /*for (let entry of this.repo.index.entries) {
            tryAddLink(
                this.repo.index.id(),
                entry.oid,
                entry.name + (entry.stage > 0 ? ` (${entry.stage})` : ""),
            )
        }

        for (let entry of this.repo.workingDirectory.entries) {
            tryAddLink(
                this.repo.workingDirectory.id(),
                entry.oid || entry.name,
                entry.name,
            )
        }*/

        //links = links.map((d) => Object.assign({}, d))

        let linkForce: any = this.simulation.force("link")
        linkForce.links(links)

        this.nodeGroup = this.nodeGroup
            .data(nodes, (d) => d.id())
            .join(
                (enter) => {
                    let g = enter.append("g").style("cursor", "pointer")

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
                            } else if (d instanceof WorkingDirectory) {
                                return "images/wd.png"
                            } else if (d instanceof UnAddedFile) {
                                return "images/file.png"
                            } else {
                                return "images/generic.png"
                            }
                        })

                    g.on("mouseover", function (_, __) {
                        d3.select(this)
                            .filter((d: any) => d.tooltip !== "")
                            .select(".tooltip")
                            .style("visibility", "visible")
                    }).on("mouseout", function (_, __) {
                        d3.select(this)
                            .select(".tooltip")
                            .style("visibility", "hidden")
                    })

                    g.append("text")
                        .attr("transform", "translate(-16, 5)")
                        .text((d) => d.label)

                    let tooltip = g
                        .append("g")
                        .attr("class", "tooltip")
                        .attr("transform", "translate(-16, 20)")
                        .style("visibility", "hidden")

                    tooltip
                        .append("foreignObject")
                        .attr("width", 600)
                        .attr("height", 1000)
                        .append("xhtml:p")
                        .text((d) => d.tooltip)
                        .style("color", "black")
                        .style("white-space", "pre")
                        .style("background-color", "rgba(255, 255, 255, 0.8)")
                        .style("border-radius", "5px")
                        .style("padding", "5px")

                    return g
                },
                (update) => {
                    update.select("text").text((d) => d.label)
                    update.select("title").text((d) => d.tooltip)
                    update.select(".tooltip p").text((d) => d.tooltip)
                    return update
                },
                (exit) => {
                    exit.remove()
                    return exit
                },
            )

        this.linkGroup = this.linkGroup.data(links).join(
            (enter) => {
                let g = enter.append("g")

                g.append("line")
                    .attr("stroke", "#111")
                    .attr("stroke-width", 2)
                    .attr("marker-end", "url(#arrowhead)")

                g.filter((d: any) => d.label !== undefined)
                    .append("text")
                    .attr("text-anchor", "middle")
                    .attr("dominant-baseline", "middle")
                    .attr("font-style", "italic")
                    .attr("fill", "#444")
                    .text((d: any) => d.label)

                return g
            },
            (update) => {
                update.select("text").text((d: any) => d.label)
                return update
            },
        )

        this.nodeGroup.call(
            d3
                .drag()
                .on("start", (event) => {
                    //if (!event.active)
                    //    this.simulation.alphaTarget(0.3).restart()
                    event.subject.fx = event.subject.x
                    event.subject.fy = event.subject.y
                })
                .on("drag", (event) => {
                    event.subject.fx = event.x
                    event.subject.fy = event.y
                })
                .on("end", (event) => {
                    //if (!event.active) this.simulation.alphaTarget(0)
                    event.subject.fx = null
                    event.subject.fy = null
                }),
        )

        this.simulation.alpha(0.3).restart()
    }
}
