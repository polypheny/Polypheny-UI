import {Component, OnDestroy, OnInit} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {EditCollectionRequest, EditTableRequest, SchemaRequest} from '../../../models/ui-request.model';
import {ActivatedRoute, Router} from '@angular/router';
import {DbColumn, EntityMeta, Index, PolyType, ResultSet, Status} from '../../../components/data-view/models/result-set.model';
import {ToastDuration, ToastService} from '../../../components/toast/toast.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {Store} from '../../adapters/adapter.model';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {BehaviorSubject, Observable, Subscriber, Subscription} from 'rxjs';
import {UtilService} from '../../../services/util.service';
import * as $ from 'jquery';
import {DbTable} from '../../uml/uml.model';
import {CollectionModel, EntityType, NamespaceModel} from '../../../models/catalog.model';
import {CatalogService} from '../../../services/catalog.service';
import {map, switchMap} from 'rxjs/operators';

@Component({
  selector: 'app-document-edit-collections',
  templateUrl: './document-edit-collections.component.html',
  styleUrls: ['./document-edit-collections.component.scss']
})
export class DocumentEditCollectionsComponent implements OnInit, OnDestroy {

  types: PolyType[] = [];
  namespace: BehaviorSubject<NamespaceModel>;
  collections: BehaviorSubject<Collection[]>;

  counter = 0;
  newColumns = new Map<number, DbColumn>();
  newTableName = '';
  stores: Store[];
  selectedStore;
  creatingTable = false;

  //export table
  showExportButton = false;
  exportProgress = 0.0;
  uploading = false;
  private subscriptions = new Subscription();
  exportForm = new FormGroup({
    name: new FormControl('', Validators.required),
    description: new FormControl(''),
    pub: new FormControl(0, Validators.required),
    createPrimaryKeys: new FormControl(true, Validators.required),
    addDefaultValue: new FormControl(true, Validators.required)
  });

  constructor(
      public _crud: CrudService,
      private _route: ActivatedRoute,
      private _toast: ToastService,
      private _router: Router,
      private _leftSidebar: LeftSidebarService,
      public _types: DbmsTypesService,
      private _settings: WebuiSettingsService,
      public _catalog: CatalogService,
      public _util: UtilService
  ) {
  }

