import {Component, computed, inject, OnDestroy, OnInit, Signal, signal, ViewChild, WritableSignal} from '@angular/core';
import {EntityConfig} from '../../../components/data-view/data-table/entity-config';
import {CrudService} from '../../../services/crud.service';
import {RelationalResult, Result} from '../../../components/data-view/models/result-set.model';
import {QueryHistory} from './query-history.model';
import {KeyValue} from '@angular/common';
import {QueryRequest} from '../../../models/ui-request.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {InformationObject, InformationPage} from '../../../models/information-page.model';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../../components/breadcrumb/breadcrumb-item';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {Subscription} from 'rxjs';
import {UtilService} from '../../../services/util.service';
import {WebSocket} from '../../../services/webSocket';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {ViewInformation} from '../../../components/data-view/data-view.component';
import {CatalogService} from '../../../services/catalog.service';
import {NamespaceModel} from '../../../models/catalog.model';

@Component({
    selector: 'app-console',
    templateUrl: './console.component.html',
    styleUrls: ['./console.component.scss']
})
export class ConsoleComponent implements OnInit, OnDestroy {

    private readonly _crud = inject(CrudService);
    private readonly _leftSidebar = inject(LeftSidebarService);
    private readonly _breadcrumb = inject(BreadcrumbService);
    private readonly _settings = inject(WebuiSettingsService);
    public readonly _util = inject(UtilService);
    public readonly _toast = inject(ToasterService);
    public readonly _catalog = inject(CatalogService);
    private readonly _sidebar = inject(LeftSidebarService);

    @ViewChild('editor', {static: false}) codeEditor;
    @ViewChild('historySearchInput') historySearchInput;

    history: Map<string, QueryHistory> = new Map<string, QueryHistory>();
    readonly MAX_HISTORY = 50; //maximum items in history
    private readonly LOCAL_STORAGE_HISTORY_KEY = 'query-history';
    private readonly LOCAL_STORAGE_NAMESPACE_KEY = 'polypheny-namespace';

    results: WritableSignal<Result<any, any>[]> = signal([]);
    collapsed: WritableSignal<boolean[]> = signal([]);
    queryAnalysis: InformationPage;
    analyzeQuery = true;
    useCache = true;
    private originalCache: boolean = null;
    showingAnalysis = false;
    websocket: WebSocket;
    private subscriptions = new Subscription();
    readonly loading: WritableSignal<boolean> = signal(false);
    readonly language: WritableSignal<string> = signal('sql');
    saveInHistory = true;
    showSearch = false;
    historySearchQuery = '';
    readonly activeNamespace: WritableSignal<string> = signal(null);
    readonly namespaces: Signal<NamespaceModel[]> = computed(() => Array.from(this._catalog.namespaces().values()));
    readonly activeNamespaceExists: Signal<boolean> = computed(() => this.namespaces().some(v => v.name === this.activeNamespace()));
    readonly usesAdvancedConsole: Signal<boolean> = computed(() => this.language() === 'mql' || this.language() === 'cypher');
    readonly someExpanded: Signal<boolean> = computed(() => this.collapsed().some(v => v));
    readonly someCollapsed: Signal<boolean> = computed(() => this.collapsed().some(v => !v));
    delayedNamespace: string = null;

    entityConfig: EntityConfig = {
        create: false,
        update: false,
        delete: false,
        sort: false,
        search: false,
        exploring: false
    };

    constructor() {
        this.websocket = new WebSocket();
        this._sidebar.close();
        // @ts-ignore
        if (window.Cypress) {
            (<any>window).executeQuery = (query: string) => {
                this.codeEditor.setCode(query);
                this.submitQuery();
            };
        }

        this.initWebsocket();
    }


    ngOnInit() {
        QueryHistory.fromJson(localStorage.getItem(this.LOCAL_STORAGE_HISTORY_KEY), this.history);
        this._breadcrumb.hide();

        this.loadAndSetNamespaceDB();
    }

    private loadAndSetNamespaceDB() {
        let namespaceName = localStorage.getItem(this.LOCAL_STORAGE_NAMESPACE_KEY);

        const hasNamespaces = this.namespaces() && this.namespaces().length > 0;
        if (namespaceName === null || (hasNamespaces && !this.namespaces().some(n => n.name === namespaceName))) {
            namespaceName = hasNamespaces ? this.namespaces()[0].name : 'public';
        }
        if (!namespaceName) {
            return;
        }

        this.activeNamespace.set(namespaceName);

        this.storeNamespace(namespaceName);
    }

