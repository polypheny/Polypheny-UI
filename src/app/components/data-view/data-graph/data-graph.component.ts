import {Component, effect} from '@angular/core';
import {GraphResult} from '../models/result-set.model';
import {DataModel, GraphRequest} from '../../../models/ui-request.model';
import {DataTemplateComponent} from '../data-template/data-template.component';

import * as d3 from "d3";

@Component({
    selector: 'app-data-graph',
    templateUrl: './data-graph.component.html',
    styleUrls: ['./data-graph.component.scss']
})
export class DataGraphComponent extends DataTemplateComponent {

    constructor() {
        super();
        this.initWebsocket();

        effect(() => {
            const result = this.$result();
            if (!result) {
                return;
            }

            this.graphLoading = true;
            d3.select('.svg-responsive').remove();
            this.getGraph(result);
        });
    }

    private hidden: string[];
    private update: () => void;
    private graph: Graph;
    public isLimited: boolean;


    showInsertCard = false;
    jsonValid = false;
    public graphLoading = false;

    showProperties = false;
    detail: Detail;

    private zoom: any;
    private labels: string[];
    private ratio: number;
    private color: any;

    private initialNodeIds: Set<string>;
    private initialNodes: Set<Node>;
    private initialEdgeIds: string[];


    protected readonly NamespaceType = DataModel;

    private static filterEdges(hidden: any[], d: Edge, p: any) {
        const source = !p.afterInit ? d.source : d.source['id'];
        const target = !p.afterInit ? d.target : d.target['id'];

        if (source === target) {
            return true;
        }

        const connectionsIncluded = !hidden.includes(source) && !hidden.includes(target);
        if (connectionsIncluded) {
            if (p.isPath) {
                if (p.initialEdgeIds.includes(d.id)) {
                    return true;
                }
            } else {
                return true;
            }
        }
        return false;
    }

