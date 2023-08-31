import {Component, ElementRef, OnDestroy, OnInit, QueryList, Renderer2, ViewChildren} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {Method, QueryRequest} from '../../../models/ui-request.model';
import {ActivatedRoute, Router} from '@angular/router';
import {EntityMeta, RelationalResult, Result} from '../../../components/data-view/models/result-set.model';
import {ToastDuration, ToasterService} from '../../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {StoreModel} from '../../adapters/adapter.model';
import {BehaviorSubject, Subscription} from 'rxjs';
import {DbTable} from '../../uml/uml.model';
import {CollectionModel, EntityType, NamespaceModel} from '../../../models/catalog.model';
import {CatalogService} from '../../../services/catalog.service';
import {filter, map, mergeMap} from 'rxjs/operators';

@Component({
  selector: 'app-document-edit-collections',
  templateUrl: './document-edit-collections.component.html',
  styleUrls: ['./document-edit-collections.component.scss']
})
export class DocumentEditCollectionsComponent implements OnInit, OnDestroy {

  constructor(
      public _crud: CrudService,
      private _route: ActivatedRoute,
      private _toast: ToasterService,
      private _router: Router,
      private _leftSidebar: LeftSidebarService,
      public _types: DbmsTypesService,
      public _catalog: CatalogService,
      private _render: Renderer2
  ) {
    this._render.listen('document', 'click', (e: Event) => {
      if (this.inputGroup.length === 0) {
        return;
      }
      if (this.editOpen && !this.inputGroup.get(0).nativeElement.contains(e.target)) {
        this.collections.next(this.collections.value.map(t => {
          t.editing = false;
          return t;
        }));
        this.editOpen = false;
      } else {
        this.editOpen = true;
      }
    });
  }

  @ViewChildren('editing', {read: ElementRef}) inputGroup: QueryList<ElementRef>;

  readonly namespace: BehaviorSubject<NamespaceModel> = new BehaviorSubject(null);
  readonly collections: BehaviorSubject<Collection[]> = new BehaviorSubject<Collection[]>([]);
  readonly currentRoute: BehaviorSubject<string> = new BehaviorSubject<string>(this._route.snapshot.paramMap.get('id'));

  readonly stores: BehaviorSubject<StoreModel[]> = new BehaviorSubject<StoreModel[]>([]);
  newCollectionName: string;
  selectedStore;
  creatingCollection = false;

  private subscriptions = new Subscription();

  private editOpen = false;

  protected readonly Method = Method;

  ngOnInit() {
    this._route.params.subscribe(route => {
      this.currentRoute.next(route['id']);
    });


    const sub1 = this.currentRoute.subscribe(route => {
      this._catalog.getNamespaceFromName(route).subscribe(n => {
        this.namespace.next(n);
      });
    });
    this.subscriptions.add(sub1);

    this.subscribeCollection();

    const subStore = this._catalog.getStores().subscribe(stores => {
      this.stores.next(stores);
    });
    this.subscriptions.add(subStore);

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
    this._leftSidebar.setSchema(this._router, '/views/schema-editing/', false, 2, true);
  }

  subscribeCollection() {
    const sub = this.namespace.pipe(
        filter(namespace => !!namespace),
        mergeMap(namespace => this._catalog.getEntities(namespace.id)),
        map(cols => cols.map(c => Collection.fromModel(<CollectionModel>c)).sort((a, b) => a.name.localeCompare(b.name)))).subscribe(cols => {
      this.collections.next(cols);
    });
    this.subscriptions.add(sub);

  }

  /**
   * get the right class for the 'drop' and 'truncate' buttons
   * enable the button if the confirm-text is equal to the table-name or to 'drop table-name' respectively 'truncate table-name'
   */
  dropTruncateClass(action: Method, table: Collection) {
    if (action === Method.DROP && (table.drop === table.name || table.drop === 'drop ' + table.name)) {
      return 'btn-danger';
    } else if (action === Method.TRUNCATE && (table.truncate === table.name || table.truncate === 'truncate ' + table.name)) {
      return 'btn-danger';
    }
    return 'btn-light disabled';
  }