    ngOnDestroy() {
        this._leftSidebar.close();
        this.subscriptions.unsubscribe();
        this.websocket.close(); // closes the websocket to the information manager so cleanup info pages
        this._breadcrumb.hide();
        window.onbeforeunload = null;
        window.onkeydown = null;
    }


    submitQuery() {
        this.delayedNamespace = null;
        const code = this.codeEditor.getCode();
        if (!code) {
            return;
        }
        if (this.saveInHistory) {
            this.addToHistory(code, this.language(), this.activeNamespace());
        }
        if (this.usesAdvancedConsole()) {
            code.split(';').forEach((query: string) => {
                // maybe adjust
                const graphUse = /use *graph *([a-zA-Z][a-zA-Z0-9-_]*)/gmi;
                const matchGraph = graphUse.exec(query.trim());
                if (matchGraph !== null && matchGraph.length > 1) {
                    this.delayedNamespace = matchGraph[1];
                }

                const useRegex = /use ([a-zA-Z][a-zA-Z0-9-_]*)/gmi;
                const match = useRegex.exec(query.trim());
                if (match !== null && match.length > 1) {
                    const namespace = match[1];
                    if (namespace !== 'placement') {
                        this.delayedNamespace = namespace;
                    }
                }
            });


            if (code.match('show db')) {
                this._catalog.updateIfNecessary().subscribe(catalog => {
                    this.loading.set(false);
                });
                return;
            }

        }

        this._leftSidebar.setNodes([]);
        if (this.analyzeQuery) {
            this._leftSidebar.open();
        } else {
            this._leftSidebar.close();
        }
        this.queryAnalysis = null;

        this.loading.set(true);
        if (!this._crud.anyQuery(this.websocket, new QueryRequest(code, this.analyzeQuery, this.useCache, this.language(), this.activeNamespace()))) {
            this.loading.set(false);
            this.results.set([new RelationalResult('Could not establish a connection with the server.')]);
            this.resetCollapsed();
        }
    }

    collapseAll(collapse: boolean) {
        this.collapsed.update(v => v.map(() => collapse));
    }

    addToHistory(query: string, lang: string, namespace: string): void {
        if (this.history.size >= this.MAX_HISTORY) {
            let h: QueryHistory = new QueryHistory('');
            this.history.forEach((val, key) => {
                if (val.time < h.time) {
                    h = val;
                }
            });
            this.history.delete(h.query);
        }
        const newHistory = new QueryHistory(query, null, lang, namespace);
        this.history.set(newHistory.query, newHistory);

        localStorage.setItem(this.LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(Array.from(this.history.values())));
    }

    applyHistory(query: string, lang: string, namespace: string, run: boolean) {
        this.language.set(lang);
        this.codeEditor.setCode(query);
        if (namespace) {
            this.activeNamespace.set(namespace);
        }
        if (run) {
            this.submitQuery();
        }
    }

    deleteHistoryItem(key: string) {
        this.history.delete(key);
        localStorage.setItem(this.LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(Array.from(this.history.values())));
    }

    //from: https://stackoverflow.com/questions/52793944/angular-keyvalue-pipe-sort-properties-iterate-in-order
    orderHistory(a: KeyValue<string, QueryHistory>, b: KeyValue<string, QueryHistory>) {
        return a.value.time > b.value.time ? -1 : (b.value.time > a.value.time ? 1 : 0);
    }

    openHistorySearch() {
        this.showSearch = true;
        setTimeout(
            () => this.historySearchInput.nativeElement.focus(),
            1
        );
    }

    closeHistorySearch() {
        this.showSearch = false;
        this.historySearchQuery = '';
    }


