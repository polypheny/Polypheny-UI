import {Component, HostListener, Input, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../../services/crud.service';
import {PolyType, ResultSet} from '../../../components/data-view/models/result-set.model';
import {ToastService} from '../../../components/toast/toast.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {GraphPlacements, Store} from '../../adapters/adapter.model';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {Subscription} from 'rxjs';

@Component({
    selector: 'app-graph-edit',
    templateUrl: './graph-edit-graph.component.html',
    styleUrls: ['./graph-edit-graph.component.scss']
})

export class GraphEditGraphComponent implements OnInit, OnDestroy {

    @Input()
    graphId: number;
    @Input()
    graphName: string;

    resultSet: ResultSet;
    types: PolyType[] = [];
    editColumn = -1;
    confirm = -1;


    //data placement handling
    stores: Store[];
    selectedStore: Store;
    dataPlacements: GraphPlacements;
    isAddingPlacement = false;


    subscriptions = new Subscription();

    @ViewChild('placementModal', {static: false}) public placementModal: ModalDirective;
    @ViewChild('partitioningModal', {static: false}) public partitioningModal: ModalDirective;
    @ViewChild('partitionFunctionModal', {static: false}) public partitionFunctionModal: ModalDirective;

    constructor(
        private _route: ActivatedRoute,
        private _leftSidebar: LeftSidebarService,
        public _crud: CrudService,
        private _toast: ToastService,
        public _types: DbmsTypesService
    ) {
    }

    ngOnInit() {
        this.getStores();
        this.getPlacements();
    }

    ngOnDestroy() {
        $(document).off('click');
        this.subscriptions.unsubscribe();
    }

    //see https://medium.com/claritydesignsystem/1b66d45b3e3d
    @HostListener('window:click', ['$event.target'])
    onClick(targetElement: string) {
        const self = this;
        if ($(targetElement).parents('.editing').length === 0) {
            self.editColumn = -1;
        }
    }

    /*getGraphId() {
        this.graphId = this._route.snapshot.paramMap.get('id');
        const sub = this._route.params.subscribe((params) => {
            this.graphId = params['id'];
            this.getStores();
            this.getPlacements();
        });
        this.subscriptions.add(sub);
    }*/


    getStores() {
        this._crud.getStores().subscribe(
            res => {
                this.stores = <Store[]>res;
            }, err => {
                console.log(err);
            });
    }

    getAddableStores(): Store[] {
        if (!this.stores) {
            return [];
        }
        return this.stores.filter((s: Store) => {
            //hide stores that are already part of the placement
            if (this.dataPlacements && this.dataPlacements.stores && this.dataPlacements.stores.length > 0) {
                let showStore = true;
                for (const store of this.dataPlacements.stores) {
                    if (store.uniqueName === s.uniqueName) {
                        showStore = false;
                    }
                }
                return showStore;
            } else {
                return true;
            }
        });
    }


    modifyPlacement(method: 'ADD' | 'DROP', store = null) {
        if (store != null) {
            this.selectedStore = store;
        }
        if (!this.selectedStore) {
            return;
        }
        this.isAddingPlacement = true;
        this._crud.addDropGraphPlacement(this.graphId, this.graphName, this.selectedStore.adapterId, method).subscribe(res => {
            const result = <ResultSet>res;
            if (result.error) {
                this._toast.exception(result);
            } else {
                if (method === 'ADD') {
                    this._toast.success('Added placement on store ' + this.selectedStore.uniqueName, result.generatedQuery, 'Added placement');
                } else if (method === 'DROP') {
                    this._toast.success('Dropped placement on store ' + this.selectedStore.uniqueName, result.generatedQuery, 'Dropped placement');
                }
                this.getPlacements();
            }
        }).add(() => {
            this.isAddingPlacement = false;
        });
    }


    validate(defaultValue) {
        if (defaultValue === null) {
            return '';
        } else if (isNaN(defaultValue) || defaultValue === '') {
            return 'is-invalid';
        } else {
            return 'is-valid';
        }
    }

    private getPlacements() {
        this._crud.getGraphPlacements(this.graphId, this.graphId, []).subscribe(res => {
            console.log(res);
            this.dataPlacements = <GraphPlacements>res;
            if (this.dataPlacements.exception) {
                // @ts-ignore
                this._toast.exception({
                    error: this.dataPlacements.exception.detailMessage,
                    exception: this.dataPlacements.exception
                });
            }
        });
    }

}
