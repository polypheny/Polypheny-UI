import {Component, OnDestroy, OnInit, signal, WritableSignal} from '@angular/core';
import {RelationalResult, UiColumnDefinition} from '../../../components/data-view/models/result-set.model';
import {CrudService} from '../../../services/crud.service';
import {ColumnRequest, EditTableRequest} from '../../../models/ui-request.model';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {BehaviorSubject, flatMap, Observable, Subscription} from 'rxjs';
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
import {filter, map, mergeMap} from 'rxjs/operators';
import {AdapterModel} from '../../adapters/adapter.model';

@Component({
  selector: 'app-edit-source-columns',
  templateUrl: './edit-source-columns.component.html',
  styleUrls: ['./edit-source-columns.component.scss']
})
export class EditSourceColumnsComponent implements OnInit, OnDestroy {

  constructor(
      private _crud: CrudService,
      private _route: ActivatedRoute,
      private _toast: ToasterService,
      public _types: DbmsTypesService,
      public _catalog: CatalogService
  ) {
  }

  entity: BehaviorSubject<EntityModel> = new BehaviorSubject<EntityModel>(null);
  namespace: BehaviorSubject<NamespaceModel> = new BehaviorSubject<NamespaceModel>(null);
  columns: BehaviorSubject<UiColumnDefinition[]> = new BehaviorSubject<UiColumnDefinition[]>([]);
  errorMsg: string;
  editingCol: string;
  placements: BehaviorSubject<AllocationPlacementModel[]> = new BehaviorSubject<AllocationPlacementModel[]>([]);
  subscriptions = new Subscription();
  foreignKeys: WritableSignal<ForeignKey[]> = signal([]);
  underlyingTables: WritableSignal<{}> = signal(null);

  public readonly EntityType = EntityType;

  ngOnInit(): void {
    //this.tableId = this._route.snapshot.paramMap.get('id');
    const sub = this._route.params.subscribe((params) => {
      const splits = params['id'].split('.');
      this._catalog.getEntityFromName(splits[0], splits[1]).subscribe(entity => {
        this.entity.next(<TableModel>entity);
      });
      this.subscribeColumns();
      this.subscribeUml();
      this.subscribePlacements();
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
    this._catalog.listener
    .pipe(mergeMap(() => this.entity), filter(e => !!e))
    .pipe(
        mergeMap(entity => this._catalog.getColumns(entity.id))).subscribe(columns => {
      this.columns.next(columns.map(c => {
        const primaries: number[] = this._catalog.getPrimaryKey(c.entityId)?.value?.columnIds || [];
        return UiColumnDefinition.fromModel(c, primaries);
      }));
    });
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
    this._crud.dropColumn(new ColumnRequest(this.entity.value.id, col)).subscribe({
      next: (res: RelationalResult) => {
        if (res.error) {
          this._toast.exception(res);
        } else {
          this._toast.success('The source column was dropped');
        }
        this._catalog.updateIfNecessary();
      }, error: err => {
        console.log(err);
      }
    });
  }

  renameColumn(input: HTMLInputElement, oldCol: UiColumnDefinition, newName: string, tableType: string) {
    if (newName.trim() === '') {
      this._toast.error('Name can not be empty.');
      return;
    }
    const newCol = Object.assign({}, oldCol);
    newCol.name = newName;
    const request = new ColumnRequest(this.entity.value.id, oldCol, newCol, true, tableType);
    this._crud.updateColumn(request).subscribe({
      next: (res: RelationalResult) => {
        if (res.error) {
          this._toast.exception(res);
        } else {
          this._toast.success('Renamed column "' + oldCol.name + '" to "' + newName + '"');
        }
        this.editingCol = undefined;
        input.value = '';
        this._catalog.updateIfNecessary();
      }, error: err => {
        this._toast.error('Could not rename the column "' + oldCol.name + '" to "' + newName + '"');
        console.log(err);
      }
    });
  }

  addColumn(col: UiColumnDefinition, newName: string, newDefault: string) {
    const request = new ColumnRequest(this.entity.value.id, null, new UiColumnDefinition(col.physicalName, null, null, col.dataType, '', null, null, newDefault, -1, -1, newName));
    this._crud.addColumn(request).subscribe({
      next: res => {
        const result = <RelationalResult>res;
        if (result.error) {
          this._toast.exception(result);
        } else {
          this._toast.success('Added column "' + newName + '"');
        }
        this._catalog.updateIfNecessary();
        this.editingCol = undefined;
      }, error: err => {
        this._toast.error('Could not add the column "' + newName + '"');
        console.log(err);
      }
    });
  }


  subscribePlacements() {
    this.entity.pipe(filter(e => !!e), mergeMap(e => this._catalog.getPlacements(e.id))).subscribe(
        placement => {
          this.placements.next(placement);
        });
  }

  subscribeUml() {
    this.foreignKeys.set([]);
    /*const t = this.tableId.split('\.');
    this.schema = t[0];
    if (!this.schema) {
        this.foreignKeys = null;
        return;
    }*/
    this.namespace.pipe(filter(n => !!n), mergeMap(n => this._crud.getUml(new EditTableRequest(n.id)))).subscribe({
          next:
              (uml: Uml) => {
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
                    this.foreignKeys.set([...fks.values()]);
                  }
                });
              },
          error:
              err => {
                console.log(err);
              }
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

  getAdapters(): Observable<AdapterModel[]> {
    return this.placements.pipe(filter(n => !!n), map(p => p.map(a => this._catalog.getAdapter(a.adapterId).value)));
  }
}