    initWebsocket() {
        //function to define behavior when clicking on a page link
        const nodeBehavior = (tree, node, $event) => {
            if (node.data.id === 'console') {
                //this.queryAnalysis = null;
                this.showingAnalysis = false;
                this._breadcrumb.hide();
                node.setIsActive(true);
                return;
            }
            const split = node.data.routerLink.split('/');
            const analyzerId = split[0];
            const analyzerPage = split[1];
            if (analyzerId && analyzerPage) {
                this._crud.getAnalyzerPage(analyzerId, analyzerPage).subscribe({
                    next: res => {
                        console.log(res);
                        this.queryAnalysis = <InformationPage>res;
                        this.showingAnalysis = true;
                        this._breadcrumb.setBreadcrumbs([new BreadcrumbItem(node.data.name)]);
                        if (this.queryAnalysis.fullWidth) {
                            this._breadcrumb.hideZoom();
                        }
                        node.setIsActive(true);
                    }, error: err => {
                        console.log(err);
                    }
                });
            }
        };

        const sub = this.websocket.onMessage().subscribe({
            next: msg => {
                //if msg contains nodes of the sidebar
                if (Array.isArray(msg) && msg[0].hasOwnProperty('routerLink')) {
                    const sidebarNodesTemp: SidebarNode[] = <SidebarNode[]>msg;
                    const sidebarNodes: SidebarNode[] = [];
                    const labels = new Set();
                    sidebarNodesTemp.sort(this._leftSidebar.sortNodes).forEach((s) => {
                        if (s.label) {
                            labels.add(s.label);
                        } else {
                            sidebarNodes.push(SidebarNode.fromJson(s, {allowRouting: false, action: nodeBehavior}));
                        }
                    });
                    for (const l of [...labels].sort()) {
                        sidebarNodes.push(new SidebarNode(l, l).asSeparator());
                        sidebarNodesTemp.filter((n) => n.label === l).sort(this._leftSidebar.sortNodes).forEach((n) => {
                            sidebarNodes.push(SidebarNode.fromJson(n, {allowRouting: false, action: nodeBehavior}));
                        });
                    }

                    sidebarNodes.unshift(new SidebarNode('console', 'console', 'fa fa-keyboard-o').setAction(nodeBehavior));

                    this._leftSidebar.setNodes(sidebarNodes);
                    if (sidebarNodes.length > 0) {
                        this._leftSidebar.open();
                    } else {
                        this._leftSidebar.close();
                    }

                } else if (Array.isArray(msg) && ((msg[0].hasOwnProperty('data') || msg[0].hasOwnProperty('affectedTuples') || msg[0].hasOwnProperty('error')))) { // array of ResultSets
                    if (this.delayedNamespace && !msg[0].hasOwnProperty('error')) {
                        this.activeNamespace.set(this.delayedNamespace);
                        this.storeNamespace(this.delayedNamespace);
                    }
                    this.delayedNamespace = null;

                    this.loading.set(false);
                    this.results.set(<Result<any, any>[]>msg);
                    this.resetCollapsed();

                } else if (msg.hasOwnProperty('type')) { //if msg contains a notification of a changed information object
                    const iObj = <InformationObject>msg;
                    if (this.queryAnalysis) {
                        const group = this.queryAnalysis.groups[iObj.groupId];
                        if (group != null) {
                            group.informationObjects[iObj.id] = iObj;
                        }
                    }
                }
            },
            error: err => {
                //this._leftSidebar.setError('Lost connection with the server.');
                setTimeout(() => {
                    this.initWebsocket();
                }, +this._settings.getSetting('reconnection.timeout'));
            }
        });
        this.subscriptions.add(sub);
    }

    createView(info: ViewInformation) {
        this.codeEditor.setCode(info.fullQuery);
    }

    executeView(info: ViewInformation) {
        this.codeEditor.setCode(info.fullQuery);
        this.submitQuery();
    }

    private storeNamespace(name: string) {
        localStorage.setItem(this.LOCAL_STORAGE_NAMESPACE_KEY, name);
    }

    private resetCollapsed() {
        const collapsed = new Array(this.results().length);
        collapsed.fill(false);
        this.collapsed.set(collapsed);
    }

    toggleCollapsed(i: number) {
        this.collapsed.update(v => {
            const collapsed = [...v];
            if (collapsed[i] !== undefined) {
                collapsed[i] = !collapsed[i];
            }
            return collapsed;
        });
    }

    toggleCache(b: boolean) {
        if (this.originalCache === null) {
            this.originalCache = this.useCache;
        }
        this.useCache = b;
    }

    revertCache() {
        console.log('revert');
        this.useCache = this.originalCache;
        this.originalCache = null;
    }

    changedDefaultDB(n) {
        this.activeNamespace.set(n);
    }

    setLanguage(language) {
        this.language.set(language);
    }

    clearHistory() {
        this.history.clear();
        localStorage.setItem(this.LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(Array.from(this.history.values())));
    }
}
