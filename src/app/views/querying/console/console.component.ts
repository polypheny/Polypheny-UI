import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {FormBuilder} from '@angular/forms';
import {TableConfig} from '../../../components/data-view/data-table/table-config';
import {CrudService} from '../../../services/crud.service';
import {ResultSet} from '../../../components/data-view/models/result-set.model';
import {QueryHistory} from './query-history.model';
import {KeyValue} from '@angular/common';
import {QueryRequest, SchemaRequest} from '../../../models/ui-request.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {InformationObject, InformationPage} from '../../../models/information-page.model';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../../components/breadcrumb/breadcrumb-item';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {Subscription} from 'rxjs';
import {UtilService} from '../../../services/util.service';
import {WebSocket} from '../../../services/webSocket';
import {BsModalService} from 'ngx-bootstrap/modal';
import {ToastService} from '../../../components/toast/toast.service';
import {ViewInformation} from '../../../components/data-view/data-view.component';

class Namespace {
    name: string;
    id: string;
}

@Component({
    selector: 'app-console',
    templateUrl: './console.component.html',
    styleUrls: ['./console.component.scss']
})
export class ConsoleComponent implements OnInit, OnDestroy {

    @ViewChild('editor', {static: false}) codeEditor;
    @ViewChild('historySearchInput') historySearchInput;

    history: Map<string, QueryHistory> = new Map<string, QueryHistory>();
    readonly MAX_HISTORY = 50;//maximum items in history
    private readonly LOCAL_STORAGE_HISTORY_KEY = 'query-history';
    private readonly LOCAL_STORAGE_NAMESPACE_KEY = 'polypheny-namespace';

    resultSets: ResultSet[];
    collapsed: boolean[];
    queryAnalysis: InformationPage;
    analyzeQuery = true;
    useCache = true;
    private originalCache: boolean = null;
    showingAnalysis = false;
    websocket: WebSocket;
    private subscriptions = new Subscription();
    loading = false;
    lang = 'sql';
    saveInHistory = true;
    showSearch = false;
    historySearchQuery = '';
    confirmDeletingHistory;
    activeNamespace: string;
    namespaces = [];

    tableConfig: TableConfig = {
        create: false,
        update: false,
        delete: false,
        sort: false,
        search: false,
        exploring: false
    };
    private existingNamespaces: String[];
    showNamespaceConfig: boolean;

    constructor(
        private formBuilder: FormBuilder,
        private _crud: CrudService,
        private _leftSidebar: LeftSidebarService,
        private _breadcrumb: BreadcrumbService,
        private _settings: WebuiSettingsService,
        public _util: UtilService,
        public modalService: BsModalService,
        public _toast: ToastService
    ) {

        this.websocket = new WebSocket(_settings);

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

        this.updateExistingNamespaces();
        this.loadAndSetNamespaceDB();
    }

    private updateExistingNamespaces() {
        this._crud.getSchema(new SchemaRequest('views/querying/console/', false, 1, false)).subscribe(
            res => {
                this.namespaces = [];
                for (const namespace of <Namespace[]>res) {
                    this.namespaces.push(namespace.name);
                }

                this.loadAndSetNamespaceDB();
            }
        );
    }

    private loadAndSetNamespaceDB() {
        let db = localStorage.getItem(this.LOCAL_STORAGE_NAMESPACE_KEY);
        if (db === null || (this.namespaces && this.namespaces.length > 0 && !this.namespaces.includes(db))) {
            if (this.namespaces && this.namespaces.length > 0) {
                db = this.namespaces[0];
            } else {
                db = 'public';
            }
        }
        this.setDefaultDB(db);
    }

    ngOnDestroy() {
        this._leftSidebar.close();
        this.subscriptions.unsubscribe();
        this.websocket.close();
        this._breadcrumb.hide();
        window.onbeforeunload = null;
        window.onkeydown = null;
    }


