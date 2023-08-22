import {AfterViewInit, Component, OnInit, ViewChild} from '@angular/core';
import * as $ from 'jquery';
import {Router} from '@angular/router';
import {LeftSidebarService} from './left-sidebar.service';
import {TreeComponent, TreeModel} from '@ali-hm/angular-tree-component';

;


@Component({
    selector: 'app-left-sidebar',
    templateUrl: './left-sidebar.component.html',
    styleUrls: ['./left-sidebar.component.scss']
})

//docs: https://angular2-tree.readme.io/docs/
export class LeftSidebarComponent implements OnInit, AfterViewInit {

    static readonly EXPAND_SHOWN_ROUTES: String[] = ['/views/monitoring', '/views/config', '/views/uml', '/views/querying/console', '/views/querying/relational-algebra'];

    @ViewChild('tree', {static: false}) treeComponent: TreeComponent;
    nodes = [];
    options;
    error;
    router;

    constructor(
        _router: Router,
        private _sidebar: LeftSidebarService,
    ) {
        this.router = _router;
        //this.nodes = nodes;
        this.options = {
            actionMapping: {
                mouse: {
                    click: (tree, node, $event) => {
                        if (node.data.action !== null) {
                            node.data.action(tree, node, $event);
                        }
                        if (node.data.routerLink && node.data.allowRouting) {
                            _router.navigate([node.data.routerLink]);
                        }
                        if (node.data.isAutoExpand()) {
                            node.toggleExpanded();
                            //TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
                        }
                        if (node.data.isAutoActive()) {
                            node.setIsActive(true, false);
                        }
                    }
                },
            },
            allowDrag: (node) => node.data.allowDrag,
            allowDrop: false
        };

        _sidebar.getError().subscribe(
            error => {
                this.error = error;
            }
        );
    }

    ngOnInit() {
    }

    ngAfterViewInit(): void {
        const treeModel: TreeModel = this.treeComponent.treeModel;

        // todo 2-way-binding https://angular2-tree.readme.io/docs/save-restore

        $('#search-tree').on('keyup', function (e) {
            if (e.which === 27) { // esc
                $(this).val('');
            }
            treeModel.filterNodes((node) => {
                return node.data.name.toLowerCase().includes($(this).val().toLowerCase());
            });
        });

        this._sidebar.getNodes().subscribe(
            nodes => {
                this.nodes = nodes;
                if (nodes.length === 0) {
                    this.treeComponent.treeModel.activeNodeIds = {};
                    // this.treeComponent.treeModel.setFocusedNode(null);
                    // this.treeComponent.treeModel.expandedNodeIds = {};
                }
                this.expandAll();
            }
        );

        this._sidebar.getInactiveNode().subscribe(
            inactiveNode => {
                if (inactiveNode !== null) {
                    this.treeComponent.treeModel.getNodeById(inactiveNode).setIsActive(false, true);
                }
            }
        );

        this._sidebar.getResetSubject().subscribe(
            collapse => {
                if (collapse === true) {
                    this.reset();
                } else {
                    this.treeComponent.treeModel.activeNodeIds = {};
                }
            }
        );

    }

    isExpandAndCollapseShown() {
        for (const route of LeftSidebarComponent.EXPAND_SHOWN_ROUTES) {
            if (this.router.url.startsWith(route)) {
                return false;
            }
        }
        return true;
    }

    expandAll() {
        this.treeComponent.treeModel.expandAll();
    }

    collapseAll() {
        this.treeComponent.treeModel.collapseAll();
    }

    /**
     * Reset tree completely, set all active nodes to inactive, collapse all
     */
    reset() {
        // from: https://angular2-tree.readme.io/discuss/583cc18bf0f9af0f007218ff
        this.treeComponent.treeModel.setFocusedNode(null);
        this.treeComponent.treeModel.expandedNodeIds = {};
        this.treeComponent.treeModel.activeNodeIds = {};
    }

    needsButton() {
        return this.router.url.startsWith('/views/schema-editing/');
    }

    hasChildren(nodes: any[]): boolean {
        for (const node of nodes) {
            if (node.children.length > 0) {
                return true;
            }
        }
        return false;
    }
}
