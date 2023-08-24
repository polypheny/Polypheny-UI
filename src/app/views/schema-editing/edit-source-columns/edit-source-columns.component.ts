import {Component, OnDestroy, OnInit} from '@angular/core';
import {RelationalResult, UiColumnDefinition} from '../../../components/data-view/models/result-set.model';
import {CrudService} from '../../../services/crud.service';
import {ColumnRequest, EditTableRequest} from '../../../models/ui-request.model';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';
import {ToastService} from '../../../components/toast/toast.service';
import {BehaviorSubject, Observable, Subscription} from 'rxjs';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {ForeignKey, Uml} from '../../../views/uml/uml.model';
import {CatalogService} from '../../../services/catalog.service';
import {
    AllocationPlacementModel,
    EntityModel,
    EntityType,
    NamespaceModel,
    TableModel
} from '../../../models/catalog.model';
import {mergeMap} from 'rxjs/operators';

@Component({
    selector: 'app-edit-source-columns',
    templateUrl: './edit-source-columns.component.html',
    styleUrls: ['./edit-source-columns.component.scss']
})
export class EditSourceColumnsComponent implements OnInit, OnDestroy {

    constructor(
        private _crud: CrudService,
        private _route: ActivatedRoute,
        private _toast: ToastService,
        public _types: DbmsTypesService,
        public _catalog: CatalogService
    ) {
    }

    entity: BehaviorSubject<EntityModel> = new BehaviorSubject<EntityModel>(null);
    namespace: BehaviorSubject<NamespaceModel> = new BehaviorSubject<NamespaceModel>(null);
    columns: BehaviorSubject<UiColumnDefinition[]> = new BehaviorSubject<UiColumnDefinition[]>([]);
    errorMsg: string;
    editingCol: string;
    placement: BehaviorSubject<AllocationPlacementModel> = new BehaviorSubject<AllocationPlacementModel>(null);
    subscriptions = new Subscription();
    foreignKeys: ForeignKey[] = [];
    underlyingTables: {};

    public readonly EntityType = EntityType;

    ngOnInit(): void {
        //this.tableId = this._route.snapshot.paramMap.get('id');
        const sub = this._route.params.subscribe((params) => {
            const splits = params['id'].split('.');
            this._catalog.getEntityFromName(splits[0], splits[1]).subscribe(entity => {
                this.entity.next(<TableModel>entity);
            });
            this.subscriptions.add(this.subscribeColumns());
            this.getUml();
            this.subscriptions.add(this.subscribePlacements());
        });
        this.subscriptions.add(sub);
        //this.fetchCurrentColumns();
        
        //this.getPlacements();
        const self = this;
        $(document).on('click', function (e) {
            if ($(e.target).hasClass('rename') || $(e.target).hasClass('add-col')) {
                return;
            }
            if ($(e.target).parents('.editing').length === 0) {
                self.editingCol = undefined;
            }
        });
    }

    ngOnDestroy() {
        $(document).off('click');
        this.subscriptions.unsubscribe();
    }

    subscribeColumns() {
        this.entity.pipe( 
            mergeMap( entity => this._catalog.getColumns(entity.id) )).subscribe( columns => {
            this.columns.next(columns.map(c => UiColumnDefinition.fromModel(c, this._catalog.getPrimaryKey(c.entityId).value.columnIds)));
        } );


        /*this._crud.getDataSourceColumns(new TableRequest(this.entity.id, null, null, null)).subscribe(
            res => {
                this.resultSet = <ResultSet>res;
            }, err => {
                this.resultSet = new ResultSet(err);
            }
        );*/
    }

    getAddableColumns(): Observable<UiColumnDefinition[]> {
        const cols: UiColumnDefinition[] = [];

        for (const col of this.columns.value) {
            if (!this._catalog.getColumns(this.entity.value.id).value.find(h => h.name === col.name)) {
                cols.push(col);
            }
        }

        return new BehaviorSubject(cols);
    }

    dropColumn(col: UiColumnDefinition) {
        this._crud.dropColumn(new ColumnRequest(this.entity.value.id, col)).subscribe(
            res => {
                const result = <RelationalResult>res;
                if (result.error) {
                    this._toast.exception(result);
                } else {
                    this._toast.success('The source column was dropped');
                }
                this._catalog.updateIfNecessary();
            }, err => {
                console.log(err);
            }
        );
    }

    renameColumn(oldCol: UiColumnDefinition, newName, tabletype) {
        if (newName.trim() === '') {
            this._toast.error('Name can not be empty.');
            return;
        }
        const newCol = Object.assign({}, oldCol);
        newCol.name = newName;
        const request = new ColumnRequest(this.entity.value.id, oldCol, newCol, true, tabletype);
        this._crud.updateColumn(request).subscribe(
            res => {
                const result = <RelationalResult>res;
                if (result.error) {
                    this._toast.exception(result);
                } else {
                    this._toast.success('Renamed column "' + oldCol.name + '" to "' + newName + '"');
                }
                this.editingCol = undefined;
                this._catalog.updateIfNecessary();
            }, err => {
                this._toast.error('Could not rename the column "' + oldCol.name + '" to "' + newName + '"');
                console.log(err);
            }
        );
    }

    addColumn(col: UiColumnDefinition, newName: string, newDefault: string) {
        const request = new ColumnRequest(this.entity.value.id, null, new UiColumnDefinition(col.physicalName, null, null, col.dataType, '', null, null, newDefault, -1, -1, newName));
        this._crud.addColumn(request).subscribe(
            res => {
                const result = <RelationalResult>res;
                if (result.error) {
                    this._toast.exception(result);
                } else {
                    this._toast.success('Added column "' + newName + '"');
                }
                this._catalog.updateIfNecessary();
                this.editingCol = undefined;
            }, err => {
                this._toast.error('Could not add the column "' + newName + '"');
                console.log(err);
            }
        );
    }



    subscribePlacements() {
        this.placement = this._catalog.getPlacements(this.entity.value.id)[0];

        /*this._crud.getDataPlacements(this.namespace.id, this.entity.id).subscribe(
            res => {
                this.dataPlacement = <Placements>res;
                if (this.dataPlacement.tableType === 'VIEW') {
                    this.getUnderlyingTables();
                }
            }, err => {
                this._toast.error('Could not load data placements');
                console.log(err);
            }
        );*/
    }

    getUml() {
        this.foreignKeys = [];
        /*const t = this.tableId.split('\.');
        this.schema = t[0];
        if (!this.schema) {
            this.foreignKeys = null;
            return;
        }*/
        this._crud.getUml(new EditTableRequest(this.namespace.value.id)).subscribe(
            res => {

                const uml: Uml = <Uml>res;
                const fks = new Map<string, ForeignKey>();

                uml.foreignKeys.forEach((v, k) => {
                    if ((v.sourceSchema + '.' + v.sourceTable) === this._catalog.getFullEntityName(this.entity.value.id).value) {
                        if (fks.has(v.fkName)) {
                            const fk = fks.get(v.fkName);
                            fk.targetColumn = fk.targetColumn + ', ' + v.targetColumn;
                            fk.sourceColumn = fk.sourceColumn + ', ' + v.sourceColumn;
                        } else {
                            fks.set(v.fkName, v);
                        }
                        this.foreignKeys = [...fks.values()];
                    }
                });
            }, err => {
                console.log(err);
            }
        );
    }

    validTableName(name: string): boolean {
        if (name.trim() === '') {
            return false;
        }
        return true;
    }

    getTitle() {
        return this._route.params['id'];
    }
}