    submitQuery() {
        const code = this.codeEditor.getCode();
        if (!code) {
            return;
        }
        if (this.saveInHistory) {
            this.addToHistory(code, this.lang);
        }
        if (this.usesAdvancedConsole(this.lang)) { // maybe adjust
            const matchGraph = code.toLowerCase().match('use graph [a-zA-Z][a-zA-Z0-1]*');
            if (matchGraph !== null && matchGraph.length >= 0) {
                const database = matchGraph[matchGraph.length - 1].replace('use ', '');
                this.setDefaultDB(database);
            }

            const match = code.toLowerCase().match('use [a-zA-Z][a-zA-Z0-1]*');
            if (match !== null && match.length >= 0) {
                const database = match[match.length - 1].replace('use ', '');
                if (database !== 'placement') {
                    this.setDefaultDB(database);
                }
            }


            if (code.match('show db')) {
                this._crud.getDocumentDatabases().subscribe(res => {
                    this.existingNamespaces = [];
                    for (const entry of (<ResultSet>res).data) {
                        this.existingNamespaces.push(entry[0]);
                    }
                    this.loading = false;
                    this.resultSets = [<ResultSet>res];
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

        this.loading = true;
        console.log(code);
        if (!this._crud.anyQuery(this.websocket, new QueryRequest(code, this.analyzeQuery, this.useCache, this.lang, this.activeNamespace))) {
            this.loading = false;
            this.resultSets = [new ResultSet('Could not establish a connection with the server.', code)];
        }
    }

    collapseAll(collapse: boolean) {
        this.collapsed.fill(collapse);
    }

    addToHistory(query: string, lang: string): void {
        if (this.history.size >= this.MAX_HISTORY) {
            let h: QueryHistory = new QueryHistory('');
            this.history.forEach((val, key) => {
                if (val.time < h.time) {
                    h = val;
                }
            });
            this.history.delete(h.query);
        }
        const newHistory = new QueryHistory(query, null, lang);
        this.history.set(newHistory.query, newHistory);

        localStorage.setItem(this.LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(Array.from(this.history.values())));
    }

    applyHistory(query: string, lang: string, run: boolean) {
        this.lang = lang;
        this.codeEditor.setCode(query);
        if (run) {
            this.submitQuery();
        }
    }

    deleteHistoryItem(key, e) {
        if (this.confirmDeletingHistory === key) {
            this.history.delete(key);
            localStorage.setItem(this.LOCAL_STORAGE_HISTORY_KEY, JSON.stringify(Array.from(this.history.values())));
        } else {
            this.confirmDeletingHistory = key;
        }
        e.stopPropagation();
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
            if (analyzerId !== undefined && analyzerPage !== undefined) {
                this._crud.getAnalyzerPage(analyzerId, analyzerPage).subscribe(
                    res => {
                        this.queryAnalysis = <InformationPage>res;
                        this.showingAnalysis = true;
                        this._breadcrumb.setBreadcrumbs([new BreadcrumbItem(node.data.name)]);
                        if (this.queryAnalysis.fullWidth) {
                            this._breadcrumb.hideZoom();
                        }
                        node.setIsActive(true);
                    }, err => {
                        console.log(err);
                    }
                );
            }
        };

        const sub = this.websocket.onMessage().subscribe(
            msg => {

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
                }


                // array of ResultSets
                else if (Array.isArray(msg) && (msg[0].hasOwnProperty('data') || msg[0].hasOwnProperty('affectedRows') || msg[0].hasOwnProperty('error'))) {
                    this.loading = false;
                    this.resultSets = <ResultSet[]>msg;
                    this.collapsed = new Array(this.resultSets.length);
                    this.collapsed.fill(false);
                }

                //if msg contains a notification of a changed information object
                else if (msg.hasOwnProperty('type')) {
                    const iObj = <InformationObject>msg;
                    if (this.queryAnalysis) {
                        const group = this.queryAnalysis.groups[iObj.groupId];
                        if (group != null) {
                            group.informationObjects[iObj.id] = iObj;
                        }
                    }
                }
            },
            err => {
                //this._leftSidebar.setError('Lost connection with the server.');
                setTimeout(() => {
                    this.initWebsocket();
                }, +this._settings.getSetting('reconnection.timeout'));
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

    formatQuery() {
        let code = this.codeEditor.getCode();
        if (!code) {
            return;
        }
        let before = '';
        const after = ')';

        // here we replace the Json incompatible types with placeholders
        const temp = code.match(/NumberDecimal\([^)]*\)/g);

        if (temp !== null) {
            for (let i = 0; i < temp.length; i++) {
                code = code.replace(temp[i], '"___' + i + '"');
            }
        }


        const splits = code.split('(');
        before = splits.shift() + '(';

        try {
            let json = this.parse(splits.join('(').slice(0, -1));
            // we have to translate them back
            if (temp !== null) {
                for (let i = 0; i < temp.length; i++) {
                    json = json.replace('"___' + i + '"', temp[i]);
                }
            }

            this.codeEditor.setCode(before + json + after);
        } catch (e) {
            this._toast.warn(e);
        }
    }

    parse(code: string) {
        console.log(code);
        const formatted = JSON.stringify(JSON.parse('[' + code + ']'), null, 4);
        return formatted.substring(1, formatted.length - 1);
    }

    private setDefaultDB(name: string) {
        name = name.trim();
        if (!this.namespaces.includes(name)) {
            this.namespaces.push(name);
        }

        this.activeNamespace = name;
        localStorage.setItem(this.LOCAL_STORAGE_NAMESPACE_KEY, name);
    }

    toggleCollapsed(i: number) {
        if (this.collapsed !== undefined && this.collapsed[i] !== undefined) {
            this.collapsed[i] = !this.collapsed[i];
        }
    }

    clearConsole() {
        this.codeEditor.setCode('');
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

    usesAdvancedConsole(lang: string) {
        return lang === 'mql' || lang === 'cypher';
    }

    toggleNamespaceField() {
        this.showNamespaceConfig = !this.showNamespaceConfig;
    }

    changedDefaultDB() {
        this.setDefaultDB(this.activeNamespace);
    }
}
