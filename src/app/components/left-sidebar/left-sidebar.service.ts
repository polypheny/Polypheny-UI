import {Injectable, Input, signal, WritableSignal} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject} from 'rxjs';
import {InformationService} from '../../services/information.service';
import {ConfigService} from '../../services/config.service';
import {CrudService} from '../../services/crud.service';
import {NamespaceType} from '../../models/ui-request.model';
import {JavaPage, SidebarNode} from '../../models/sidebar-node.model';
import {Router} from '@angular/router';
import {BreadcrumbItem} from '../breadcrumb/breadcrumb-item';
import {BreadcrumbService} from '../breadcrumb/breadcrumb.service';
import {SidebarButton} from '../../models/sidebar-button.model';
import {CatalogService} from '../../services/catalog.service';

@Injectable({
  providedIn: 'root'
})

//docs: https://angular2-tree.readme.io/docs/
export class LeftSidebarService {

  @Input() schemaEdit: boolean;
  router: Router;
  public readonly isVisible: WritableSignal<boolean> = signal(true);

  constructor(
      private _http: HttpClient,
      private _informationService: InformationService,
      private _configService: ConfigService,
      private _crud: CrudService,
      private _breadcrumb: BreadcrumbService,
      public _catalog: CatalogService
  ) {
    this.nodes.subscribe(nodes => {
      if (this.selectedNodeId && !nodes.some(node => node.id === this.selectedNodeId)) {
        this.selectedNodeId = null;
      }
    });
  }

  nodes: BehaviorSubject<SidebarNode[]> = new BehaviorSubject([]);
  error: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  //node that should be set inactive:
  private inactiveNode: BehaviorSubject<string> = new BehaviorSubject<string>(null);
  private resetSubject = new BehaviorSubject<boolean>(false);
  private topButtonSubject = new BehaviorSubject<SidebarButton[]>([]);
  namespaceType: string;
  selectedNodeId: any;


  /**
   * Sort function to sort SidebarNodes alphabetically
   */
  public sortNodes = (a: SidebarNode, b: SidebarNode) => {
    if (a.name < b.name) {
      return -1;
    }
    if (a.name > b.name) {
      return 1;
    }
    return 0;
  }

  private mapPages(res: Object, mode: string) {
    const pages = <JavaPage[]>res;
    const nodes: SidebarNode[] = [];
    let routerLink = '';
    const labels = new Map<string, SidebarNode[]>();
    const nonLabel: SidebarNode[] = [];
    for (const p of pages) {
      switch (mode) {
        case 'config':
          routerLink = '/views/config/' + p.id;
          break;
        case 'information':
          routerLink = '/views/monitoring/' + p.id;
          break;
        default:
          console.error('sidebarNode with unknown group');
      }
      if (p.label) {
        if (!labels.has(p.label)) {
          labels.set(p.label, []);
        }
        labels.get(p.label).push(new SidebarNode(p.id, p.name, p.icon, routerLink));
      } else {
        nonLabel.push(new SidebarNode(p.id, p.name, p.icon, routerLink));
      }
    }
    for (const p of nonLabel) {
      nodes.push(new SidebarNode(p.id, p.name, p.icon, p.routerLink));
    }
    for (const [k, v] of labels) {
      nodes.push(new SidebarNode(k, k).asSeparator());
      for (const p of labels.get(k)) {
        nodes.push(new SidebarNode(p.id, p.name, p.icon, p.routerLink));
      }
    }
    return nodes;
  }

  listInformationManagerPages() {
    return this._informationService.getPageList().subscribe({
      next: res => {
        this.nodes.next(this.mapPages(res, 'information'));
        this.error.next(null);
      }
      ,
      error: err => {
        this.nodes.next([]);
        this.error.next('Could not get page list.');
        console.log(err);
      }
    });
  }

  listConfigManagerPages() {
    return this._configService.getPageList().subscribe({
      next: res => {
        this.nodes.next(this.mapPages(res, 'config'));
        this.error.next(null);
      }
      ,
      error: err => {
        this.nodes.next([]);
        this.error.next('Could not get page list.');
        console.log(err);
      }
    });
  }