  /**
   * send a request to either drop or truncate a table
   */
  sendRequest(action: Method, collection: Collection) {
    console.log('trunc');
    if (this.dropTruncateClass(action, collection) !== 'btn-danger') {
      return;
    }

    let query;
    switch (action) {
      case Method.DROP:
        query = `db.${collection.name}.drop()`;
        break;
      case Method.TRUNCATE:
        query = `db.${collection.name}.remove({})`;
        break;
      default:
        return;
    }

    const request = new QueryRequest(query, false, true,'mql', this.namespace.value.id);

    this._crud.anyQueryBlocking(request).subscribe({
      next: (result: Result<any, any>) => {
        if (result.error) {
          this._toast.exception(result, 'Could not ' + action + ' the table ' + collection + ':');
        } else {
          this._catalog.updateIfNecessary();
          let toastAction = 'Truncated';
          if (action === Method.DROP) {
            toastAction = 'Dropped';
            this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false);
          }
          this._toast.success(toastAction + ' collection ' + collection.name);
        }

      }, error: err => {
        this._toast.error('Could not ' + action + ' the table ' + collection + ' due to an unknown error');
        console.log(err);
      }
    });
  }

  createCollection() {
    if (this.newCollectionName === '') {
      this._toast.warn('Please provide a name for the new collection. The new collection was not created.', 'missing table name', ToastDuration.INFINITE);
      return;
    }
    if (!this._crud.nameIsValid(this.newCollectionName)) {
      this._toast.warn('Please provide a valid name for the new collection. The new collection was not created.', 'invalid table name', ToastDuration.INFINITE);
      return;
    }
    if (this.collections.value.filter((t) => t.name === this.newCollectionName).length > 0) {
      //if (this.tables.indexOf(this.newTableName) !== -1) {
      this._toast.warn('A collection with this name already exists. Please choose another name.', 'invalid collection name', ToastDuration.INFINITE);
      return;
    }
    const query = 'db.createCollection(' + this.newCollectionName + ')';
    const entityName = this.newCollectionName;
    //const request = new EditCollectionRequest(this.namespace.value.id, this.newCollectionName, null, 'create', this.selectedStore);
    this.creatingCollection = true;
    this._crud.anyQueryBlocking(new QueryRequest(query, false, true, 'mql', this.namespace.value.id)).subscribe({
      next: (result: Result<any, any>) => {
        if (result.error) {
          this._toast.exception(result, 'Could not generate collection:');
        } else {
          this._toast.success('Generated collection ' + entityName, result.query);
          this.newCollectionName = '';
          this.selectedStore = null;
          this._leftSidebar.setSchema(this._router, '/views/schema-editing/', true, 2, false);
        }
        this._catalog.updateIfNecessary();
      }, error: err => {
        this._toast.error('Could not generate collection');
        console.log(err);
      }
    }).add(() => this.creatingCollection = false);
  }

  rename(table: Collection) {
    const t = new EntityMeta(this.namespace.value.id, table.id, table.newName, []);
    this._crud.renameTable(t).subscribe({
      next: res => {
        const r = <RelationalResult>res;
        if (r.exception) {
          this._toast.exception(r);
        } else {
          this._toast.success('Renamed table ' + table.name + ' to ' + table.newName);
          this._catalog.updateIfNecessary();
          this._leftSidebar.setSchema(this._router, '/views/schema-editing/', false, 2, true);
        }
      }, error: err => {
        this._toast.error('Could not rename the collection ' + table.name);
        console.log(err);
      }

    });
  }

  /**
   * Check if the new table name is valid
   */
  canRename(table: Collection) {
    //table.name !== table.newName  not necessary, since the filter will catch it as well
    return this.collections.value.filter((t) => t.name === table.newName).length === 0 &&
        this._crud.nameIsValid(table.newName);
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

  constructor(name: string, newName: string, modifiable: boolean, entityType: EntityType) {
    this.name = name;
    this.newName = newName;
    this.modifiable = modifiable;
    this.tableType = entityType;
  }

  static fromDB(collection: DbTable) {
    return new Collection(collection.tableName, collection.tableName, collection.modifiable, collection.tableType);
  }

  static fromModel(collection: CollectionModel) {
    return new Collection(collection.name, collection.name, collection.modifiable, collection.entityType);
  }
}
