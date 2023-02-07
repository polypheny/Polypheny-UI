import {Injectable, Input} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {BehaviorSubject} from 'rxjs';
import {InformationService} from '../../services/information.service';
import {ConfigService} from '../../services/config.service';
import * as $ from 'jquery';
import {CrudService} from '../../services/crud.service';
import {SchemaRequest} from '../../models/ui-request.model';
import {JavaPage, SidebarNode} from '../../models/sidebar-node.model';
import {Router} from '@angular/router';
import {BreadcrumbItem} from '../breadcrumb/breadcrumb-item';
import {BreadcrumbService} from '../breadcrumb/breadcrumb.service';

@Injectable({
    providedIn: 'root'
})

//docs: https://angular2-tree.readme.io/docs/
export class LeftSidebarService {

    @Input() schemaEdit: boolean;
    router;

    constructor(
        private _http: HttpClient,
        private _informationService: InformationService,
        private _configService: ConfigService,
        private _crud: CrudService,
        private _breadcrumb: BreadcrumbService
    ) {
    }

    nodes: BehaviorSubject<Object[]> = new BehaviorSubject<Object[]>([]);
    error: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    //node that should be set inactive:
    private inactiveNode: BehaviorSubject<string> = new BehaviorSubject<string>(null);
    private resetSubject = new BehaviorSubject<boolean>(false);
    schemaType: string;


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
    };

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
        return this._informationService.getPageList().subscribe(
            res => {
                this.nodes.next(this.mapPages(res, 'information'));
                this.error.next(null);
            }, err => {
                this.nodes.next([]);
                this.error.next('Could not get page list.');
                console.log(err);
            }
        );
    }

    listConfigManagerPages() {
        return this._configService.getPageList().subscribe(
            res => {
                this.nodes.next(this.mapPages(res, 'config'));
                this.error.next(null);
            }, err => {
                this.nodes.next([]);
                this.error.next('Could not get page list.');
                console.log(err);
            }
        );
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
        $('body').addClass('sidebar-lg-show');
    }

    close() {
        this.nodes.next([]);
        $('body').removeClass('sidebar-lg-show');
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
    setSchema(schemaRequest: SchemaRequest, _router: Router) {
        this._crud.getSchema(schemaRequest).subscribe(
            res => {
                this.error.next(null);
                const schemaTemp = <SidebarNode[]>res;
                const schema = [];
                this.router = _router;
                for (const s of schemaTemp) {
                    schema.push(SidebarNode.fromJson(s));
                }
                //Schema editing view

                // this.router.url.startsWith('/views/schema-editing/'
                // !schemaRequest.views && schemaRequest.depth === 2
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
                        val.routerLink = schemaRequest.routerLinkRoot;
                        val.disableRouting();
                        val.setAutoExpand(false);
                        val.setAction(nodeBehavior);
                        val.children.forEach((v: SidebarNode, k) => {
                            v.routerLink = schemaRequest.routerLinkRoot + val.id;
                            v.disableRouting();
                            v.setAutoExpand(false);
                            v.setAction(nodeBehavior);
                        });
                        //val.children.unshift( new SidebarNode( val.id+'.manageTables', 'manage tables', 'fa fa-clone', schemaRequest.routerLinkRoot + val.id ) );
                    });
                    //schema.unshift( new SidebarNode( 'schema', 'schema', 'fa fa-database', '/views/schema-editing') );
                }
                //Uml view
                else if (schemaRequest.depth === 1) {

                    schema.forEach((val, key) => {
                        val.routerLink = schemaRequest.routerLinkRoot + val.id;
                    });
                }
                this.setNodes(schema);
            }, err => {
                this.error.next('Could not load database schema.');
                console.log(err);
            }
        );
        this.open();
    }

    setTableSchema(schemaRequest: SchemaRequest) {
        this._crud.getSchema(schemaRequest).subscribe(
            res => {
                this.error.next(null);
                const schema = <SidebarNode[]>res;
                this.schemaEdit = false;
                //Schema editing view
                if (schemaRequest.schemaEdit && schemaRequest.depth === 2) {
                    this.schemaEdit = true;
                    schema.forEach((val, key) => {
                        val.routerLink = schemaRequest.routerLinkRoot;
                        val.children.forEach((v, k) => {
                            v.routerLink = schemaRequest.routerLinkRoot + val.id;
                        });
                        //val.children.unshift( new SidebarNode( val.id+'.manageTables', 'manage tables', 'fa fa-clone', schemaRequest.routerLinkRoot + val.id ) );
                    });
                    //schema.unshift( new SidebarNode( 'schema', 'schema', 'fa fa-database', '/views/schema-editing') );
                }
                //Uml view
                else if (schemaRequest.depth === 1) {
                    schema.forEach((val, key) => {
                        val.routerLink = schemaRequest.routerLinkRoot + val.id;
                    });
                }
                this.setNodes(schema);
            }, err => {
                this.error.next('Could not load database schema.');
                //this._toast.toast( 'server error', 'Could not load database schema.', 0, 'bg-danger' );
                console.log(err);
            }
        );
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

}
