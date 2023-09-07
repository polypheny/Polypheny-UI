import {Component, ElementRef, OnDestroy, OnInit, QueryList, Renderer2, ViewChildren} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {EditTableRequest} from '../../../models/ui-request.model';
import {ActivatedRoute, Router} from '@angular/router';
import {
  EntityMeta,
  PolyType,
  RelationalResult,
  Status,
  UiColumnDefinition
} from '../../../components/data-view/models/result-set.model';
import {ToastDuration, ToasterService} from '../../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {BehaviorSubject, Subscription} from 'rxjs';
import {DbTable} from '../../uml/uml.model';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {CatalogService} from '../../../services/catalog.service';
import {EntityType, NamespaceModel, TableModel} from '../../../models/catalog.model';
import {filter, mergeMap} from 'rxjs/operators';
import {AdapterModel} from '../../adapters/adapter.model';

const INITIAL_TYPE = 'BIGINT';

@Component({
  selector: 'app-edit-tables',
  templateUrl: './edit-tables.component.html',
  styleUrls: ['./edit-tables.component.scss']
})
export class EditTablesComponent implements OnInit, OnDestroy {

  @ViewChildren('editing', { read: ElementRef }) inputGroup: QueryList<ElementRef>;
  types: PolyType[] = [];
  namespace: BehaviorSubject<NamespaceModel>;

  tables: BehaviorSubject<Table[]> = new BehaviorSubject([]);

  counter = 0;
  newColumns = new Map<number, UiColumnDefinition>();
  newTableName = '';
  stores: AdapterModel[];
  selectedStore;
  creatingTable = false;

  editOpen = false;

  //export table
  exportProgress = 0.0;
  private subscriptions = new Subscription();

  constructor(
      public _crud: CrudService,
      private _route: ActivatedRoute,
      private _toast: ToasterService,
      private _router: Router,
      private _leftSidebar: LeftSidebarService,
      public _types: DbmsTypesService,
      private _settings: WebuiSettingsService,
      private _catalog: CatalogService,
      public _breadcrumb: BreadcrumbService,
      private _render: Renderer2
  ) {
    this._render.listen('document', 'click', (e:Event) => {
      if (this.inputGroup.length === 0) {
        return;
      }
      if (this.editOpen && !this.inputGroup.get(0).nativeElement.contains(e.target)) {
        this.tables.next(this.tables.value.map(t => {
          t.editing = false;
          return t;
        }));
        this.editOpen = false;
      }else {
        this.editOpen = true;
      }
    });
  }

  ngOnInit() {
    this.newColumns.set(this.counter++, new UiColumnDefinition('', true, false, INITIAL_TYPE, '', null, null));


    const sub1 = this._route.params.subscribe((params) => {
      this.namespace = this._catalog.getNamespaceFromName(params['id']);
      this.subscribeTables();
    });
    this.subscriptions.add(sub1);

    this.getTypeInfo();
    this.getStores();

    this.initSocket();
    const sub2 = this._crud.onReconnection().subscribe((b) => {
      if (b) {
        this.onReconnect();
      }
    });
    this.subscriptions.add(sub2);
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
  }

