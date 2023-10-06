import {Component, effect, OnDestroy, OnInit, signal, untracked, ViewChild, WritableSignal} from '@angular/core';
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
  readonly MAX_HISTORY = 50; //maximum items in history
  private readonly LOCAL_STORAGE_HISTORY_KEY = 'query-history';
  private readonly LOCAL_STORAGE_NAMESPACE_KEY = 'polypheny-namespace';

  results: WritableSignal<Result<any, any>[]> = signal([]);
  collapsed: boolean[];
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
  confirmDeletingHistory;
  readonly activeNamespace: WritableSignal<string> = signal(null);
  readonly namespaces: WritableSignal<NamespaceModel[]> = signal([]);

  entityConfig: EntityConfig = {
    create: false,
    update: false,
    delete: false,
    sort: false,
    search: false,
    exploring: false
  };
  showNamespaceConfig: boolean;

  constructor(
      private _crud: CrudService,
      private _leftSidebar: LeftSidebarService,
      private _breadcrumb: BreadcrumbService,
      private _settings: WebuiSettingsService,
      public _util: UtilService,
      public _toast: ToasterService,
      public _catalog: CatalogService,
      private _sidebar: LeftSidebarService
  ) {

    this.websocket = new WebSocket(_settings);
    this._sidebar.close();
    // @ts-ignore
    if (window.Cypress) {
      (<any>window).executeQuery = (query: string) => {
        this.codeEditor.setCode(query);
        this.submitQuery();
      };
    }

    this.initWebsocket();

    effect(() =>{
      const namespace = this._catalog.namespaces();
      untracked(() => {
        this.namespaces.set(Array.from(namespace.values()));
        this.loadAndSetNamespaceDB();
      });
    });
  }


  ngOnInit() {
    QueryHistory.fromJson(localStorage.getItem(this.LOCAL_STORAGE_HISTORY_KEY), this.history);
    this._breadcrumb.hide();

    this.loadAndSetNamespaceDB();
  }

  private loadAndSetNamespaceDB() {
    let namespaceName = localStorage.getItem(this.LOCAL_STORAGE_NAMESPACE_KEY);
    console.log(namespaceName);
    if (namespaceName === null || (this.namespaces && this.namespaces.length > 0 && (this.namespaces().filter(n => n.name === namespaceName).length === 0))) {
      if (this.namespaces() && this.namespaces().length > 0) {
        namespaceName = this.namespaces()[0].name;
      } else {
        namespaceName = 'public';
      }
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
      this.addToHistory(code, this.language());
    }
    if (this.usesAdvancedConsole(this.language())) { // maybe adjust
      const matchGraph = code.toLowerCase().match('use graph [a-zA-Z][a-zA-Z0-1]*');
      if (matchGraph !== null && matchGraph.length >= 0) {
        const namespace = matchGraph[matchGraph.length - 1].replace('use ', '');
        this.activeNamespace.set(namespace);
      }

      const match = code.toLowerCase().match('use [a-zA-Z][a-zA-Z0-1]*');
      if (match !== null && match.length >= 0) {
        const namespace = match[match.length - 1].replace('use ', '');
        if (namespace !== 'placement') {
          this.activeNamespace.set(namespace);
        }
      }


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
    const id = this._catalog.getNamespaceFromName(this.activeNamespace()).id;
    if (!this._crud.anyQuery(this.websocket, new QueryRequest(code, this.analyzeQuery, this.useCache, this.language(), id))) {
      this.loading.set(false);
      this.results.set([new RelationalResult('Could not establish a connection with the server.')]);
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
    this.language.set(lang);
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
        this._crud.getAnalyzerPage(analyzerId, analyzerPage).subscribe({
          next: res => {
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
          this.loading.set(false);
          this.results.set(<Result<any, any>[]>msg);
          this.collapsed = new Array(this.results.length);
          this.collapsed.fill(false);

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
    const formatted = JSON.stringify(JSON.parse('[' + code + ']'), null, 4);
    return formatted.substring(1, formatted.length - 1);
  }

  private storeNamespace(name: string) {
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

  changedDefaultDB(n) {
    console.log(n);
    this.activeNamespace.set(n);
  }

  setLanguage(language) {
    this.language.set(language);
  }
}
