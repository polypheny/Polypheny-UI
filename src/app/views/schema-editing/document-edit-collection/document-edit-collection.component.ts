import {Component, HostListener, inject, Input, OnDestroy, OnInit, Signal, ViewChild} from '@angular/core';
import * as $ from 'jquery';
import {CrudService} from '../../../services/crud.service';
import {PolyType, RelationalResult, UiColumnDefinition} from '../../../components/data-view/models/result-set.model';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {UntypedFormControl, UntypedFormGroup} from '@angular/forms';
import {Method} from '../../../models/ui-request.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {AdapterModel} from '../../adapters/adapter.model';
import {ModalDirective} from 'ngx-bootstrap/modal';
import {Subscription} from 'rxjs';
import {CatalogService} from '../../../services/catalog.service';
import {
  AllocationEntityModel,
  AllocationPartitionModel,
  AllocationPlacementModel,
  NamespaceModel,
  TableModel
} from '../../../models/catalog.model';

@Component({
  selector: 'app-document-edit-collection',
  templateUrl: './document-edit-collection.component.html',
  styleUrls: ['./document-edit-collection.component.scss']
})

export class DocumentEditCollectionComponent implements OnInit, OnDestroy {

    public readonly _crud = inject(CrudService);
    public readonly _types = inject(DbmsTypesService);
    public readonly _catalog = inject(CatalogService);
    private readonly _toast = inject(ToasterService);

    constructor() {

  }

  @Input()
  readonly entity: Signal<TableModel>;
  @Input()
  readonly namespace: Signal<NamespaceModel>;
  @Input()
  readonly currentRoute: Signal<string>;

  @Input()
  readonly placements: Signal<AllocationPlacementModel[]>;
  @Input()
  readonly partitions: Signal<AllocationPartitionModel[]>;
  @Input()
  readonly allocations: Signal<AllocationEntityModel[]>;
  @Input()
  readonly stores: Signal<AdapterModel[]>;
  @Input()
  readonly addableStores: Signal<AdapterModel[]>;


  types: PolyType[] = [];
  editColumn = -1;
  createColumn = new UiColumnDefinition(-1, '', false, true, 'text', '', null, null, null);
  confirm = -1;
  updateColumn = new UntypedFormGroup({name: new UntypedFormControl('')});


  //data placement handling

  selectedStore: AdapterModel;
  placementMethod: Method;
  isAddingPlacement = false;

  subscriptions = new Subscription();

  @ViewChild('placementModal', {static: false}) public placementModal: ModalDirective;
  @ViewChild('partitioningModal', {static: false}) public partitioningModal: ModalDirective;
  @ViewChild('partitionFunctionModal', {static: false}) public partitionFunctionModal: ModalDirective;

  protected readonly Method = Method;

  ngOnInit() {

    this.getFixedFields();
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

  modifyPlacement(method: Method, storeId: number = null) {
    this.placementMethod = method;
    if (storeId != null) {
      this.selectedStore = this._catalog.getAdapter(storeId);
    }
    if (!this.stores) {
      return;
    }
    this.isAddingPlacement = true;
    this._crud.addDropCollectionPlacement(this.namespace().name, this.entity().name, this.selectedStore.name, this.placementMethod).subscribe({
          next: (result: RelationalResult) => {
            if (result.error) {
              this._toast.exception(result);
            } else {
              if (this.placementMethod === Method.ADD) {
                this._toast.success('Added placement on store ' + this.selectedStore.name, result.query, 'Added placement');
              } else if (this.placementMethod === Method.MODIFY) {
                this._toast.success('Modified placement on store ' + this.selectedStore.name, result.query, 'Modified placement');
              }
              //this._catalog.updateIfNecessary();
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