  onReconnect() {
    this._catalog.updateIfNecessary();
    this.getTypeInfo();
    this.getStores();
    this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false);
  }

  subscribeTables() {
    this.namespace.pipe(
        filter(namespace => !!namespace),
        mergeMap(namespace => this._catalog.getEntities(namespace.id))).subscribe(entities => {
      this.tables.next(entities.map(e => Table.fromModel(<TableModel>e)).sort((a, b) => a.name.localeCompare(b.name)));
    });
  }

  getStores() {
    this._crud.getStores().subscribe({
      next: res => {
        this.stores = <AdapterModel[]>res;
      }, error: err => {
        console.log(err);
      }
    });
  }


  /**
   * get the right class for the 'drop' and 'truncate' buttons
   * enable the button if the confirm-text is equal to the table-name or to 'drop table-name' respectively 'truncate table-name'
   */
  dropTruncateClass(action: string, table: Table) {
    if (action === 'drop' && (table.drop === table.name || table.drop === 'drop ' + table.name)) {
      return 'btn-danger';
    } else if (action === 'truncate' && (table.truncate === table.name || table.truncate === 'truncate ' + table.name)) {
      return 'btn-danger';
    }
    return 'btn-light disabled';
  }

  /**
   * send a request to either drop or truncate a table
   */
  sendDropTruncateRequest(action, table: Table) {
    let request;
    let type: string;
    if (this.dropTruncateClass(action, table) === 'btn-danger') {
      if (table.tableType !== EntityType.VIEW) {
        request = new EditTableRequest(this.namespace.value.id, table.id, null, action);
        console.log(request);
        type = ' the Table ';
      } else {
        request = new EditTableRequest(this.namespace.value.id, table.id, null, action, null, null, EntityType.VIEW);
        type = ' the View ';
      }

    } else {
      return;
    }
    this._crud.dropTruncateTable(request).subscribe({
      next: (result: RelationalResult) => {

        if (result.error) {
          this._toast.exception(result, 'Could not ' + action + type + table + ':');
        } else {
          let toastAction = 'Truncated';
          if (request.getAction() === 'drop') {
            toastAction = 'Dropped';
            this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false);
          }
          this._toast.success(toastAction + type + request.table);
          this._catalog.updateIfNecessary();
        }
      }, error: err => {
        this._toast.error('Could not ' + action + type + table + ' due to an unknown error');
        console.log(err);
      }
    });
  }

  createTable() {
    if (this.newTableName === '') {
      this._toast.warn('Please provide a name for the new table. The new table was not created.', 'missing table name', ToastDuration.INFINITE);
      return;
    }
    if (!this._crud.nameIsValid(this.newTableName)) {
      this._toast.warn('Please provide a valid name for the new table. The new table was not created.', 'invalid table name', ToastDuration.INFINITE);
      return;
    }
    if (this.tables.value.filter((t) => {
      return this.namespace.value.caseSensitive ? t.name === this.newTableName : t.name.toLowerCase() === this.newTableName.toLowerCase();
    }).length > 0) {
      this._toast.warn('A table with this name already exists. Please choose another name.', 'invalid table name', ToastDuration.INFINITE);
      return;
    }
    let valid = true;
    //clear precision/scale for types where it is not applicable
    //delete columns with no column name
    let hasPk = false;
    this.newColumns.forEach((v, k) => {
      if (!this._types.supportsPrecision(v.dataType) && v.precision !== null) {
        v.precision = null;
      }
      if (!this._types.supportsScale(v.dataType) && v.scale !== null) {
        v.scale = null;
      }
      //clear cardinality and dimension if it is not an array
      if (v.collectionsType !== 'ARRAY') {
        v.cardinality = null;
        v.dimension = null;
      }
      if (v.name === '') {
        this.newColumns.delete(k);
      }
      if (!this._crud.nameIsValid(v.name)) {
        valid = false;
        return;
      }

      if (v.primary) {
        hasPk = true;
      }
    });
    if (!hasPk) {
      this._toast.warn('Please specify a primary key. The new table was not created.', 'missing primary key', ToastDuration.INFINITE);
      return;
    }
    if (!valid) {
      this._toast.warn('Please make sure all column names are valid. The new table was not created.', 'invalid column name', ToastDuration.INFINITE);
      return;
    }
    const request = new EditTableRequest(this.namespace.value.id, null, this.newTableName, 'create', Array.from(this.newColumns.values()), this.selectedStore);
    this.creatingTable = true;
    console.log(request);
    this._crud.createTable(request).subscribe({
      next: (result: RelationalResult) => {
        if (result.error) {
          this._toast.exception(result, 'Could not generate table:');
        } else {
          this._toast.success('Generated table ' + request.entityName, result.query);
          this.newColumns.clear();
          this.counter = 0;
          this.newColumns.set(this.counter++, new UiColumnDefinition('', true, false, INITIAL_TYPE, '', null, null));
          this.newTableName = '';
          this.selectedStore = null;
          this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false);
        }
        this._catalog.updateIfNecessary();
      }, error: err => {
        this._toast.error('Could not generate table');
        console.log(err);
      }
    }).add(() => this.creatingTable = false);
  }

  rename(table: Table) {
    const meta = new EntityMeta(this.namespace.value.id, table.id, table.newName, []);
    const type = table.tableType === EntityType.VIEW ? ' View ' : ' Table ';
    this._crud.renameTable(meta).subscribe({
      next: (r: RelationalResult) => {
        if (r.exception) {
          this._toast.exception(r);
        } else {
          this._toast.success('Renamed' + type + table.name + ' to ' + table.newName);
          this._catalog.updateIfNecessary();
          this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false);
        }
      }, error: err => {
        this._toast.error('Could not rename the' + type + table.name);
        console.log(err);
      }
    });
  }

  /**
   * Check if the new table name is valid
   */
  canRename(table: Table) {
    //table.name !== table.newName  not necessary, since the filter will catch it as well
    return this.tables.value.filter((t) => t.name === table.newName).length === 0 &&
        this._crud.nameIsValid(table.newName);
  }

  initSocket() {
    const sub = this._crud.onSocketEvent().subscribe(
        (msg: Status) => {
          if (msg.context === 'tableExport') {
            this.exportProgress = msg.status;
          }
        }, err => {
          setTimeout(() => {
            this.initSocket();
          }, +this._settings.getSetting('reconnection.timeout'));
        });
    this.subscriptions.add(sub);
  }

  createTableValidation(name: string) {
    const regex = this._crud.getValidationRegex();
    if (name === '') {
      return '';
    } else if (regex.test(name) && name.length <= 100 && this.tables.value.filter((t) => {
      return this.namespace.value.caseSensitive ? t.name === name : t.name.toLowerCase() === name.toLowerCase();
    }).length === 0) {
      return 'is-valid';
    } else {
      return 'is-invalid';
    }
  }

  addNewColumn() {
    this.newColumns.set(this.counter++, new UiColumnDefinition('', false, true, INITIAL_TYPE, '', null, null));
  }

  removeNewColumn(i: number) {
    if (this.newColumns.size === 1) {
      this.counter = 0;
      this.newColumns.clear();
      this.newColumns.set(this.counter++, new UiColumnDefinition('', true, false, INITIAL_TYPE, '', null, null));
    } else {
      //don't change the counter here!
      this.newColumns.delete(i);
    }
  }

  triggerDefaultNull(col: UiColumnDefinition) {
    if (col.defaultValue === null) {
      if (this._types.isNumeric(col.dataType)) {
        col.defaultValue = 0;
      } else if (this._types.isBoolean(col.dataType)) {
        col.defaultValue = false;
      } else {
        col.defaultValue = '';
      }
    } else {
      col.defaultValue = null;
    }
  }

  getTypeInfo() {
    this._types.getTypes().subscribe(
        t => {
          this.types = t;
          this.newColumns.get(0).dataType = INITIAL_TYPE;
        }
    );
  }

}

export class Table {
  id: number;
  name: string;
  truncate = '';
  drop = '';
  export = false;
  editing = false;
  newName: string;
  modifiable: boolean;
  tableType: EntityType;

  constructor(id: number, name: string, newName: string, modifiable: boolean, entityType: EntityType) {
    this.id = id;
    this.name = name;
    this.newName = newName;
    this.modifiable = modifiable;
    this.tableType = entityType;
  }

  static fromDb(table: DbTable) {
    return new Table(null, table.tableName, table.tableName, table.modifiable, table.tableType);
  }

  static fromModel(table: TableModel) {
    return new Table(table.id, table.name, table.name, table.modifiable, table.entityType);
  }

}

