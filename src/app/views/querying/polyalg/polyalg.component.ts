import {Component, OnDestroy, OnInit, signal, ViewChild, WritableSignal} from '@angular/core';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../../services/crud.service';
import {WebSocket} from '../../../services/webSocket';
import {RelationalResult, Result} from '../../../components/data-view/models/result-set.model';
import {AlgViewerComponent} from '../../../components/polyalg/polyalg-viewer/alg-viewer.component';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {Subscription} from 'rxjs';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {InformationObject, InformationPage} from '../../../models/information-page.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {BreadcrumbItem} from '../../../components/breadcrumb/breadcrumb-item';

@Component({
    selector: 'app-polyalg',
    templateUrl: './polyalg.component.html',
    styleUrl: './polyalg.component.scss'
})
export class PolyalgComponent implements OnInit, OnDestroy {

    @ViewChild('algViewer') algViewer: AlgViewerComponent;

    websocket: WebSocket;
    readonly loading: WritableSignal<boolean> = signal(false);
    result: WritableSignal<Result<any, any>> = signal(null);
    private subscriptions = new Subscription();
    showingAnalysis = false;
    queryAnalysis: InformationPage;

    samplePlan = '{"opName":"PROJECT","arguments":{"projects":{"type":"LIST","value":{"innerType":"REX","args":[{"type":"REX","value":{"rex":"employeeno","alias":"employeeno"}},{"type":"REX","value":{"rex":"relationshipjoy","alias":"happiness"}}]}}},"inputs":[{"opName":"FILTER","arguments":{"condition":{"type":"REX","value":{"rex":"<(age0, 30)"}},"variables":{"type":"LIST","value":{"innerType":"LIST","args":[]}}},"inputs":[{"opName":"JOIN","arguments":{"type":{"type":"JOIN_TYPE_ENUM","value":{"arg":"INNER","enum":"JoinAlgType"},"isEnum":true},"semiJoinDone":{"type":"BOOLEAN","value":{"arg":false}},"variables":{"type":"LIST","value":{"innerType":"LIST","args":[]}},"condition":{"type":"REX","value":{"rex":"=(employeeno, employeeno0)"}}},"inputs":[{"opName":"SCAN","arguments":{"entity":{"type":"ENTITY","value":{"arg":"public.emp","namespaceId":0,"id":3}}},"inputs":[]},{"opName":"PROJECT#","arguments":{"projects":{"type":"LIST","value":{"innerType":"STRING","args":[{"type":"STRING","value":{"arg":"employeeno","alias":"employeeno0"}},{"type":"STRING","value":{"arg":"age","alias":"age0"}}]}}},"inputs":[{"opName":"PROJECT","arguments":{"projects":{"type":"LIST","value":{"innerType":"REX","args":[{"type":"REX","value":{"rex":"employeeno","alias":"employeeno"}},{"type":"REX","value":{"rex":"age","alias":"age"}}]}}},"inputs":[{"opName":"SCAN","arguments":{"entity":{"type":"ENTITY","value":{"arg":"public.emp","namespaceId":0,"id":3}}},"inputs":[]}]}]}]}]}]}';

    constructor(
        private _crud: CrudService,
        private _leftSidebar: LeftSidebarService,
        private _toast: ToasterService,
        private _breadcrumb: BreadcrumbService,
        private _settings: WebuiSettingsService) {

        this.websocket = new WebSocket();
        this.initWebsocket();
    }

    ngOnInit(): void {
        this._leftSidebar.close();
    }

    ngOnDestroy() {
        this._leftSidebar.close();
        this.subscriptions.unsubscribe();
        this.websocket.close();
    }

    async executePolyAlg() {
        const polyAlg = await this.algViewer.getPolyAlg();
        if (polyAlg == null) {
            this._toast.warn('Plan is invalid');
            return;
        }
        this._leftSidebar.setNodes([]);
        this._leftSidebar.open();

        this.loading.set(true);
        if (!this._crud.executePolyAlg(this.websocket, polyAlg)) {
            this.loading.set(false);
            this.result.set(new RelationalResult('Could not establish a connection with the server.'));
        }
    }

    initWebsocket() {
        //function to define behavior when clicking on a page link
        const nodeBehavior = (tree, node, $event) => {
            if (node.data.id === 'polyPlanBuilder') {
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

                    sidebarNodes.unshift(new SidebarNode('polyPlanBuilder', 'PolyPlan Builder', 'fa fa-cubes').setAction(nodeBehavior));

                    this._leftSidebar.setNodes(sidebarNodes);
                    if (sidebarNodes.length > 0) {
                        this._leftSidebar.open();
                    } else {
                        this._leftSidebar.close();
                    }

                } else if (msg.hasOwnProperty('data') || msg.hasOwnProperty('affectedTuples') || msg.hasOwnProperty('error')) { // Result
                    this.loading.set(false);
                    this.result.set(<Result<any, any>>msg);

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

}
