import {AfterViewInit, Component, Directive, ElementRef, OnDestroy, OnInit, signal, ViewChild, WritableSignal} from '@angular/core';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../../services/crud.service';
import {WebSocket} from '../../../services/webSocket';
import {RelationalResult, Result} from '../../../components/data-view/models/result-set.model';
import {AlgViewerComponent} from '../../../components/polyalg/polyalg-viewer/alg-viewer.component';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {Subscription} from 'rxjs';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {InformationObject, InformationPage, PlanType} from '../../../models/information-page.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {BreadcrumbItem} from '../../../components/breadcrumb/breadcrumb-item';
import {OperatorModel} from '../../../components/polyalg/models/polyalg-registry';
import {DataModel} from '../../../models/ui-request.model';
import {UserMode} from '../../../components/polyalg/polyalg-viewer/alg-editor';

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

    planType: PlanType = 'LOGICAL';
    selectedPlanType: PlanType = 'LOGICAL';
    initialUserMode = UserMode.SIMPLE;
    showPlanTypeModal = signal(false);
    showHelpModal = signal(false);
    showParamsModal = signal(false);
    polyAlg = `PROJECT[employeeno, relationshipjoy AS happiness](
      FILTER[<(age0, 30)](
        JOIN[=(employeeno, employeeno0)](
          SCAN[public.emp],
          PROJECT[employeeno AS employeeno0, age AS age0](
            PROJECT[employeeno, age](
              SCAN[public.emp])))))`;
    physicalExecForm: { polyAlg: string, model: DataModel, params: string[][], values: (string | boolean)[] }
        = {polyAlg: null, model: null, params: null, values: null};

    constructor(
        private _crud: CrudService,
        private _leftSidebar: LeftSidebarService,
        private _toast: ToasterService,
        private _breadcrumb: BreadcrumbService,
        private _settings: WebuiSettingsService) {

        const polyAlgToEdit = localStorage.getItem('polyalg.polyAlg');
        localStorage.removeItem('polyalg.polyAlg'); // only open the plan the first time this component is shown

        if (polyAlgToEdit) {
            this.polyAlg = polyAlgToEdit;
            this.planType = localStorage.getItem('polyalg.planType') as PlanType;
            this.selectedPlanType = this.planType;
            localStorage.removeItem('polyalg.planType');
            this.initialUserMode = UserMode.ADVANCED;
        }

        if (!this.planType) {
            this.showPlanTypeModal.set(true);
        }

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

    executePolyAlg([polyAlg, model]: [string, OperatorModel]) {
        if (polyAlg == null) {
            this._toast.warn('Plan is invalid');
            return;
        }
        // if the OperatorModel is COMMON, we use the relational DataModel
        const dataModel = model === OperatorModel.COMMON ? DataModel.RELATIONAL : DataModel[model];

        if (this.planType === 'PHYSICAL') {
            const regex = /\?\d+:[A-Z_]+(\([\w,\s]+\))?/g; // matches '?0:INTEGER'
            const matches = [...new Set(polyAlg.match(regex))];
            const params = matches.map(m => m.substring(1).split(':')).sort((a, b) => +a[0] - +b[0]);
            for (let i = 0; i < params.length; i++) {
                const type = params[i][1];
                const idx = type.indexOf('(');
                params[i].push(idx === -1 ? type : type.substring(0, idx));
            }

            let values: (string | boolean)[] = params.map(p => p[1] === 'BOOLEAN' ? false : '');
            if (this.physicalExecForm.values != null && JSON.stringify(this.physicalExecForm.params) === JSON.stringify(params)) {
                console.log('equal params!');
                values = this.physicalExecForm.values; // keep existing values
            } else {
                console.log('not equal params: ', this.physicalExecForm.params, params);
            }
            this.physicalExecForm = {
                polyAlg: polyAlg,
                model: dataModel,
                params: params,
                values: values
            };
            if (matches.length === 0) {
                this.executePhysicalPlan();
            } else {
                this.showParamsModal.set(true);
            }
            return;
        }

        this._leftSidebar.setNodes([]);
        this._leftSidebar.open();
        this.result.set(null);

        this.loading.set(true);
        if (!this._crud.executePolyAlg(this.websocket, polyAlg, dataModel, this.planType)) {
            this.loading.set(false);
            this.result.set(new RelationalResult('Could not establish a connection with the server.'));
        }
    }

    executePhysicalPlan() {
        console.log('executing', this.physicalExecForm.values);
        this.showParamsModal.set(false);
        this._leftSidebar.setNodes([]);
        this._leftSidebar.open();
        this.result.set(null);

        const p = this.physicalExecForm;
        this.loading.set(true);
        if (!this._crud.executePhysicalPolyAlg(
            this.websocket,
            p.polyAlg,
            p.model,
            p.values.map(v => `${v}`),
            p.params.map(p => p[1]))) {

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

    handlePlanTypeModalChange($event: boolean) {
        this.showPlanTypeModal.set($event);
    }

    togglePlanTypeModal() {
        this.showPlanTypeModal.update(b => !b);
    }

    choosePlanType() {
        const hasChanged = this.planType !== this.selectedPlanType;
        this.planType = this.selectedPlanType;
        this.showPlanTypeModal.set(false);
        if (hasChanged) {
            this.polyAlg = '';
        }
    }

    handleHelpModalChange($event: boolean) {
        this.showHelpModal.set($event);
    }

    toggleHelpModal() {
        this.showHelpModal.update(b => !b);
    }

    handleParamsModalChange($event: boolean) {
        this.showParamsModal.set($event);
    }

    toggleParamsModal() {
        this.showParamsModal.update(b => !b);
    }
}

// https://stackoverflow.com/a/42820432
@Directive({selector: '[scrollTo]'})
export class ScrollToDirective implements AfterViewInit {
    constructor(private elRef: ElementRef) {
    }

    ngAfterViewInit() {
        this.elRef.nativeElement.scrollIntoView({behavior: 'smooth', block: 'start'});
    }
}
