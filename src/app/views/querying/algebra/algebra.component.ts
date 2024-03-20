import {
    AfterViewInit,
    Component,
    computed,
    effect,
    ElementRef,
    HostBinding,
    inject,
    OnDestroy,
    OnInit,
    Signal,
    signal,
    untracked,
    ViewChild,
    ViewEncapsulation,
    WritableSignal
} from '@angular/core';
import {AlgNodeModel, AlgType, Connection, Node} from './algebra.model';
import {RelationalResult, Result} from '../../../components/data-view/models/result-set.model';
import {CrudService} from '../../../services/crud.service';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import * as $ from 'jquery';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/widgets/draggable';
import 'jquery-ui/ui/widgets/droppable';
import {SvgLine} from '../../uml/uml.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {InformationPage} from '../../../models/information-page.model';
import {BreadcrumbItem} from '../../../components/breadcrumb/breadcrumb-item';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {Subscription} from 'rxjs';
import {WebSocket} from '../../../services/webSocket';
import {UtilService} from '../../../services/util.service';
import {ViewInformation} from '../../../components/data-view/data-view.component';
import {CatalogService} from '../../../services/catalog.service';
import {KeyValue} from '@angular/common';

@Component({
    selector: 'app-algebra',
    templateUrl: './algebra.component.html',
    styleUrls: ['./algebra.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class AlgebraComponent implements OnInit, AfterViewInit, OnDestroy {

    private readonly _crud = inject(CrudService);
    private readonly _toast = inject(ToasterService);
    private readonly _leftSidebar = inject(LeftSidebarService);
    private readonly _breadcrumb = inject(BreadcrumbService);
    private readonly _settings = inject(WebuiSettingsService);
    private readonly _catalog = inject(CatalogService);
    private readonly _util = inject(UtilService);

    @ViewChild('dropArea', {read: ElementRef}) dropArea: ElementRef;
    @HostBinding('class.is-open')
    public readonly $result: WritableSignal<Result<any, any>> = signal(null);
    private counter = 0;
    public connections = new Map<string, Connection>();
    public nodes = new Map<string, Node>();
    public temporalLine: SvgLine;
    operators = [];
    autocomplete;// names of the schemas, tables and columns
    sidebarNodes: SidebarNode[] = [];
    private subscriptions = new Subscription();
    analyzerId: string;
    showingAnalysis = false;
    queryAnalysis: InformationPage;
    webSocket: WebSocket;

    //temporal values while dragging
    scrollTop: number;
    scrollLeft: number;
    draggingNodeX: number;
    draggingNodeY: number;
    socketOn: boolean;

    analyzeQuery = true;
    private cache = true;
    private $algModels: WritableSignal<Map<string, AlgNodeModel[]>> = signal(new Map<string, AlgNodeModel[]>());
    private $algs: Signal<Map<string, AlgNodeModel>>;
    public $loading: WritableSignal<boolean> = signal(false);

    constructor() {
        this.socketOn = false;
        this.webSocket = new WebSocket();
        this.initWebsocket();

        this.$algs = computed(() => {
            const map = new Map<string, AlgNodeModel>();
            for (let [k, v] of this.$algModels().entries()) {
                for (let alg of v) {
                    map.set(alg.name, alg);
                }
            }
            return map;
        });

        effect(() => {
            const catalog = this._catalog.listener();

            untracked(() => {
                const autocomplete = {schemas: []};
                for (const schema of catalog.getSchemaTree('', true, 3)) {
                    autocomplete.schemas.push(schema.name);
                    autocomplete[schema.name] = {tables: []};
                    for (const table of schema.children) {
                        autocomplete[schema.name].tables.push([table.name, table.tableType]);
                        autocomplete[schema.name][table.name] = {columns: []};
                        for (const col of table.children) {
                            autocomplete[schema.name][table.name].columns.push(col.name);
                        }
                    }
                }
                this.autocomplete = autocomplete;
            });
        });

        effect(() => {
            const nodes: SidebarNode[] = [];
            for (const [k, v] of this.$algModels()?.entries()) {
                nodes.push(new SidebarNode('operator_' + k, k, '', '').asSeparator());
                for (let alg of v) {
                    nodes.push(AlgebraComponent.toSidebarNode(alg));
                }
            }
            untracked(() => {
                this.sidebarNodes = nodes;
                this._leftSidebar.setNodes(nodes);
                this._leftSidebar.open();
            });
        });
    }

    static toSidebarNode(nodeModel: AlgNodeModel): SidebarNode {
        const node = new SidebarNode('operator_' + nodeModel.name, nodeModel.name, nodeModel.icon, null, true);
        if (nodeModel.symbol) {
            node.setAlgSymbol(nodeModel.symbol);
        }
        return node;
    }


    ngOnInit() {
        this._leftSidebar.open();
        this.getOperators();

        const sub2 = this.webSocket.reconnecting.subscribe(
            b => {
                if (b) {
                    this.getOperators();
                }
            }
        );
        this.subscriptions.add(sub2);
    }

    ngAfterViewInit() {
        this.initDraggable();
        //todo find solution without timeout
        //setTimeout(() => this.initSidebar(), 200);
    }

    ngOnDestroy() {
        this.counter = 0;
        $(document).off();
        $('#drop').off();
        this._leftSidebar.close();
        this.subscriptions.unsubscribe();
        this.webSocket.close();
    }

    initWebsocket() {
        const sub = this.webSocket.onMessage().subscribe({
            next: msg => {
                //if msg contains nodes of the sidebar
                if (Array.isArray(msg)) {
                    const sidebarNodesTemp: SidebarNode[] = <SidebarNode[]>msg;
                    const backToPlanBuilder = new SidebarNode('back-to-plan-builder', 'plan-builder', 'fa fa-cubes').setAction((tree, node, $event) => {
                        this.showingAnalysis = false;
                        this._breadcrumb.hide();
                    });
                    const sidebarNodes: SidebarNode[] = [backToPlanBuilder];
                    //set analyzerId to close it when leaving the page.
                    if (sidebarNodesTemp.length > 0) {
                        const split = sidebarNodesTemp[0].routerLink.split('/');
                        this.analyzerId = split[0];
                        for (const s of sidebarNodesTemp) {
                            const s2 = SidebarNode.fromJson(s, {allowRouting: false});
                            sidebarNodes.push(s2.setAction((tree, node, $event) => {
                                //todo define behavior when clicking on analyzer-sidebarNode
                                const analyzerPage = s2.routerLink.split('/')[1];
                                this._crud.getAnalyzerPage(this.analyzerId, analyzerPage).subscribe({
                                    next: res => {
                                        this.queryAnalysis = <InformationPage>res;
                                        this.showingAnalysis = true;
                                        this._breadcrumb.setBreadcrumbs([new BreadcrumbItem(node.data.name)]);
                                        node.setIsActive(true);
                                    }, error: err => {
                                        console.log(err);
                                    }
                                });
                            }));
                        }
                    }
                    sidebarNodes.unshift(new SidebarNode('analyzer', 'analyzer').asSeparator());
                    sidebarNodes.unshift(new SidebarNode('separator', '&nbsp;').asSeparator());
                    this._leftSidebar.setNodes(this.sidebarNodes.concat(sidebarNodes));
                }
                //a result
                else {
                    $('#run i').removeClass().addClass('fa fa-play');
                    this.$loading.set(false);
                    this.$result.set(msg);
                }
            }, error: err => {
                setTimeout(() => {
                    this.initWebsocket();
                }, +this._settings.getSetting('reconnection.timeout'));
            }
        });
        this.subscriptions.add(sub);
    }

    treeDrop(e) {
        const id = 'node' + this.counter++;
        const x = Math.max(0, Math.min(this.dropArea.nativeElement.offsetWidth - 270, e.event.offsetX));
        const y = Math.max(0, Math.min(this.dropArea.nativeElement.offsetHeight - 140, e.event.offsetY));
        const name = e.element.data.name;
        const alg = this.$algs().get(name);
        const node = new Node(id, e.element.data.name, x, y);
        node.algSymbol = e.element.data.algSymbol;
        node.icon = e.element.data.icon;
        node.inputCount = alg.inputs;
        node.type = alg.type;
        node.class = alg.name;

        if (e.element.data.name.includes('Scan')) {
            const ac = [];
            const acType = [];
            if (this.autocomplete) {
                for (const v1 of this.autocomplete.schemas) {
                    for (const v2 of this.autocomplete[v1].tables) {
                        ac.push(v1 + '.' + v2[0]);
                        acType.push(v2[1]);
                    }
                }
                node.autocomplete = ac;
                node.tableTypes = acType;
                node.initialNames = ac;
            }
        }
        this.nodes.set(id, node);
    }

    /**
     * initialize the functionality that nodes can be connected by drag and drop
     */
    initDraggable() {
        const self = this;

        let isDragging = false;
        let source = '';
        $(document).on('mousedown', '#drop .node .out', e => {
            isDragging = true;
            $('#drop').addClass('connecting');
            const x = $(e.target).parents('.node').parent().position().left + $(e.target).parents('.node').outerWidth() / 2;
            const y = $(e.target).parents('.node').parent().position().top;
            self.temporalLine = {x1: x, x2: x, y1: y, y2: y};

            source = $(e.target).parents('.node').attr('id');
            e.preventDefault();
        }).on('mousemove', e => {
            if (isDragging) {
                e.preventDefault();
                const dropContainer = $('svg#line');
                const x = e.pageX - dropContainer.offset().left;
                const y = e.pageY - dropContainer.offset().top;
                self.temporalLine.x2 = x;
                self.temporalLine.y2 = y;
            }
        }).on('mouseup', e => {
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
        const id = node.id;
        this.connections.forEach((v, k) => {
            if (v.target.id === id || v.source.id === id) {
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
        this._crud.getAlgebraNodes().subscribe(algs => {
            this.$algModels.set(algs);
        });//Object.keys(LogicalOperator).map(key => LogicalOperator[key]);
    }


    /**
     * The topmost node and perform a bottomUp iteration to setup the autocomplete for all nodes
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
        for (const n of node.children) {
            this.bottomUp(n);
        }
        return this.updateNodeAutocomplete(node);
    }

    /**
     * Set the autocomplete fields for each node
     * default: get columns from all children
     * Scan node: get columns from autocomplete object
     * Project node: get columns from all children, but only save the ones that are being projected
     */
    updateNodeAutocomplete(node: Node) {
        const self = this;

        function getNode() {
            return self.nodes.get(node.id);
        }

        if (node.type === AlgType.Scan) {
            if (node.tableName === undefined || !node.tableName.includes('\.')) {
                getNode().acSchema.clear();
                getNode().acTable.clear();
                getNode().acSchema.add(node.tableName);

            } else { // node.tableName.includes('\.')
                const tN = node.tableName.split('\.');
                getNode().acSchema.clear();
                getNode().acSchema.add(tN[0]);
                getNode().acTable.clear();
                getNode().acTable.add(tN[1]);
                const ac = [];
                const cols = new Set<string>();
                const tableCols = new Set<string>();
                this.autocomplete.schemas
                    .filter(namespace => getNode().acSchema.has(namespace))
                    .forEach((v1, i1) => {
                        this.autocomplete[v1].tables
                            .filter((v) => getNode().acTable.has(v[0]))
                            .forEach((v2, i2) => {
                                ac.push(v1 + '.' + v2[0]);
                                this.autocomplete[v1][v2[0]].columns.forEach((v3, i3) => {
                                    cols.add(v3);
                                    tableCols.add(v2[0] + '.' + v3);
                                });
                            });
                    });
                getNode().autocomplete = ac;
                getNode().acColumns = cols;
                getNode().acTableColumns = tableCols;
            }
        } else if (node.type === AlgType.Project) {
            node = this.getFromChildren(node);
            for (const col of getNode().acColumns) {
                let contains = false;
                for (const f of node.fields) {
                    if (f.split('\.')[1] === col) {
                        contains = true;
                    }
                }
                if (!contains) {
                    getNode().acColumns.delete(col);
                }
            }
            const ac = [];
            for (const tCol of getNode().acTableColumns) {
                ac.push(tCol);
                if (!node.fields.includes(tCol)) {
                    getNode().acTableColumns.delete(tCol);
                }
            }
            getNode().autocomplete = ac;
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
            return self.nodes.get(node.id);
        }

        getNode().acSchema.clear();
        getNode().acTable.clear();
        getNode().acTableColumns.clear();
        getNode().acColumns.clear();
        for (const n of node.children) {
            getNode().acSchema = new Set<string>([...getNode().acSchema, ...n.acSchema]);
            getNode().acTable = new Set<string>([...getNode().acTable, ...n.acTable]);
            getNode().acColumns = new Set<string>([...getNode().acColumns, ...n.acColumns]);
            getNode().acTableColumns = new Set<string>([...getNode().acTableColumns, ...n.acTableColumns]);
        }
        getNode().autocomplete = [...getNode().acTableColumns, ...getNode().acColumns];
        return getNode();
    }

    // bottom node (start)
    getX1(s: Node) {
        if (s === undefined) {
            return;
        }
        if (s.dragging && this.draggingNodeX !== undefined) {
            return this.draggingNodeX + s.width / 2 + 50;
        }
        return s.$left() + s.width / 2;
    }

    // bottom node (end)
    getX2(t: Node) {
        if (t === undefined) {
            return;
        }
        if (t.dragging && this.draggingNodeX !== undefined) {
            return this.draggingNodeX + t.width / 2;
        }
        return t.$left() + t.width / 2;
    }

    getY1(s: Node) {
        if (s === undefined) {
            return;
        }
        if (s.dragging && this.draggingNodeY !== undefined) {
            return this.draggingNodeY - 28;
        }
        return s.$top() - 16;
    }

    getY2(t: Node) {
        if (t === undefined) {
            return;
        }
        if (t.dragging && this.draggingNodeY !== undefined) {
            return this.draggingNodeY;
        }
        return t.$top() + t.height - 5;
    }

    clickRun(event) {
        this.cache = !(event.shiftKey && event.altKey);
        this.runPlan();
        this.cache = true;
    }

    /**
     * Get the tree and perform a REST request to execute it
     */
    runPlan() {
        this.$loading.set(true);
        $('#run i').removeClass().addClass('fa fa-hourglass-half');
        const tree = this.getTree();
        if (tree === undefined) {
            $('#run i').removeClass().addClass('fa fa-play');
            this._toast.warn('Please provide a plan to be executed.', 'no plan');
            this.$loading.set(false);
            return;
        }
        if (!this._crud.executeAlg(this.webSocket, tree, this.cache, this.analyzeQuery)) {
            $('#run i').removeClass().addClass('fa fa-play');
            this.$result.set(new RelationalResult('Could not establish a connection with the server.'));
            this.$loading.set(false);
        }
    }

    createView(info: ViewInformation) {
        this._crud.executeAlg(
            this.webSocket,
            this.getTree(),
            this.cache,
            this.analyzeQuery,
            true,
            info.tableType,
            info.newViewName,
            info.stores,
            info.freshness,
            info.interval as unknown as string,
            info.timeUnit);
    }


    /**
     * Get the topmost node to be able to iterate the tree
     * The topmost node is the one that has no outgoing connections
     */
    getTopNode() {
        let topNode: Node;
        const haveOutgoingConnections = new Map<string, Node>();
        this.connections.forEach((v, k) => {
            haveOutgoingConnections.set(v.source.id, v.source);
            if (!haveOutgoingConnections.get(v.target.id)) {
                topNode = v.target;
            }
        });
        return this.nodes.get(topNode.id);
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
                //this._toast.warn( 'Please provide a plan to be executed.', 'no plan' );
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
    walkTree(node: Node): Node {
        const children = [];
        this.connections.forEach((v, k) => {
            if (v.target.id === node.id) {
                children.push(this.nodes.get(this.walkTree(v.source).id));
                // children.push( this.walkTree(v.source) );
            }
        });
        node.children = children;
        node.inputCount = children.length;
        return node;
    }


    /**
     * Set temporal values when dragging a node
     */
    dragStart(e, node: Node) {
        const $bg = $('#wrapper');
        this.scrollTop = $bg.scrollTop();
        this.scrollLeft = $bg.scrollLeft();
        this.nodes.get(node.id).dragging = true;
    }

    /**
     * Set temporal values when dragging a node
     */
    draggingNode(e, node: Node) {
        const $bg = $('#wrapper');

        this.draggingNodeX = node.$left() + e.distance.x + $bg.scrollLeft() - this.scrollLeft;
        this.draggingNodeY = node.$top() + e.distance.y + $bg.scrollTop() - this.scrollTop;
    }

    /**
     * Save the position of a node when it was moved
     */
    savePos(e, node: Node) {
        const $bg = $('#drop');
        this.nodes.get(node.id).dragging = false;
        const nodeElement = $('#' + node.id);
        const nodeWidth = nodeElement.width();
        const nodeHeight = nodeElement.height();
        const scrollTopDistance = $bg.scrollTop() - this.scrollTop;
        const scrollLeftDistance = $bg.scrollLeft() - this.scrollLeft;
        console.log(node.$left() + e.distance.x + scrollLeftDistance);
        node.$left.set(Math.max(0, Math.min(node.$left() + e.distance.x + scrollLeftDistance, this.dropArea.nativeElement.offsetWidth - nodeWidth - 4)));
        node.$top.set(Math.max(0, Math.min(node.$top() + e.distance.y + scrollTopDistance, this.dropArea.nativeElement.offsetHeight - nodeHeight - 4)));
        this.draggingNodeX = null;
        this.draggingNodeY = null;
    }

    trackNode(index: number, e: KeyValue<string, Node>) {
        if (e.value.id) {
            return e.value.id;
        }
        return 1;
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
        this._util.clipboard(JSON.stringify(out));
        this._toast.success('The plan was exported to JSON and copied to your clipboard', null, 'exported');
    }

    /**
     * Import a tree in the JSON format
     */
    importTree() {
        const input = prompt('Please paste your plan here.');
        if (input === null || input === '') {
            return;
        }
        const inputObj = JSON.parse(input);
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
     * Calculates tree height of a balanced tree
     */
    treeHeight() {
        return Math.floor(Math.log2(this.counter));
    }

    /**
     * Formats all nodes in the working field
     */
    formatNodesTree() {
        const height = this.treeHeight();
        let leftPadding = 0;
        let upperPadding = 0;
        let ind = 0;
        for (let i = 0; i <= height; i++) {
            upperPadding = i * 250;
            for (let j = 0; j <= Math.pow(2, i) - 1; j++) {
                leftPadding = 300 * j;
                this.nodes.get('node' + ind).$left.set(leftPadding);
                this.nodes.get('node' + ind).$top.set(upperPadding);

                ind++;

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
        let ind = 0;
        const edge = Math.ceil(Math.sqrt(this.counter));
        for (let i = 0; i < edge; i++) {
            upperPadding = i * 250;
            for (let j = 0; j < edge; j++) {
                leftPadding = 300 * j;
                this.nodes.get('node' + ind).$left.set(leftPadding);
                this.nodes.get('node' + ind).$top.set(upperPadding);

                ind++;

            }

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
            return;
        }
        const inputObj = JSON.parse(data);
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


    toggleCache(b: boolean) {
        this.cache = b;
    }

}
