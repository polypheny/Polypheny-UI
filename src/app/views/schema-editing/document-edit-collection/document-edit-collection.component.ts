import {Component, HostListener, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../../services/crud.service';
import {
    DbColumn,
    PartitioningRequest,
    PolyType,
    ResultSet
} from '../../../components/data-view/models/result-set.model';
import {ToastDuration, ToastService} from '../../../components/toast/toast.service';
import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {ColumnRequest, EditTableRequest} from '../../../models/ui-request.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {Placements, Store} from '../../adapters/adapter.model';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {Subscription} from 'rxjs';
import {ForeignKey, Uml} from '../../../views/uml/uml.model';

@Component({
    selector: 'app-document-edit-collection',
    templateUrl: './document-edit-collection.component.html',
    styleUrls: ['./document-edit-collection.component.scss']
})

export class DocumentEditCollectionComponent implements OnInit, OnDestroy {

    collectionId: number;
    collection: string;
    namespaceId: number;
    foreignKeys: ForeignKey[] = [];

    resultSet: ResultSet;
    types: PolyType[] = [];
    editColumn = -1;
    createColumn = new DbColumn('', false, true, 'text', '', null, null, null);
    confirm = -1;
    oldColumns = new Map<string, DbColumn>();
    updateColumn = new UntypedFormGroup({name: new UntypedFormControl('')});

    constraints: ResultSet;
    newPrimaryKey: DbColumn[];


    //data placement handling
    stores: Store[];
    selectedStore: Store;
    dataPlacements: Placements;
    placementMethod: 'ADD' | 'MODIFY' | 'DROP';
    isAddingPlacement = false;

    //partition handling
    partitioningRequest: PartitioningRequest = new PartitioningRequest();

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

        //this.getCollectionId();
        this.getFixedFields();
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

    /*getCollectionId() {
        this.collectionId = this._route.snapshot.paramMap.get('id');
        const sub = this._route.params.subscribe((params) => {
            this.collectionId = params['id'];
            if (this.collectionId.includes('.')) {
                const t = this.collectionId.split('\.');
                this.schema = t[0];
                this.collection = t[1];
                this.getFixedFields();
                this.getPlacements();
                this.getUml();
            }
        });
        this.subscriptions.add(sub);
    }*/

    getFixedFields() {
        this._crud.getFixedFields(new ColumnRequest(this.collectionId)).subscribe(
            res => {
                console.log(res);
                this.resultSet = <ResultSet>res;

            }, err => {
                this._toast.error('Could not load fields of the collection.', null, ToastDuration.INFINITE);
                console.log(err);
            }
        );
    }

    columnValidation(columnName: string, editing: string = null) {
        if (editing) {
            if (this.resultSet.header.filter((h) => h.name === columnName && h.name !== editing).length > 0) {
                return 'is-invalid';
            }
        } else {
            if (this.resultSet.header.filter((h) => h.name === columnName).length > 0) {
                return 'is-invalid';
            }
        }
        return this._crud.getValidationClass(columnName);
    }

    editCol(i: number, col: DbColumn, e = null) {
        if (col.name === '_id' || col.name === '_data') {
            return;
        }
        if (e.target.id === 'delete') {
            return;
        }
        if (this.editColumn !== i) {
            if (col.defaultValue === undefined) {
                col.defaultValue = null;
            }
            this.updateColumn = new UntypedFormGroup({
                name: new UntypedFormControl(col.name, Validators.required),
                oldName: new UntypedFormControl(col.name),
                nullable: new UntypedFormControl(col.nullable),
                dataType: new UntypedFormControl(col.dataType),
                collectionsType: new UntypedFormControl(col.collectionsType),
                precision: new UntypedFormControl(col.precision),
                scale: new UntypedFormControl(col.scale),
                dimension: new UntypedFormControl(col.dimension),
                cardinality: new UntypedFormControl(col.cardinality),
                defaultValue: new UntypedFormControl({value: col.defaultValue, disabled: col.defaultValue === null})
            });
            this.editColumn = i;
        }
    }

    saveCol() {
        if (!this._crud.nameIsValid(this.updateColumn.controls['name'].value)) {
            this._toast.warn(this._crud.invalidNameMessage('column'), 'invalid column name');
            return;
        }
        if (this.resultSet.header.filter((h) => h.name === this.updateColumn.controls['name'].value && h.name !== this.updateColumn.controls['oldName'].value).length > 0) {
            this._toast.warn('This field name already exists', 'invalid field name');
            return;
        }
        const oldColumn = this.oldColumns.get(this.updateColumn.controls['oldName'].value);
        const newColumn = new DbColumn(
            this.updateColumn.controls['name'].value,
            null,
            this.updateColumn.controls['nullable'].value,
            this.updateColumn.controls['dataType'].value,
            this.updateColumn.controls['collectionsType'].value,
            this.updateColumn.controls['precision'].value,
            this.updateColumn.controls['scale'].value,
            this.updateColumn.controls['defaultValue'].value,
            this.updateColumn.controls['dimension'].value || -1,
            this.updateColumn.controls['cardinality'].value || -1
        );
        if (!this._types.supportsPrecision(newColumn.dataType) && newColumn.precision !== null) {
            newColumn.precision = null;
        }
        if (!this._types.supportsScale(newColumn.dataType) && newColumn.scale !== null) {
            newColumn.scale = null;
        }
        const req = new ColumnRequest(this.collectionId, oldColumn, newColumn);
        this._crud.updateColumn(req).subscribe(
            res => {
                const result = <ResultSet>res;
                this.editColumn = -1;
                this.getFixedFields();
                if (result.error) {
                    this._toast.exception(result, 'Could not update column:');
                    console.log(result);
                } else {
                    this._toast.success('The new field was saved.', result.generatedQuery, 'column saved');
                }
            }, err => {
                this._toast.error('Could not save field due to an error on the server.', null, ToastDuration.INFINITE);
                console.log(err);
            }
        );
    }

    addColumn() {
        this.createColumn.dataType = 'VARCHAR';
        this.createColumn.precision = 3000;
        if (this.createColumn.name === '') {
            this._toast.warn('Please provide a name for the new field.', 'missing field name');
            return;
        }
        if (!this._crud.nameIsValid(this.createColumn.name)) {
            this._toast.warn(this._crud.invalidNameMessage('column'), 'invalid field name');
            return;
        }
        if (this.resultSet.header.filter((h) => h.name === this.createColumn.name).length > 0) {
            this._toast.warn('There already exists a field with this name', 'invalid field name');
            return;
        }
        if (!this._types.supportsPrecision(this.createColumn.dataType) && this.createColumn.precision !== null) {
            this.createColumn.precision = null;
        }
        if (!this._types.supportsScale(this.createColumn.dataType) && this.createColumn.scale !== null) {
            this.createColumn.scale = null;
        }
        const req = new ColumnRequest(this.collectionId, null, this.createColumn);
        this._crud.addColumn(req).subscribe(
            res => {
                const result = <ResultSet>res;
                if (result.error === undefined) {
                    this.getFixedFields();
                    this.getPlacements();
                    this.createColumn.name = '';
                    this.createColumn.nullable = true;
                    this.createColumn.dataType = this.types[0].name;
                    this.createColumn.collectionsType = '';
                    this.createColumn.precision = null;
                    this.createColumn.scale = null;
                    this.createColumn.defaultValue = null;
                } else {
                    this._toast.exception(result, null, 'server error', ToastDuration.INFINITE);
                }
            }, err => {
                this._toast.error('An error occurred on the server.', null, ToastDuration.INFINITE);
                console.log(err);
            }
        );
    }

    dropColumn(col: DbColumn) {
        this._crud.dropColumn(new ColumnRequest(this.collectionId, col)).subscribe(
            res => {
                this.getFixedFields();
                this.getPlacements();
                this.confirm = -1;
                const result = <ResultSet>res;
                if (result.error) {
                    this._toast.exception(result, 'Could not delete field:', 'server error', ToastDuration.INFINITE);
                }
            }, err => {
                this._toast.error('Could not delete field.', null, ToastDuration.INFINITE);
                console.log(err);
            }
        );
    }


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

    getPlacements() {
        this._crud.getCollectionPlacements(this.namespaceId, this.collectionId, []).subscribe(
            res => {
                this.dataPlacements = <Placements>res;

                if (this.dataPlacements.exception) {
                    // @ts-ignore
                    this._toast.exception({
                        error: this.dataPlacements.exception.detailMessage,
                        exception: this.dataPlacements.exception
                    });
                }
            }, err => {
                console.log(err);
            }
        );
    }

    modifyPlacement(method: 'ADD' | 'DROP', store = null) {
        this.placementMethod = method;
        if (store != null) {
            this.selectedStore = store;
        }
        if (!this.selectedStore) {
            return;
        }
        this.isAddingPlacement = true;
        this._crud.addDropCollectionPlacement(this.namespaceId, this.collectionId, this.collection, this.selectedStore.uniqueName, this.placementMethod).subscribe(
            res => {
                const result = <ResultSet>res;
                if (result.error) {
                    this._toast.exception(result);
                } else {
                    if (this.placementMethod === 'ADD') {
                        this._toast.success('Added placement on store ' + this.selectedStore.uniqueName, result.generatedQuery, 'Added placement');
                    } else if (this.placementMethod === 'MODIFY') {
                        this._toast.success('Modified placement on store ' + this.selectedStore.uniqueName, result.generatedQuery, 'Modified placement');
                    }
                    this.getPlacements();
                }
                this.selectedStore = null;
            }, err => {
                this._toast.error('Could not ' + this.placementMethod.toLowerCase() + ' placement on store ' + this.selectedStore.uniqueName);
            }
        ).add(() => {
            this.isAddingPlacement = false;
        });
    }

    dropPlacement(storeId: number, storeName: string) {
        this._crud.addDropPlacement(this.namespaceId, this.collectionId, storeId, 'DROP').subscribe(
            res => {
                const result = <ResultSet>res;
                if (result.error) {
                    this._toast.exception(result);
                } else {
                    this._toast.success('Dropped placement on store ' + storeName, result.generatedQuery, 'Dropped placement');
                    this.getPlacements();
                }
            }, err => {
                this._toast.error('Could not drop placement on store ' + storeName, 'Error');
            }
        );
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
}