    private renderGraph(graph: Graph) {
        graph.nodes = Array.from(this.initialNodes); // normally this does nothing, but for cross model queries this ensures that the initial nodes are present (different ids)

        if (!this.initialNodeIds) {
            this.initialNodeIds = new Set(graph.nodes.map(n => n.id));
        }

        if (!this.initialEdgeIds) {
            this.initialEdgeIds = graph.edges.map(e => e.id);
        }

        const size = 20;
        const overlaySize = 30;
        const overlayStroke = 3;
        const textSize = 13;
        const linkSize = 9;

        this.graph = graph;

        this.hidden = [];

        for (const n of graph.nodes) {
            if (!this.initialNodeIds.has(n.id)) {
                this.hidden.push(n.id);
            }
        }

        const width = 600;
        const height = 325;

        d3.select('#chart-area > *').remove();

        const svg = d3
            .select('#chart-area')
            .append('div')
            .attr('class', 'svg-responsive')
            .append('svg')
            .attr('preserveAspectRatio', 'xMinYMin meet')
            .attr('viewBox', `0 0 ${width} ${height}`)
            .attr('class', 'svg-content-responsive');

        svg.exit().remove();

        const g = svg.append('g');

        const zoom_actions = (event) => {
            g.attr('transform', event.transform);
        };

        this.zoom = d3.zoom()
            .on('zoom', zoom_actions)
            .filter((event) => !event.button); // fix for windows trackpad zooming

        this.zoom(svg);


        // Add "forces" to the simulation here
        const simulation = d3.forceSimulation()
            .force('center', d3.forceCenter(width / 2, height / 2))
            .force('charge', d3.forceManyBody().strength(-this.initialNodeIds.size))
            .force('collide', d3.forceCollide(100).strength(0.9).radius(40))
            .force('link', d3.forceLink().id(d => d.id).distance(160));


        // disable charge after initial setup
        setInterval(() => simulation.force('charge', null), 1500);

        const action = (d) => {
            this.detail = new Detail(d);
            this.showProperties = true;
        };

        // Change the value of alpha, so things move around when we drag a node
        const onDragStart = (event, d) => {
            action(d);
            if (!event.active) {
                simulation.alphaTarget(0.8).restart();
            }
            d.fx = d.x;
            d.fy = d.y;
        };

        // Fix the position of the node that we are looking at
        const onDrag = (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
        };

        // Let the node do what it wants again once we've looked at it
        const onDragEnd = (event, d) => {
            if (!event.active) {
                simulation.alphaTarget(0);
            }
            d.fx = null;
            d.fy = null;
        };


        let left, t, right, link, links, newLinks, newNode, node, overlay, newOverlay, newSelectionHelp, selectionHelp,
            newText, text, els, linktext, newLinktext, preNode;


        const restart = (p: any) => {
            const hidden = p.hidden;

            g.exit().remove();

            // build the arrow.
            g
                .append('svg:defs')
                .selectAll('marker')
                .data(['end'])      // Different link/path types can be defined here
                .enter()
                .append('svg:marker')    // This section adds in the arrows
                .attr('id', String)
                .attr('viewBox', '0 -5 10 10')
                .attr('refX', 30)
                .attr('refY', 0)
                .attr('markerWidth', 10)
                .attr('markerHeight', 10)
                .attr('orient', 'auto')
                .attr('fill', '#999')
                .append('svg:path')
                .attr('d', 'M0,-5L10,0L0,5');


            // Add lines for every link in the dataset
            newLinks = g
                //.style('border', '1px solid black')
                .append('g')
                .attr('class', 'links')
                .selectAll('path')
                // add edges to hidden nodes
                .data(graph.edges.filter((d) => {
                    return DataGraphComponent.filterEdges(hidden, d, p);
                }));


            newLinks.remove().exit();


            newLinktext = g
                .selectAll('g.linklabelholder')
                .data(graph.edges.filter((d) => DataGraphComponent.filterEdges(hidden, d, p)));

            newLinktext
                .enter()
                .append('svg:g')
                .attr('class', 'linklabelholder')
                .append('text')
                .attr('class', 'linklabel')
                .style('font-size', linkSize + 'px')
                .attr('x', '50')
                .attr('y', '0')
                .attr('dy', '-5')
                .attr('text-anchor', 'start')
                .style('fill', '#000')
                .append('textPath')
                .on('click', action)
                .attr('xlink:href', function (_, i) {
                    return '#linkId_' + i;
                })
                .attr('cursor', 'pointer')
                .on('mouseover', function () {
                    d3.select(this).attr('fill', 'grey');
                })
                .on('mouseout', function () {
                    d3.select(this).attr('fill', '#000');
                })
                .text(function (d) {
                    if (d.labels.length === 0) {
                        return '';
                    } else {
                        return d.labels[0].toUpperCase();
                    }

                });


            link = newLinks
                .enter()
                .filter(d => {
                    return DataGraphComponent.filterEdges(hidden, d, p);
                })
                .append('g')
                .attr('class', 'link')
                .append('path')
                .style('stroke', 'grey')
                //.attr("stroke-width", d => Math.sqrt(d.value))
                .attr('class', function (d) {
                    return 'link ' + d.type;
                })
                .attr('id', function (_, i) {
                    return 'linkId_' + i;
                })
                .attr('marker-end', 'url(#end)');

            link.exit().remove();
            newLinktext.exit().remove();


            preNode = g
                .append('g')
                .attr('class', 'nodes')
                .selectAll('circle')
                .data(graph.nodes.filter((d) => !hidden.includes(d.id)));

            preNode.exit().remove();

            els = preNode
                .enter()
                .append('g')
                .attr('class', 'node');

            els.exit().remove();

            const arc = d3.arc()
                .innerRadius(size + overlayStroke)
                .outerRadius(size + overlayStroke + overlaySize);

            newText = g.selectAll('.name')
                .append('g')
                .attr('class', 'node-label')
                .data(graph.nodes.filter(d => !hidden.includes(d.id)))
                .enter()
                .append('text')
                .attr('pointer-events', 'none');

            newText.exit().remove();

            newText.style('fill', 'black')
                .attr('width', '10')
                .attr('height', '10')
                .attr('dy', 5)
                .attr('text-anchor', 'middle')
                .text(d => {
                    for (const key of Object.keys(d.properties)) {
                        if (key !== '_id') {
                            const prop = d.properties[key];
                            return prop.toString().substring(0, 6);
                        }
                    }
                    return '';
                });

            newText.exit().remove();

            if (newOverlay !== undefined) {
                newOverlay.exit().remove();
            }


            newSelectionHelp = els.append('g').attr('class', 'aid').append('circle').attr('r', size + overlayStroke + overlaySize).attr('fill', 'transparent').attr('display', 'none');

            newOverlay = els.append('g').attr('class', 'overlay').attr('display', 'none');

            t = newOverlay.append('path').attr('fill', 'transparent')
                .attr('stroke-width', overlayStroke)
                .attr('stroke', 'transparent')
                .attr('d', arc({startAngle: -(Math.PI / 3), endAngle: (Math.PI / 3)}));

            right = newOverlay.append('path').attr('fill', 'grey')
                .attr('stroke-width', overlayStroke)
                .attr('stroke', 'white')
                .style('cursor', 'pointer')
                .attr('d', arc({startAngle: 0, endAngle: Math.PI}))
                .on('mouseover', function () {
                    d3.select(this).attr('fill', 'darkgray');
                })
                .on('mouseout', function () {
                    d3.select(this).attr('fill', 'grey');
                })
                .on('click', (d) => {
                    graph.edges.filter(function (e) {
                        return d.id === e.source['id'] || d.id === e.target['id']; //connected nodes
                    }).forEach((e) => {
                        if (this.hidden.indexOf(e.id) !== -1) {
                            this.hidden = this.hidden.filter((i) => i !== e.id);
                        }
                        const id = e.source['id'] !== d.id ? e.source['id'] : e.target['id'];
                        if (this.hidden.indexOf(id) !== -1) {
                            this.hidden = this.hidden.filter((i) => i !== id);
                        }
                    });

                    this.update();
                });

            left = newOverlay.append('path').attr('fill', 'grey')
                .attr('stroke-width', overlayStroke)
                .attr('stroke', 'white')
                .style('cursor', 'pointer')
                .attr('d', arc({startAngle: -Math.PI, endAngle: 0}))
                .on('mouseover', function () {
                    d3.select(this).attr('fill', 'darkgray');
                })
                .on('mouseout', function () {
                    d3.select(this).attr('fill', 'grey');
                })
                .on('click', (d) => {
                    hidden.push(d.id);
                    this.update();
                });

            newOverlay.append('text').attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .attr('font-family', 'FontAwesome')
                .attr('font-size', textSize + 'px')
                .attr('fill', 'white')
                .attr('class', 'el-select el-back fa')
                .style('transform', 'translateX(-35px)')
                .style('pointer-events', 'none')
                .text(function () {
                    return '\uf070';
                });

            newOverlay.append('text').attr('text-anchor', 'middle')
                .attr('dominant-baseline', 'central')
                .attr('font-family', 'CoreUI-Icons-Free')
                .attr('font-size', textSize + 'px')
                .attr('fill', 'white')
                .attr('class', 'el-select el-cross')
                .style('transform', 'translateX(35px)')
                .style('pointer-events', 'none')
                .text(function () {
                    return '\uebd8';
                });

            newOverlay.selectAll();

            p.labels = new Set();

            for (const e of graph.edges) {
                e.labels.forEach(l => p.labels.add(l));
            }

            for (const n of graph.nodes) {
                n.labels.forEach(l => p.labels.add(l));
            }

            p.labels = Array.from(p.labels);
            p.color = d3.interpolateSinebow;
            p.ratio = 1 / p.labels.length;


            // Add circles for every node in the dataset
            newNode = els
                .append('circle')
                .attr('r', size)
                .attr('fill', d => {
                    const i = p.labels.indexOf(d.labels[0]);
                    return p.color(p.ratio * i);
                })
                .on('click', action)
                .attr('cursor', 'pointer')
                .call(
                    d3
                        .drag()
                        .on('start', onDragStart)
                        .on('drag', onDrag)
                        .on('end', onDragEnd)
                );

            newNode.exit().remove();

            els.on('mouseover', function (d) {
                d3.select(this).select('.overlay').transition().attr('display', 'inherit');
                d3.select(this).select('.aid').attr('display', 'inherit').select('circle').attr('display', 'inherit');
            })
                .on('mouseout', function (d) {
                    d3.select(this).select('.overlay').transition().duration(200).attr('display', 'none');
                    d3.select(this).select('.aid').attr('display', 'none');
                });


            g.exit().remove();

        };

        // Dynamically update the position of the nodes/links as time passes
        const onTick = () => {

            link.attr('d', function (d) {
                const dx = d.target.x - d.source.x,
                    dy = d.target.y - d.source.y,
                    dr = 0;  //linknum is defined above
                return 'M' + d.source.x + ',' + d.source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + d.target.x + ',' + d.target.y;
            });
            els
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            node
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);
            overlay.attr('transform', function (d) {
                return 'translate(' + d.x + ',' + d.y + ')';
            });

            selectionHelp
                .attr('cx', d => d.x)
                .attr('cy', d => d.y);

            text
                .attr('x', function (d) {
                    return d.x;
                })
                .attr('y', function (d) {
                    return d.y;
                });
        };

