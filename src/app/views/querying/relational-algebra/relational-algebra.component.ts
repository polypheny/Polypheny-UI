import {
    AfterViewInit,
    Component,
    ElementRef,
    HostBinding,
    OnDestroy,
    OnInit,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
import {Connection, LogicalOperator, Node} from './relational-algebra.model';
import {ResultSet} from '../../../components/data-table/models/result-set.model';
import {CrudService} from '../../../services/crud.service';
import {ToastService} from '../../../components/toast/toast.service';
import * as $ from 'jquery';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/ui/widgets/droppable';
import {SvgLine} from '../../uml/uml.model';
import {SchemaRequest} from '../../../models/ui-request.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {Ace} from "ace-builds";
import execEventHandler = Ace.execEventHandler;
import {WebSocketService} from "../../../services/web-socket.service";
import {RightSidebarToRelationalalgebraService} from "../../../services/right-sidebar-to-relationalalgebra.service";

@Component({
    selector: 'app-relational-algebra',
    templateUrl: './relational-algebra.component.html',
    styleUrls: ['./relational-algebra.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class RelationalAlgebraComponent implements OnInit, AfterViewInit, OnDestroy {

    @ViewChild('dropArea', {static: false}) dropArea: ElementRef;
    @HostBinding('class.is-open')
    resultSet: ResultSet;
    private counter = 0;
    public connections = new Map<string, Connection>();
    public nodes = new Map<string, Node>();
    public temporalLine: SvgLine;
    operators = [];
    autocomplete;// names of the schemas, tables and columns

    //temporal values while dragging
    scrollTop: number;
    scrollLeft: number;
    draggingNodeX: number;
    draggingNodeY: number;
    dropMouseX: number;
    dropMouseY: number;
    socketOn: boolean;

    private lastNode = null;

    constructor(
        private _crud: CrudService,
        private _toast: ToastService,
        private _webSocketService: WebSocketService,
        private _RsToRa: RightSidebarToRelationalalgebraService
    ) {
        this.socketOn = false;
    }


    ngOnInit() {
        this.getOperators();
        this.getAutocomplete();
        this._RsToRa.change.subscribe(run => {
            this.makeSocketConnection();
        });
    }

    ngAfterViewInit() {
        this.initDraggable();
    }

    ngOnDestroy() {
        this.counter = 0;
        $(document).off();
        $('#drop').off();
    }

    /**
     * When a node from the left side is dropped in the working area
     */
    dropped(event) {
        if (event.previousContainer.id === 'operatorList') {
            const id = 'node' + this.counter++;
            const x = Math.max(0, Math.min(this.dropArea.nativeElement.offsetWidth - 270, this.dropMouseX));
            const y = Math.max(0, Math.min(this.dropArea.nativeElement.offsetHeight - 140, this.dropMouseY));
            const node = new Node(id, event.item.data, x, y);
            if (event.item.data === 'TableScan') {
                const ac = [];
                if (this.autocomplete) {
                    this.autocomplete.schemas.forEach((v1, i1) => {
                        this.autocomplete[v1].tables.forEach((v2, i2) => {
                            ac.push(v1 + '.' + v2);
                        });
                    });
                    node.setAutocomplete(ac);
                }
            }
            this.nodes.set(id, node);
        }
    }

    dropMousePosition(event) {
        this.dropMouseX = event.layerX;
        this.dropMouseY = event.layerY;
    }

    /**
     * initialize the functionality that nodes can be connected by drag and drop
     */
    initDraggable() {
        const self = this;

        let isDragging = false;
        let source = '';
        $(document).on('mousedown', '#drop .node .out', function (e) {
            isDragging = true;
            $('#drop').addClass('connecting');
            const x = $(e.target).parents('.node').parent().position().left + $(e.target).parents('.node').outerWidth() / 2;
            const y = $(e.target).parents('.node').parent().position().top;
            self.temporalLine = {x1: x, x2: x, y1: y, y2: y};
            source = $(e.target).parents('.node').attr('id');
            e.preventDefault();
        }).on('mousemove', function (e) {
            if (isDragging) {
                e.preventDefault();
                const dropContainer = $('#drop');
                const x = e.pageX - $(dropContainer).offset().left;
                const y = e.pageY - $(dropContainer).offset().top;
                self.temporalLine.x2 = x;
                self.temporalLine.y2 = y;
            }
        }).on('mouseup', function (e) {
            if (!isDragging) {
                return;
            }
            if ($(e.target).hasClass('in')) {
                const target = $(e.target).parents('.node').attr('id');
                if (source !== target) {//don't allow to connect with own node
                    self.addConnection(source, target);
                }
            }
            isDragging = false;
            $('#drop').removeClass('connecting');
            self.temporalLine = null;
        });

    }

    /**
     * Delete a node and all connections that belong to it
     */
    deleteNode(node: Node) {
        const id = node.getId();
        this.connections.forEach((v, k) => {
            if (v.target.getId() === id || v.source.getId() === id) {
                this.connections.delete(k);
            }
        });
        this.nodes.delete(id);
        this.connections.delete(id);
    }

    /**
     * Delete every single node
     */
    deleteAll() {
        this.nodes = new Map<string, Node>();
        this.connections = new Map<string, Connection>();
    }

    /**
     * When two nodes are connected:
     * if there was a connection: delete it
     * if not: create a new connection
     */
    addConnection(source, target) {
        if (this.connections.has(source + target)) {
            this.connections.delete(source + target);
        } else {
            this.connections.set(source + target, {
                id: source + target,
                source: this.nodes.get(source),
                target: this.nodes.get(target)
            });
        }
        this.setAutocomplete();
    }

    /**
     * List LogicalOperators for the select menu
     */
    getOperators() {
        //see https://stackoverflow.com/questions/43100718/typescript-enum-to-object-array
        this.operators = Object.keys(LogicalOperator)
            .map(key => LogicalOperator[key]);
    }

    /**
     * Make a REST request to retrieve all schemas, tables and columns.
     * Rearrange data to an object that can be used for the autocompletion
     */
    getAutocomplete() {
        this._crud.getSchema(new SchemaRequest('', false, 3)).subscribe(
            res => {
                const schemaTree = <SidebarNode[]>res;
                const autocomplete = {schemas: []};
                for (const schema of schemaTree) {
                    autocomplete.schemas.push(schema.name);
                    autocomplete[schema.name] = {tables: []};
                    for (const table of schema.children[0].children) {
                        autocomplete[schema.name].tables.push(table.name);
                        autocomplete[schema.name][table.name] = {columns: []};
                        for (const col of table.children) {
                            autocomplete[schema.name][table.name].columns.push(col.name);
                        }
                    }
                }
                this.autocomplete = autocomplete;
            });
    }

    /**
     * The the topmost node and perform a bottomUp iteration to setup the autocomplete for all nodes
     */
    setAutocomplete() {
        if (this.autocomplete === undefined) {
            return;
        }
        const tree = this.getTree();
        if (tree !== undefined) {
            this.bottomUp(tree);
        }
    }

    /**
     * Iterate the tree from bottom to top
     */
    bottomUp(node: Node) {
        for (const n of node.getChildren()) {
            this.bottomUp(n);
        }
        return this.updateNodeAutocomplete(node);
    }

    /**
     * Set the autocomplete fields for each node
     * default: get columns from all children
     * TableScan node: get columns from autocomplete object
     * Project node: get columns from all children, but only save the ones that are being projected
     */
    updateNodeAutocomplete(node: Node) {
        const self = this;

        function getNode() {
            return self.nodes.get(node.getId());
        }

        if (node.type === LogicalOperator.TableScan) {
            if (node.tableName === undefined || !node.tableName.includes('\.')) {
                getNode().getAcSchema().clear();
                getNode().getAcTable().clear();
                getNode().getAcSchema().add(node.tableName);
            } else { // node.tableName.includes('\.')
                const tN = node.tableName.split('\.');
                getNode().getAcSchema().clear();
                getNode().getAcSchema().add(tN[0]);
                getNode().getAcTable().clear();
                getNode().getAcTable().add(tN[1]);
                const ac = [];
                const cols = new Set<string>();
                const tableCols = new Set<string>();
                this.autocomplete.schemas
                    .filter((v) => getNode().getAcSchema().has(v))
                    .forEach((v1, i1) => {
                        this.autocomplete[v1].tables
                            .filter((v) => getNode().getAcTable().has(v))
                            .forEach((v2, i2) => {
                                ac.push(v1 + '.' + v2);
                                this.autocomplete[v1][v2].columns.forEach((v3, i3) => {
                                    cols.add(v3);
                                    tableCols.add(v2 + '.' + v3);
                                });
                            });
                    });
                getNode().setAutocomplete(ac);
                getNode().setAcColumns(cols);
                getNode().setAcTableColumns(tableCols);
            }
        } else if (node.type === LogicalOperator.Project) {
            node = this.getFromChildren(node);
            for (const col of getNode().getAcColumns()) {
                let contains = false;
                for (const f of node.fields) {
                    if (f.split('\.')[1] === col) contains = true;
                }
                if (!contains) getNode().getAcColumns().delete(col);
            }
            const ac = [];
            for (const tCol of getNode().getAcTableColumns()) {
                ac.push(tCol);
                if (!node.fields.includes(tCol)) {
                    getNode().getAcTableColumns().delete(tCol);
                }
            }
            getNode().setAutocomplete(ac);
        } else { // all other nodes
            node = this.getFromChildren(node);
        }
        return getNode();
    }

    /**
     * iterate all children of a node and add all columns to its set
     */
    getFromChildren(node: Node) {
        const self = this;

        function getNode() {
            return self.nodes.get(node.getId());
        }

        getNode().getAcSchema().clear();
        getNode().getAcTable().clear();
        getNode().getAcTableColumns().clear();
        getNode().getAcColumns().clear();
        for (const n of node.getChildren()) {
            getNode().setAcSchema(new Set<string>([...getNode().getAcSchema(), ...n.getAcSchema()]));
            getNode().setAcTable(new Set<string>([...getNode().getAcTable(), ...n.getAcTable()]));
            getNode().setAcColumns(new Set<string>([...getNode().getAcColumns(), ...n.getAcColumns()]));
            getNode().setAcTableColumns(new Set<string>([...getNode().getAcTableColumns(), ...n.getAcTableColumns()]));
        }
        getNode().setAutocomplete([...getNode().getAcTableColumns(), ...getNode().getAcColumns()]);
        return getNode();
    }

    getX1(s: Node) {
        if (s === undefined) {
            return;
        }
        if (s.isDragging() && this.draggingNodeX !== undefined) {
            return this.draggingNodeX + s.getWidth() / 2;
        } else {
            return s.left + s.getWidth() / 2;
        }
    }

    getX2(t: Node) {
        if (t === undefined) {
            return;
        }
        if (t.isDragging() && this.draggingNodeX !== undefined) {
            return this.draggingNodeX + t.getWidth() / 2;
        } else {
            return t.left + t.getWidth() / 2;
        }
    }

    getY1(s: Node) {
        if (s === undefined) {
            return;
        }
        if (s.isDragging() && this.draggingNodeY !== undefined) {
            return this.draggingNodeY;
        } else {
            return s.top;
        }
    }

    getY2(t: Node) {
        if (t === undefined) {
            return;
        }
        if (t.isDragging() && this.draggingNodeY !== undefined) {
            return this.draggingNodeY + t.getHeight() + 5;
        } else {
            return t.top + t.getHeight() + 5;
        }
    }

    /**
     * Get the tree and perform a REST request to execute it
     */
    runPlan() {
        $('#run i').removeClass().addClass('fa fa-hourglass-half');
        const tree = this.getTree();
        if (tree === undefined) {
            $('#run i').removeClass().addClass('fa fa-play');
            this._toast.toast('no plan', 'Please provide a plan to be executed.', 10, 'bg-warning');
            return;
        }
        this._crud.executeRelAlg(tree).subscribe(
            res => {
                $('#run i').removeClass().addClass('fa fa-play');
                this.resultSet = <ResultSet>res;
            }, err => {
                $('#run i').removeClass().addClass('fa fa-play');
                this._toast.toast('Server error', 'Could not execute relational algebra: ', 0, 'bg-danger');
            }
        );
    }

    /**
     * Get the topmost node to be able to iterate the tree
     * The topmost node is the one that has no outgoing connections
     */
    getTopNode() {
        let topNode: Node;
        const haveOutgoingConnections = new Map<string, Node>();
        this.connections.forEach((v, k) => {
            haveOutgoingConnections.set(v.source.getId(), v.source);
            if (!haveOutgoingConnections.get(v.target.getId())) {
                topNode = v.target;
            }
        });
        return this.nodes.get(topNode.getId());
    }

    /**
     * Get the whole tree by getting the topmost node and adding all children using the walkTree method
     */
    getTree(): Node {
        let tree;
        if (this.connections.size === 0) {
            if (this.nodes.size === 1) {
                //get only node in Map
                tree = this.walkTree(this.nodes.values().next().value.clone());
            } else {
                //$('#run i').removeClass().addClass('fa fa-play');
                //this._toast.toast( 'no plan', 'Please provide a plan to be executed.', 10, 'bg-warning' );
                return undefined;
            }
        } else {
            tree = this.walkTree(this.getTopNode().clone());
        }
        return tree;
    }

    /**
     * Add all children to a node recursively
     */
    walkTree(node: Node) {
        const children = [];
        this.connections.forEach((v, k) => {
            if (v.target.getId() === node.getId()) {
                children.push(this.nodes.get(this.walkTree(v.source).getId()));
                // children.push( this.walkTree(v.source) );
            }
        });
        node.setChildren(children);
        node.setInputCount(children.length);
        return node;
    }

    /**
     * Set temporal values when dragging a node
     */
    dragStart(e, node: Node) {
        this.scrollTop = document.documentElement.scrollTop;
        this.scrollLeft = document.documentElement.scrollLeft;
        this.nodes.get(node.getId()).setDragging(true);
    }

    /**
     * Set temporal values when dragging a node
     */
    draggingNode(e, node: Node) {
        this.draggingNodeX = node.left + e.distance.x + document.documentElement.scrollLeft - this.scrollLeft;
        this.draggingNodeY = node.top + e.distance.y + document.documentElement.scrollTop - this.scrollTop;
    }

    /**
     * Save the position of a node when it was moved
     */
    savePos(e, node: Node) {
        this.nodes.get(node.getId()).setDragging(false);
        const nodeElement = $('#' + node.id);
        const nodeWidth = $(nodeElement).width();
        const nodeHeight = $(nodeElement).height();
        const scrollTopDistance = document.documentElement.scrollTop - this.scrollTop;
        const scrollLeftDistance = document.documentElement.scrollLeft - this.scrollLeft;
        node.left = Math.max(0, Math.min(node.left + e.distance.x + scrollLeftDistance, this.dropArea.nativeElement.offsetWidth - nodeWidth - 4));
        node.top = Math.max(0, Math.min(node.top + e.distance.y + scrollTopDistance, this.dropArea.nativeElement.offsetHeight - nodeHeight - 4));
        this.draggingNodeX = undefined;
        this.draggingNodeY = undefined;
    }

    trackNode(index: number, n: Node) {
        if (n.id) {
            return n.id;
        } else {
            return 1;
        }
    }

    /**
     * Export the tree as JSON and save it to the clipboard
     */
    exportTree() {
        if (this.nodes.size === 0) {
            return;
        }
        // see https://2ality.com/2015/08/es6-map-json.html
        const out = {nodes: [...this.nodes], connections: [...this.connections]};
        this.copyMessage(JSON.stringify(out));
        this._toast.toast('exported', 'The plan was exported to JSON and copied to your clipboard', 5, 'bg-success');
    }

    /**
     * Import a tree in the JSON format
     */
    importTree() {
        const input = prompt('Please paste your plan here.');
        console.log(input)
        if (input === null || input === '') {
            return;
        }
        const inputObj = JSON.parse(input);
        console.log(inputObj.nodes)
        if (inputObj.nodes) {
            const importedNodes = new Map<string, Node>();
            for (const [k, v] of Object.entries(inputObj.nodes)) {
                importedNodes.set(v[0], Node.fromJson(v[1], this.dropArea.nativeElement.offsetWidth, this.dropArea.nativeElement.offsetHeight));
            }
            this.nodes = importedNodes;
            this.counter = importedNodes.size;
        }
        if (inputObj.connections) {
            const importedConnections = new Map<string, Connection>();
            for (const conn of Object.values(inputObj.connections)) {
                importedConnections.set(conn[0], {
                    id: conn[1].id,
                    source: this.nodes.get(conn[1].source.id),
                    target: this.nodes.get(conn[1].target.id)
                });
            }
            this.connections = importedConnections;
        }
        this.setAutocomplete();
    }

    /**
     * Imports a Query Plan from a file.
     * Not necessary anymore - still left in the code, could be useful some time
     */
    importTreeFile() {

        fetch("./assets/testfile.json")
            .then(res => res.json())
            .then(data => {
                console.log(data)
                const inputObj = JSON.parse(JSON.stringify(data))
                console.log(inputObj)
                if (inputObj.nodes) {
                    const importedNodes = new Map<string, Node>();
                    for (const [k, v] of Object.entries(inputObj.nodes)) {
                        importedNodes.set(v[0], Node.fromJson(v[1], this.dropArea.nativeElement.offsetWidth, this.dropArea.nativeElement.offsetHeight));
                    }
                    this.nodes = importedNodes;
                    this.counter = importedNodes.size;
                }
                if (inputObj.connections) {
                    const importedConnections = new Map<string, Connection>();
                    for (const conn of Object.values(inputObj.connections)) {
                        importedConnections.set(conn[0], {
                            id: conn[1].id,
                            source: this.nodes.get(conn[1].source.id),
                            target: this.nodes.get(conn[1].target.id)
                        });
                    }
                    this.connections = importedConnections;
                }
                this.setAutocomplete();
            })
            .catch(err => console.log(err))

    }

    /**
     * Copy a string to the clipboard
     */
    // from https://stackoverflow.com/questions/49102724/angular-5-copy-to-clipboard
    copyMessage(msg: string) {
        const selBox = document.createElement('textarea');
        selBox.style.position = 'fixed';
        selBox.style.left = '0';
        selBox.style.top = '0';
        selBox.style.opacity = '0';
        selBox.value = msg;
        document.body.appendChild(selBox);
        selBox.focus();
        selBox.select();
        document.execCommand('copy');
        document.body.removeChild(selBox);
    }


    /**
     * Calculates tree height of a balanced tree
     */
    treeHeight() {
        const height = Math.floor(Math.log2(this.counter));
        console.log(height);
        return height
    }

    /**
     * Formats all nodes in the working field
     */
    formatNodesTree() {
        const height = this.treeHeight();
        let leftPadding = 0;
        let upperPadding = 0;
        let ind = 0;
        for (var i = 0; i <= height; i++) {
            upperPadding = i * 250;
            for (var j = 0; j <= Math.pow(2, i) - 1; j++) {
                console.log("i" + i, "j" + j)
                leftPadding = 300 * j;
                this.nodes.get("node" + ind).left = leftPadding;
                this.nodes.get("node" + ind).top = upperPadding;

                ind++

            }

        }

    }

    /**
     * Formats all nodes as a square in the working field
     */
    formatNodesSquare() {
        const height = this.treeHeight();
        let leftPadding = 0;
        let upperPadding = 0;
        let ind = 0
        var edge = Math.ceil(Math.sqrt(this.counter));
        for (var i = 0; i < edge; i++) {
            upperPadding = i * 250;
            for (var j = 0; j < edge; j++) {
                console.log("i" + i, "j" + j);
                leftPadding = 300 * j;
                this.nodes.get("node" + ind).left = leftPadding;
                this.nodes.get("node" + ind).top = upperPadding;

                ind++

            }

        }
    }

    /**
     * Establishes the socket connection to the Query by Gesture Bridge and listens to incoming data.
     *
     */
    public makeSocketConnection() {
        this._webSocketService.startConnection();
        if (this.socketOn) {
            this.socketOn = false;
        } else {
            this._webSocketService.listen('my_message').subscribe((data) => {
                console.log(data);
                if (data.toString() == "delete") {
                    this.deleteAll()
                }
                if (data.toString().startsWith("{")) {
                    this.parseJson(data)
                }
            });
            this.socketOn = true;
        }
    }


    /**
     * Parses the whole JSON string received from the Query by Gesture Bridge and puts the parsed tree into the
     * Pan Builder working field.
     * @param data is JSON string received over the Web SOcket
     */
    parseJson(data) {
        const input = data;
        if (input === null || input === '') {
            console.log("invalid");
            return;
        }
        const inputObj = JSON.parse(data);
        console.log("LOG:", inputObj);
        console.log(inputObj.nodes);
        if (inputObj.nodes) {
            const importedNodes = new Map<string, Node>();
            for (const [k, v] of Object.entries(inputObj.nodes)) {
                console.log("for");
                importedNodes.set(v[0], Node.fromJson(v[1], this.dropArea.nativeElement.offsetWidth, this.dropArea.nativeElement.offsetHeight));
            }
            this.nodes = importedNodes;
            this.counter = importedNodes.size;
        }
        if (inputObj.connections) {
            const importedConnections = new Map<string, Connection>();
            for (const conn of Object.values(inputObj.connections)) {
                importedConnections.set(conn[0], {
                    id: conn[1].id,
                    source: this.nodes.get(conn[1].source.id),
                    target: this.nodes.get(conn[1].target.id)
                });
            }
            this.connections = importedConnections;
        }
        this.setAutocomplete();
    }


}