  ngOnInit() {
    this.newColumns.set(this.counter++, new DbColumn('', true, false, '', '', null, null));
    //this.database = this._route.snapshot.paramMap.get('id');
    const sub1 = this._route.params.subscribe((params) => {
      this._catalog.updateIfNecessary().subscribe(() => {
        this.namespace = this._catalog.getNamespaceFromName(params['id']);

        this.subscribeCollection();

      });
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
    this.documentListener();
  }

  ngOnDestroy() {
    this.subscriptions.unsubscribe();
    $(document).off('click');
  }

  onReconnect() {
    this._catalog.updateIfNecessary();
    this.getTypeInfo();
    this.getStores();
    this._leftSidebar.setSchema( this._router,'/views/schema-editing/', false, 2, true );
  }

  documentListener() {
    const self = this;
    $(document).on('click', function (e) {
      if ($(e.target).hasClass('edit-table-name')) {
        return;
      }
      if ($(e.target).parents('.editing').length === 0) {
        //self.tables.forEach((t) => t.editing = false);
      }
    });
  }

  subscribeCollection() {
    this.collections = new BehaviorSubject<Collection[]>([]);

    this.namespace.pipe(
        map(namespace => this._catalog.getEntities( namespace.id ).pipe(
            map(e => e.map(col => Collection.fromModel(<CollectionModel>col)).sort((a, b) => a.name.localeCompare(b.name)))
        ))).subscribe(collections => {
          collections.subscribe( cols => {
            this.collections.next(cols);
          });
    });

    
    /*this._crud.getTables(new EditTableRequest(this.namespaceId)).subscribe(
        res => {
          const result = <DbTable[]>res;
          this.tables = [];
          for (const t of result) {
            this.tables.push(new Collection(t));
          }
          this.tables = this.tables.sort((a, b) => a.name.localeCompare(b.name));
        }, err => {
          this._toast.error('could not retrieve list of tables');
          console.log(err);
        }
    );*/
  }

  getStores() {
    this._crud.getStores().subscribe(
        res => {
          this.stores = <Store[]>res;
        }, err => {
          console.log(err);
        });
  }

  getSchemaType() {
    /*this._crud.getTypeSchemas().subscribe(
        res => {
          this.n = res[this.database];
        }, error => {
          console.log(error);
        }
    );*/
  }

  /**
   * get the right class for the 'drop' and 'truncate' buttons
   * enable the button if the confirm-text is equal to the table-name or to 'drop table-name' respectively 'truncate table-name'
   */
  dropTruncateClass(action: string, table: Collection) {
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
  sendRequest(action, collection: Collection) {
    if (this.dropTruncateClass(action, collection) !== 'btn-danger') {
      return;
    }
    
    const request = new EditTableRequest(this.namespace.value.id, collection.id, action);
    
    this._crud.dropTruncateTable(request).subscribe(
        res => {
          const result = <ResultSet>res;
          if (result.error) {
            this._toast.exception(result, 'Could not ' + action + ' the table ' + collection + ':');
          } else {
            let toastAction = 'Truncated';
            if (request.getAction() === 'drop') {
              toastAction = 'Dropped';
              this._leftSidebar.setSchema( this._router, '/views/schema-editing/', false, 2, true );
            }
            this._toast.success(toastAction + ' table ' + collection.name);
            this._catalog.updateSnapshot();
          }
        }, err => {
          this._toast.error('Could not ' + action + ' the table ' + collection + ' due to an unknown error');
          console.log(err);
        }
    );
  }

  createCollection() {
    if (this.newTableName === '') {
      this._toast.warn('Please provide a name for the new collection. The new collection was not created.', 'missing table name', ToastDuration.INFINITE);
      return;
    }
    if (!this._crud.nameIsValid(this.newTableName)) {
      this._toast.warn('Please provide a valid name for the new collection. The new collection was not created.', 'invalid table name', ToastDuration.INFINITE);
      return;
    }
    if (this.collections.value.filter((t) => t.name === this.newTableName).length > 0) {
      //if (this.tables.indexOf(this.newTableName) !== -1) {
      this._toast.warn('A collection with this name already exists. Please choose another name.', 'invalid collection name', ToastDuration.INFINITE);
      return;
    }
    const request = new EditCollectionRequest(this.namespace.value.id, this.newTableName, null, 'create', this.selectedStore);
    this.creatingTable = true;
    this._crud.createCollection(request).subscribe(
        res => {
          const result = <ResultSet>res;
          if (result.error) {
            this._toast.exception(result, 'Could not generate collection:');
          } else {
            this._toast.success('Generated collection ' + request.entityName, result.generatedQuery);
            this.newColumns.clear();
            this.counter = 0;
            this.newColumns.set(this.counter++, new DbColumn('', true, false, this.types[0].name, '', null, null));
            this.newTableName = '';
            this.selectedStore = null;
            this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false );
          }
          this._catalog.updateIfNecessary();
        }, err => {
          this._toast.error('Could not generate collection');
          console.log(err);
        }
    ).add(() => this.creatingTable = false);
  }

  renameTable(table: Collection) {
    const t = new EntityMeta(this.namespace.value.id, table.id, table.newName, []);
    this._crud.renameTable(t).subscribe(
        res => {
          const r = <ResultSet>res;
          if (r.exception) {
            this._toast.exception(r);
          } else {
            this._toast.success('Renamed table ' + table.name + ' to ' + table.newName);
            this._catalog.updateIfNecessary();
            this._leftSidebar.setSchema(this._router, '/views/schema-editing/', false, 2, true);
          }
        }, err => {
          this._toast.error('Could not rename the collection ' + table.name);
          console.log(err);
        }
    );
  }

  /**
   * Check if the new table name is valid
   */
  canRename(table: Collection) {
    //table.name !== table.newName  not necessary, since the filter will catch it as well
    return this.collections.value.filter((t) => t.name === table.newName).length === 0 &&
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
      //} else if (regex.test(name) && name.length <= 100 && this.tables.indexOf(name) === -1) {
    } else if (regex.test(name) && name.length <= 100 && this.collections.value.filter((t) => t.name === name).length === 0) {
      return 'is-valid';
    } else {
      return 'is-invalid';
    }
  }


  getTypeInfo() {
    this._types.getTypes().subscribe(
        t => {
          this.types = t;
          this.newColumns.get(0).dataType = t[0].name;
        }
    );
  }

}

class Collection {
  id: number;
  name: string;
  truncate = '';
  drop = '';
  export = false;
  editing = false;
  newName: string;
  modifiable: boolean;
  tableType: EntityType;

  constructor(name:string, newName:string, modifiable:boolean, entityType: EntityType) {
    this.name = name;
    this.newName = newName;
    this.modifiable = modifiable;
    this.tableType = entityType;
  }
  
  static fromDB(collection: DbTable) {
    return new Collection(collection.tableName, collection.tableName, collection.modifiable, collection.tableType);
  }
  
  static fromModel( collection: CollectionModel){
    return new Collection(collection.name, collection.name, collection.modifiable, collection.entityType);
  }
}
