import {AfterViewInit, Component, computed, inject, OnInit, Signal, signal, ViewChild} from '@angular/core';
import * as $ from 'jquery';
import {Router} from '@angular/router';
import {LeftSidebarService} from './left-sidebar.service';
import {TreeComponent, TreeModel} from '@ali-hm/angular-tree-component';
import {CatalogService} from '../../services/catalog.service';
import {CatalogState} from '../../models/catalog.model';
import {AdapterModel, AdapterType} from '../../views/adapters/adapter.model';
import {CrudService, SourceRefreshSummary} from '../../services/crud.service';
import {SourceRefreshRequest} from '../../models/ui-request.model';
import {ToasterService} from '../toast-exposer/toaster.service';


@Component({
    selector: 'app-left-sidebar',
    templateUrl: './left-sidebar.component.html',
    styleUrls: ['./left-sidebar.component.scss']
})

//docs: https://angular2-tree.readme.io/docs/
export class LeftSidebarComponent implements OnInit, AfterViewInit {

    readonly showSourceRefreshModal = signal(false);
    readonly showSourceRefreshSummaryModal = signal(false);
    readonly selectedSourceIds = signal<number[]>([]);
    readonly sourceRefreshSummaries = signal<SourceRefreshSummary[]>([]);

    constructor() {
        this.router = this._router;
        //this.nodes = nodes;
        this.options = {
            actionMapping: {
                mouse: {
                    click: (tree, node, $event) => {
                        this._sidebar.selectedNodeId = node.data.id;
                        if (node.data.action !== null) {
                            node.data.action(tree, node, $event);
                        }
                        if (node.data.routerLink && node.data.allowRouting) {
                            this._router.navigate([node.data.routerLink]).then(r => null);
                        }
                        if (node.data.isAutoExpand()) {
                            node.toggleExpanded();
                            //TREE_ACTIONS.TOGGLE_EXPANDED(tree, node, $event);
                        }
                        if (node.data.isAutoActive()) {
                            node.setIsActive(true, false);
                        }
                    },
                    drop: (tree, node, $event, {from, to}) => {
                        if (node.data.dropAction !== null) {
                            node.data.dropAction(tree, node, $event, {from, to});
                        }
                    },

                },
            },
            allowDrag: (node) => node.data.allowDrag,
            allowDrop: (element, {parent, index}) => {
                return element.data.allowDropFrom && parent.data.allowDropTo && element.data.id !== parent.data.id;
            }
        };

        this._sidebar.getError().subscribe(
            error => {
                this.error = error;
            }
        );

        this.sidebarAvailable = computed(() => {
            return this.buttons.length > 0 || this.error || this.nodes.length > 0;
        });
        this.sourceAdapters = computed(() =>
            Array.from(this._catalog.adapters().values())
                .filter(adapter => adapter.type === AdapterType.SOURCE)
                .filter(adapter => adapter.adapterName === 'PostgreSQL' || adapter.adapterName === 'MySQL' || adapter.adapterName === 'MongoDB')
                .sort((left, right) => left.name.localeCompare(right.name))
        );
    }

    static readonly EXPAND_SHOWN_ROUTES: String[] = [
        '/views/monitoring', '/views/config', '/views/uml', '/views/querying/console', '/views/notebooks', '/views/workflows'];

    private readonly _router = inject(Router);
    public readonly _sidebar = inject(LeftSidebarService);
    public readonly _catalog = inject(CatalogService);
    private readonly _crud = inject(CrudService);
    private readonly _toast = inject(ToasterService);

    public readonly sidebarAvailable: Signal<boolean>;
    public readonly sourceAdapters: Signal<AdapterModel[]>;

    @ViewChild('tree', {static: false}) treeComponent: TreeComponent;
    nodes = [];
    buttons = [];
    options;
    error;
    router;

    protected readonly CatalogState = CatalogState;

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
                    this.deselectAll();
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
                    this.deselectAll();
                }
            }
        );

        this._sidebar.getTopButtonSubject().subscribe(buttons => this.buttons = buttons);
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
        this.deselectAll();
    }

    needsButton() {
        return this.router.url.startsWith('/views/schema-editing/');
    }

    needsSourceRefreshButton() {
        return this.router.url.startsWith('/views/schema-editing/')
            || this.router.url.startsWith('/views/data-table/');
    }

    isSchemaSidebarRefreshButton() {
        return this.router.url.startsWith('/views/schema-editing/');
    }

    openSourceRefreshModal() {
        this.selectedSourceIds.set([]);
        this.showSourceRefreshModal.set(true);
    }

    closeSourceRefreshModal() {
        this.showSourceRefreshModal.set(false);
    }

    closeSourceRefreshSummaryModal() {
        this.showSourceRefreshSummaryModal.set(false);
        this.sourceRefreshSummaries.set([]);
    }

    toggleSourceSelection(sourceId: number) {
        if (this.selectedSourceIds().includes(sourceId)) {
            this.selectedSourceIds.set(this.selectedSourceIds().filter(id => id !== sourceId));
            return;
        }

        this.selectedSourceIds.set([...this.selectedSourceIds(), sourceId]);
    }

    isSourceSelected(sourceId: number) {
        return this.selectedSourceIds().includes(sourceId);
    }

    selectAllSources() {
        if (this.selectedSourceIds().length === this.sourceAdapters().length) {
            this.selectedSourceIds.set([]);
            return;
        }

        this.selectedSourceIds.set(this.sourceAdapters().map(source => source.id));
    }

    synchronizeSelectedSources() {
        const selectedSourceIds = [...this.selectedSourceIds()];
        const request = new SourceRefreshRequest(selectedSourceIds);
        this._crud.refreshSelectedSources(request).subscribe({
            next: result => {
                console.log('[left-sidebar] selected sources synchronized', {
                    refreshedSources: result.refreshedSources,
                    refreshedCount: result.refreshedCount,
                    rawResult: result
                });
                const refreshSummaries = result.refreshSummaries ?? [];
                console.log('[left-sidebar] source refresh summaries received', refreshSummaries);
                refreshSummaries.forEach((summary, summaryIndex) => {
                    console.log('[left-sidebar] source refresh summary item', {
                        summaryIndex,
                        sourceName: summary.sourceName,
                        entityName: summary.entityName,
                        dataModel: summary.dataModel,
                        changeDescriptions: summary.changeDescriptions
                    });
                    (summary.changeDescriptions ?? []).forEach((change, changeIndex) => {
                        console.log('[left-sidebar] source refresh summary change', {
                            summaryIndex,
                            changeIndex,
                            value: change,
                            type: typeof change
                        });
                    });
                });
                if (refreshSummaries.length > 0) {
                    this.sourceRefreshSummaries.set(refreshSummaries);
                    console.log('[left-sidebar] source refresh summaries stored', this.sourceRefreshSummaries());
                    this.showSourceRefreshSummaryModal.set(true);
                } else {
                    this._toast.info('No source schema changes detected.');
                }
                this._catalog.updateIfNecessary().subscribe(() => {
                    this._sidebar.announceSourceRefresh(selectedSourceIds);
                });
                this.closeSourceRefreshModal();
            },
            error: err => {
                console.log(err);
                this._toast.error('Could not synchronize the selected sources.');
            }
        });
    }

    hasChildren(nodes: any[]): boolean {
        for (const node of nodes) {
            if (node.children.length > 0) {
                return true;
            }
        }
        return false;
    }

    deselectAll() {
        this.treeComponent.treeModel.activeNodeIds = {};
    }
}
