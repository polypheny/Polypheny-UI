import {Component, HostListener, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../../services/crud.service';
import {PolyType, RelationalResult, UiColumnDefinition} from '../../../components/data-view/models/result-set.model';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {UntypedFormControl, UntypedFormGroup} from '@angular/forms';
import {Method} from '../../../models/ui-request.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {AdapterModel} from '../../adapters/adapter.model';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {BehaviorSubject, combineLatest, Subscription} from 'rxjs';
import {CatalogService} from '../../../services/catalog.service';
import {AllocationPlacementModel, CollectionModel, NamespaceModel, TableModel} from '../../../models/catalog.model';
import {filter, mergeMap} from 'rxjs/operators';

@Component({
  selector: 'app-document-edit-collection',
  templateUrl: './document-edit-collection.component.html',
  styleUrls: ['./document-edit-collection.component.scss']
})

export class DocumentEditCollectionComponent implements OnInit, OnDestroy {

  constructor(
      private _route: ActivatedRoute,
      private _leftSidebar: LeftSidebarService,
      public _crud: CrudService,
      private _toast: ToasterService,
      public _types: DbmsTypesService,
      public _catalog: CatalogService
  ) {

  }

  readonly entity: BehaviorSubject<CollectionModel> = new BehaviorSubject<CollectionModel>(null);
  readonly namespace: BehaviorSubject<NamespaceModel> = new BehaviorSubject<NamespaceModel>(null);
  readonly currentRoute: BehaviorSubject<string> = new BehaviorSubject<string>(this._route.snapshot.paramMap.get('id'));
  readonly placements: BehaviorSubject<AllocationPlacementModel[]> = new BehaviorSubject<AllocationPlacementModel[]>([]);


  types: PolyType[] = [];
  editColumn = -1;
  createColumn = new UiColumnDefinition('', false, true, 'text', '', null, null, null);
  confirm = -1;
  updateColumn = new UntypedFormGroup({name: new UntypedFormControl('')});


  //data placement handling
  stores: BehaviorSubject<AdapterModel[]> = new BehaviorSubject([]);
  addableStores: BehaviorSubject<AdapterModel[]> = new BehaviorSubject([]);
  selectedStore: AdapterModel;
  placementMethod: Method;
  isAddingPlacement = false;

  subscriptions = new Subscription();

  @ViewChild('placementModal', {static: false}) public placementModal: ModalDirective;
  @ViewChild('partitioningModal', {static: false}) public partitioningModal: ModalDirective;
  @ViewChild('partitionFunctionModal', {static: false}) public partitionFunctionModal: ModalDirective;

  protected readonly Method = Method;

  ngOnInit() {
    this._route.params.subscribe(route => {
      this.currentRoute.next(route['id']);
    });

    const sub = this.currentRoute.subscribe(route => {
      const splits = route.split('\.');

      this._catalog.getNamespaceFromName(splits[0]).subscribe(n => {
        this.namespace.next(n);
      });
      this._catalog.getEntityFromName(splits[0], splits[1]).subscribe(entity => {
        this.entity.next(<TableModel>entity);
      });
    });
    this.subscriptions.add(sub);

    this.getFixedFields();
    this.subscribeStores();
    this.subscribeAddableStores();
    this.subscribePlacements();
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


  getFixedFields() {
    return [];
  }


  subscribeStores() {
    const sub = this._catalog.getStores().subscribe(stores => {
      this.stores.next(stores);
    });
    this.subscriptions.add(sub);
  }

  subscribeAddableStores() {
    const sub = combineLatest([this.stores, this.placements])
    .pipe(filter((s, p) => !!s || !!p)).subscribe(p => {
      const adapterIds = p[1].map(e => e.adapterId);

      this.addableStores.next(p[0].filter(s => !adapterIds.includes(s.id)));
    });
    this.subscriptions.add(sub);
  }

  subscribePlacements() {
    const sub = this.entity
    .pipe(
        filter(e => !!e),
        mergeMap(e => this._catalog.getPlacements(e.id))).subscribe(placements => {
          console.log(placements);
      this.placements.next(placements);
    });

    this.subscriptions.add(sub);
  }

  modifyPlacement(method: Method, storeId: number = null) {
    this.placementMethod = method;
    if (storeId != null) {
      this.selectedStore = this._catalog.getAdapter(storeId).value;
    }
    if (!this.stores) {
      return;
    }
    this.isAddingPlacement = true;
    this._crud.addDropCollectionPlacement(this.namespace.value.id, this.entity.value.name, this.selectedStore.name, this.placementMethod).subscribe({
          next: (result: RelationalResult) => {
            if (result.error) {
              this._toast.exception(result);
            } else {
              if (this.placementMethod === Method.ADD) {
                this._toast.success('Added placement on store ' + this.selectedStore.name, result.query, 'Added placement');
              } else if (this.placementMethod === Method.MODIFY) {
                this._toast.success('Modified placement on store ' + this.selectedStore.name, result.query, 'Modified placement');
              }
              this._catalog.updateIfNecessary();
            }
            this.selectedStore = null;
          }, error: err => {
            this._toast.error('Could not ' + this.placementMethod.toLowerCase() + ' placement on store ' + this.selectedStore.name);
          }
        }
    ).add(() => {
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
}