        restart(this);


        node = newNode;
        text = newText;
        links = newLinks;
        overlay = newOverlay;
        selectionHelp = newSelectionHelp;
        activate();


        //	general update pattern for updating the graph
        this.update = () => {
            g.selectAll('*').remove();
            restart(this);
            node = newNode;
            links = newLinks;
            overlay = newOverlay;
            text = newText;
            linktext = newLinktext;
            selectionHelp = newSelectionHelp;
            activate();

        };


        function activate() {
            // Attach nodes to the simulation, add listener on the "tick" event
            simulation
                .nodes(graph.nodes)
                .on('tick', onTick);

            // Associate the lines with the "link" force
            simulation
                .force('link')
                .links(graph.edges);

            simulation.alpha(1).alphaTarget(0).restart();
        }

        const reset = () => {
            this.hidden = [];
        };

    }

    center() {
        d3.select('svg')
            .transition().duration(500)
            .call(this.zoom.transform, d3.zoomIdentity);
    }

    initWebsocket() {
        const sub = this.webSocket.onMessage().subscribe({
            next: res => {
                this.graphLoading = false;
                this.renderGraph(Graph.from(res['nodes'], res['edges']));
            },
            error: err => {
                this._toast.error('Could not load the data.');
                console.log(err);
            }
        });
        this.subscriptions.add(sub);
    }

    getGraph(graphResult: GraphResult) {
        const nodeIds: Set<string> = new Set();
        const edgeIds: Set<string> = new Set();
        let i = -1;

        for (const dbColumn of graphResult.header) {
            i++;
            const dataType: string = dbColumn.dataType.trim().toLowerCase();
            if (!dataType.startsWith('node') && !dataType.startsWith('edge') && !dataType.startsWith('path')) {
                continue;
            }

            this.initialNodes = new Set();

            if (dataType.startsWith('node')) {
                graphResult.data.forEach(d => {
                    const node = JSON.parse(d[i]);
                    const id = node['id'];
                    if (!nodeIds.has(id)) {
                        nodeIds.add(id);
                        this.initialNodes.add(node)
                    }
                });
            } else if (dataType.startsWith('edge')) {
                graphResult.data.forEach(d => {
                    edgeIds.add(JSON.parse(d[i])['id']);
                });
            } else if (dataType.startsWith('path')) {
                graphResult.data.forEach(d => {
                    for (const el of JSON.parse(d[i]).path) {
                        if (el.type.includes('NODE')) {
                            nodeIds.add(el.id);
                        }
                        if (el.type.includes('EDGE')) {
                            edgeIds.add(el.id);
                        }
                    }
                });
            }

            this.initialNodeIds = nodeIds;
            this.initialEdgeIds = Array.from(edgeIds);
        }


        if (!graphResult.header.map(h => h.dataType.toLowerCase()).includes('graph')) {
            // is native
            if (!this._crud.getGraph(this.webSocket, new GraphRequest(graphResult.namespace, nodeIds, edgeIds))) {
                // is printed every time console.log('Could not retrieve the graphical representation of the graph.');
            } else {
                this.graphLoading = true;
            }
        } else {
            this.graphLoading = false;
            const graph = Graph.from(graphResult.data.map(r => r.map(n => JSON.parse(n)).reduce((a, v) => ({
                ...a['id'],
                [v]: v
            }))), []);

            this.renderGraph(graph);
        }
    }

    setJsonValid($event: any) {
        this.jsonValid = $event;
    }

    showInsert() {
        this.editing = null;
        this.showInsertCard = true;
    }

    getLabelColor(label: string): string {
        const i = this.labels.indexOf(label);
        return this.color(this.ratio * i);
    }

    reset() {
        this.hidden = [];

        for (const n of this.graph.nodes) {
            if (!this.initialNodeIds.has(n.id)) {
                this.hidden.push(n.id);
            }
        }
        this.update();
    }
}


class Edge {
    id: string;
    labels: any[];
    properties: any[];
    direction: string;
    source: string;
    target: string;
}

class Node {
    id: string;
    labels: any[];
    properties: Map<string, any>;
}


class Graph {
    nodes: Node[];
    edges: Edge[];
    selfEdges: Edge[];

    public static from(n: any, e: any): Graph {
        const nodes = <Node[]>Object.values(n);
        const edges = <Edge[]>Object.values(e).filter(d => d['source'] !== d['target']);

        return new Graph(nodes, edges);
    }

    constructor(nodes: Node[], edges: Edge[]) {
        this.nodes = nodes;
        this.edges = edges;
        this.selfEdges = edges.filter(d => d['source'] === d['target']);
    }

}

class Detail {
    constructor(d) {
        this.id = d.id;
        this.properties = d.properties;
        this.labels = d.labels;
    }

    id: string;
    properties: {};
    labels: string[];
}