  getNodes() {
    return this.nodes;
  }

  setNodes(n: SidebarNode[]) {
    n = [].concat(n); // convert to array if it is not an array
    this.nodes.next(n);
    this.error.next(null);
  }

  getError() {
    return this.error;
  }

  setError(msg: string) {
    this.error.next(msg);
    this.nodes.next([]);
  }

  open() {
    this.isVisible.set(true);
  }

  hide() {
    this.isVisible.set(false);
  }

  close() {
    this.nodes.next([]);
    this.hide();
  }

  /**
   * Reset tree completely, set all active nodes to inactive
   * @param collapse collapse tree if true
   */
  reset(collapse = false) {
    this.resetSubject.next(collapse);
  }

  getResetSubject() {
    return this.resetSubject;
  }

  /**
   * Retrieve a schemaTree using the _crud service and apply it to the left sidebar
   */
  setSchema(_router: Router, routerLinkRoot: string, views: boolean, depth: number, showTable: boolean, schemaEdit?: boolean, dataModels: NamespaceType[] = [NamespaceType.RELATIONAL, NamespaceType.DOCUMENT, NamespaceType.GRAPH]) {

    this.error.next(null);
    const schema = [];
    this.router = _router;
    for (const s of this._catalog.getSchemaTree(routerLinkRoot, views, depth, schemaEdit, dataModels)) {
      schema.push(SidebarNode.fromJson(s));
    }
    //Schema editing view

    if (this.router.url.startsWith('/views/schema-editing/')) {
      //function to define node behavior
      const nodeBehavior = (tree, node, $event) => {
        if (node.data.routerLink !== '') {
          const rLink = [node.data.routerLink];
          const rname = [node.data.id];
          if (node.data.children.length === 0 && node.data.namespaceType !== 'graph') {
            const url = ['/views/schema-editing/'];
            const fullChildLink = (url.concat(rname));
            this._breadcrumb.setBreadcrumbsSchema([new BreadcrumbItem('Schema', '/views/schema-editing/'), new BreadcrumbItem(((node.data.id).split('.'))[0], node.data.routerLink), new BreadcrumbItem(node.data.name)], node.data.id);
            _router.navigate(fullChildLink);
          } else {
            const fullLink = rLink.concat(rname);
            this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Schema', '/views/schema-editing/'), new BreadcrumbItem(node.data.name)]);
            _router.navigate(fullLink);
          }
          if (node.isCollapsed) {
            node.expand();
          } else if (!node.isCollapsed && node.isActive === true) {
            node.collapse();
          }
          node.setIsActive(true, false);
        } else {
          node.toggleExpanded();
        }
      };

      schema.forEach((val: SidebarNode, key) => {
        val.routerLink = routerLinkRoot;
        val.disableRouting();
        val.setAutoExpand(false);
        val.setAction(nodeBehavior);
        val.children.forEach((v: SidebarNode, k) => {
          v.routerLink = routerLinkRoot + val.id;
          v.disableRouting();
          v.setAutoExpand(false);
          v.setAction(nodeBehavior);
        });
      });
    }
    //Uml view
    else if (depth === 1) {

      schema.forEach((val, key) => {
        val.routerLink = routerLinkRoot + val.id;
      });
    }
    this.setNodes(schema);

    this.open();
  }

  /**
   * sets a SidebarNode with id nodeId to inactive
   */
  setInactive(nodeId: string) {
    this.inactiveNode.next(nodeId);
  }

  /**
   * Call this function to subscribe to the BehaviorSubject inactiveNode
   */
  getInactiveNode() {
    return this.inactiveNode;
  }

  getTopButtonSubject() {
    return this.topButtonSubject;
  }

  setTopButtons(buttons: SidebarButton[]) {
    this.topButtonSubject.next(buttons);
  }

  toggle() {
    this.isVisible.update(vis => !vis);
  }
}
