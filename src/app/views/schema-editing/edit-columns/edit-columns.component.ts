import {
  Component,
  computed,
  effect,
  HostListener,
  Injector, Input,
  OnDestroy,
  OnInit,
  signal,
  Signal,
  WritableSignal
} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../../services/crud.service';
import {
  FieldType,
  IndexModel,
  ModifyPartitionRequest,
  PartitionFunctionModel,
  PartitioningRequest,
  PolyType,
  RelationalResult,
  TableConstraint,
  UiColumnDefinition
} from '../../../components/data-view/models/result-set.model';
import {ToastDuration, ToasterService} from '../../../components/toast-exposer/toaster.service';
import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {
  ColumnRequest,
  ConstraintRequest,
  EditTableRequest,
  MaterializedRequest,
  Method
} from '../../../models/ui-request.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {AdapterModel, PlacementType} from '../../adapters/adapter.model';
import {Subscription} from 'rxjs';
import {ForeignKey, Uml} from '../../../views/uml/uml.model';
import {CatalogService} from '../../../services/catalog.service';
import {
  AllocationEntityModel,
  AllocationPartitionModel,
  AllocationPlacementModel,
  ConstraintModel,
  EntityType,
  NamespaceModel,
  TableModel
} from '../../../models/catalog.model';
import {toSignal} from '@angular/core/rxjs-interop';

const INITIAL_TYPE = 'BIGINT';

@Component({
  selector: 'app-edit-columns',
  templateUrl: './edit-columns.component.html',
  styleUrls: ['./edit-columns.component.scss']
})

export class EditColumnsComponent implements OnInit, OnDestroy {

  constructor(
      private _route: ActivatedRoute,
      private _leftSidebar: LeftSidebarService,
      public _crud: CrudService,
      private _toast: ToasterService,
      public _types: DbmsTypesService,
      public _catalog: CatalogService,
      private injector: Injector
  ) {
    this.newIndexForm = new UntypedFormGroup({
      name: new UntypedFormControl('', this._crud.getNameValidator()),
      method: new UntypedFormControl('')
    });


    this.oldColumns = computed(() => {
      const catalog = this._catalog.listener();
      if (!this.entity) {
        return new Map();
      }

      const entity = this.entity();
      if (!entity) {
        return new Map();
      }
      const columns = this._catalog.getColumns(entity.id);
      if (!columns) {
        return new Map();
      }

      return new Map(columns.map(c => {
        const columnIds = this._catalog.getPrimaryKey(c.entityId)?.columnIds || [];
        return UiColumnDefinition.fromModel(c, columnIds);
      }).map(c => [c.name, c]));
    });

    effect(() => {
      const catalog = this._catalog.listener();
      const oldColumns = this.oldColumns();
      if (!oldColumns) {
        return;
      }

      if (!this.entity || !this.entity()) {
        return;
      }
      const entity = this.entity();
      const colValues = Array.from(oldColumns.values());

      this.newIndexCols = new Map(colValues.map(c => [c.name, false]));
      this.partitioningRequest.column = colValues.length > 0 ? colValues[0].name : '';
      this.newPrimaryKey = Array.from(oldColumns.values()).map(x => Object.assign({}, x));
    });

    this.constraints = computed(() => {
      const catalog = this._catalog.listener();

      if (!this.entity || !this.entity()) {
        return [];
      }


      return catalog.getConstraints(this.entity().id) || [];
    });

    this._types.getTypes().subscribe(
        (type: PolyType[]) => {
          this.types = type;
          this.createColumn.dataType = INITIAL_TYPE;
        }
    );

    this.availableStoresForIndexes = computed(() => {

      if (!this.stores || !this.stores()) {
        return [];
      }
      const stores = this.stores();
      const placements = this.placements()?.map(p => p.adapterId);
      if (!placements) {
        return [];
      }
      return Array.from(stores).filter(store => placements.includes(store.id));

    });

    effect(() => {
      if (!this.currentRoute || !this.currentRoute()) {
        return;
      }
      this.getAvailableStoresForIndexes();
      this.getUml();

      const entity = this.entity();
      if (!!entity) {
        if (entity.entityType === EntityType.MATERIALIZED_VIEW) {
          this.subscribeMaterializedInfo();
        }
      }

      this.subscribeIndexes();

      this.initNewIndexValues();
    });

  }

  readonly entity: WritableSignal<TableModel> = signal(null);

  @Input() set entityIn(entity: TableModel) {
    this.entity.set(entity);
  }

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

  foreignKeys: ForeignKey[] = [];

  types: PolyType[] = [];
  editColumn = -1;
  createColumn = new UiColumnDefinition(-1, '', false, true, 'text', '', null, null, null);
  confirm = -1;
  readonly oldColumns: Signal<Map<string, UiColumnDefinition>>;
  updateColumn = new UntypedFormGroup({name: new UntypedFormControl('')});

  readonly constraints: Signal<ConstraintModel[]>;
  confirmConstraint = -1;
  newPrimaryKey: UiColumnDefinition[];

  uniqueConstraintName = '';
  proposedConstraintName = 'constraintName';

  indexes: RelationalResult;
  newIndexCols = new Map<string, boolean>();
  selectedStoreForIndex: AdapterModel;
  newIndexForm: UntypedFormGroup;
  indexSubmitted = false;
  proposedIndexName = 'indexName';
  addingIndex = false;

  materializedInfo: Signal<{}>;

  //data placement handling
  readonly availableStoresForIndexes: Signal<AdapterModel[]>;
  selectedStore: AdapterModel;


  columnPlacement: UntypedFormGroup;
  placementMethod: Method;
  isAddingPlacement = false;

  //partition handling
  partitionTypes: string[];
  partitioningRequest: PartitioningRequest = new PartitioningRequest();
  isMergingPartitions = false;
  partitionsToModify: { partitionName: string, selected: boolean }[];
  partitionFunctionParams: PartitionFunctionModel;
  fieldTypes: typeof FieldType = FieldType;

  subscriptions = new Subscription();

  placementModal = false;
  partitioningModal = false;
  partitionFunctionModal = false;


  public readonly EntityType = EntityType;

  protected readonly Method = Method;

  protected readonly PlacementType = PlacementType;

  ngOnInit() {
    this.getPartitionTypes();
    this.getGeneratedNames();
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

  isEntityType(type: EntityType): Signal<boolean> {
    return computed(() => this.entity()?.entityType === type);
  }


  columnValidation(columnName: string, editing: string = null) {
    if (editing) {
      if (Array.from(this.oldColumns().values()).filter((h) => h.name === columnName && h.name !== editing).length > 0) {
        return 'is-invalid';
      }
    } else {
      if (Array.from(this.oldColumns().values()).filter((h) => h.name === columnName).length > 0) {
        return 'is-invalid';
      }
    }
    return this._crud.getValidationClass(columnName);
  }

  editCol(i: number, col: UiColumnDefinition, e = null) {
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

  subscribeMaterializedInfo() {
    this.materializedInfo = computed(() => {
      const entity = this.entity;
      if (!entity) {
        return this.materializedInfo();
      }
      return toSignal(this._crud.getMaterializedInfo(new EditTableRequest(this.namespace().id, this.entity().id)))();

    });
  }

  updateMaterialized() {
    const req = new MaterializedRequest(this.entity().id);
    this._crud.updateMaterialized(req).subscribe({
      next: (res: RelationalResult) => {
        //this.subscribeMaterializedInfo();
        if (res.error) {
          this._toast.exception(res, 'Could not update materialized view:');
        } else {
          this._toast.success('Materialized view was updated', res.query, 'Updated');
        }
      }, error: err => {
        this._toast.error('Could not update materialized view due to an error on the server.', null, ToastDuration.INFINITE);
        console.log(err);
      }
    });
  }


  updateMaterializedColumn(oldCol: UiColumnDefinition, newName) {
    const newCol = Object.assign({}, oldCol);
    newCol.name = newName;
    const req = new ColumnRequest(this.entity().id, oldCol, newCol, true, 'MATERIALIZED');

    this._crud.updateColumn(req).subscribe({
      next: (res: RelationalResult) => {
        this.editColumn = -1;
        //this._catalog.updateIfNecessary();
        if (res.error) {
          this._toast.exception(res, 'Could not update column:');
        } else {
          this._toast.success('The column was renamed.', res.query, 'column saved');
        }
      }, error: err => {
        this._toast.error('Could not save column due to an error on the server.', null, ToastDuration.INFINITE);
        console.log(err);
      }
    });
  }


  saveCol() {
    if (!this._crud.nameIsValid(this.updateColumn.controls['name'].value)) {
      this._toast.warn(this._crud.invalidNameMessage('column'), 'invalid column name');
      return;
    }
    if (Array.from(this.oldColumns().values()).filter((h) => h.name === this.updateColumn.controls['name'].value && h.name !== this.updateColumn.controls['oldName'].value).length > 0) {
      this._toast.warn('This column name already exists', 'invalid column name');
      return;
    }
    const oldColumn = this.oldColumns().get(this.updateColumn.controls['oldName'].value);
    const newColumn = new UiColumnDefinition(
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
    const req = new ColumnRequest(this.entity().id, oldColumn, newColumn);
    this._crud.updateColumn(req).subscribe({
      next: (res: RelationalResult) => {
        this.editColumn = -1;
        //this._catalog.updateIfNecessary();
        if (res.error) {
          this._toast.exception(res, 'Could not update column:');
          console.log(res);
        } else {
          this._toast.success('The new column was saved.', res.query, 'column saved');
        }
      }, error: err => {
        this._toast.error('Could not save column due to an error on the server.', null, ToastDuration.INFINITE);
        console.log(err);
      }
    });
  }

  addColumn() {
    if (this.createColumn.name === '') {
      this._toast.warn('Please provide a name for the new column.', 'missing column name');
      return;
    }
    if (!this._crud.nameIsValid(this.createColumn.name)) {
      this._toast.warn(this._crud.invalidNameMessage('column'), 'invalid column name');
      return;
    }
    if (Array.from(this.oldColumns().values()).filter((h) => h.name === this.createColumn.name).length > 0) {
      this._toast.warn('There already exists a column with this name', 'invalid column name');
      return;
    }
    if (!this._types.supportsPrecision(this.createColumn.dataType) && this.createColumn.precision !== null) {
      this.createColumn.precision = null;
    }
    if (!this._types.supportsScale(this.createColumn.dataType) && this.createColumn.scale !== null) {
      this.createColumn.scale = null;
    }
    const req = new ColumnRequest(this.entity().id, null, this.createColumn);
    this._crud.addColumn(req).subscribe({
      next: (res: RelationalResult) => {
        if (res.error === undefined) {
          //this._catalog.updateIfNecessary();
          this.createColumn.name = '';
          this.createColumn.nullable = true;
          this.createColumn.dataType = INITIAL_TYPE;
          this.createColumn.collectionsType = '';
          this.createColumn.precision = null;
          this.createColumn.scale = null;
          this.createColumn.defaultValue = null;
        } else {
          this._toast.exception(res, null, 'server error', ToastDuration.INFINITE);
        }
      }, error: err => {
        this._toast.error('An error occurred on the server.', null, ToastDuration.INFINITE);
        console.log(err);
      }
    });
  }

  dropColumn(col: UiColumnDefinition) {
    this._crud.dropColumn(new ColumnRequest(this.entity().id, col)).subscribe({
      next: (result: RelationalResult) => {
        //this._catalog.updateIfNecessary();
        //this.getPlacementsAndPartitions();
        this.confirm = -1;
        if (result.error) {
          this._toast.exception(result, 'Could not delete column:', 'server error', ToastDuration.INFINITE);
        }
      }, error: err => {
        this._toast.error('Could not delete column.', null, ToastDuration.INFINITE);
        console.log(err);
      }
    });
  }

  getUml() {
    this.foreignKeys = [];
    if (!this.namespace) {
      this.foreignKeys = null;
      return;
    }
    this._crud.getUml(new EditTableRequest(this.namespace().id)).subscribe({
      next: (uml: Uml) => {

        const fks = new Map<string, ForeignKey>();

        uml.foreignKeys.forEach((v, k) => {
          if ((v.sourceSchema + '.' + v.sourceTable) === this._catalog.getFullEntityName(this.entity().id)) {
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
      }, error: err => {
        console.log(err);
      }
    });
  }


  dropConstraint(constraintId: number) {
    this._crud.dropConstraint(new ConstraintRequest(this.entity().id, new TableConstraint(constraintId))).subscribe({
      next: (result: RelationalResult) => {
        if (result.error) {
          this._toast.exception(result, null, 'constraint error');
        } else {
          //this._catalog.updateIfNecessary();
          this.getUml();
        }
      }, error: err => {
        console.log(err);
      }
    });
  }

  updatePrimaryKey() {
    const pk = new TableConstraint(-1, 'PRIMARY KEY');
    this.newPrimaryKey.forEach((v, k) => {
      if (v.primary) {
        pk.addColumn(v.name);
      }
    });
    const constraintRequest = new ConstraintRequest(this.entity().id, pk);
    this._crud.addPrimaryKey(constraintRequest).subscribe({
      next: (res: RelationalResult) => {
        if (!res.error) {
          this._toast.success('The primary key was updated.', res.query, 'updated primary key');
          //this._catalog.updateIfNecessary();
          //this.getPlacementsAndPartitions();
        } else {
          this._toast.exception(res, null, 'primary key error', ToastDuration.INFINITE);
        }
      }, error: err => {
        this._toast.error('Could not update primary key.', null, ToastDuration.INFINITE);
        console.log(err);
      }
    });
  }

  addUniqueConstraint() {
    if (this.uniqueConstraintName === '') {
      if (!this.proposedConstraintName) {
        this._toast.warn('Please provide a name for the unique constraint.', 'constraint name');
        return;
      } else {
        this.uniqueConstraintName = this.proposedConstraintName;
      }
    }
    if (!this._crud.nameIsValid(this.uniqueConstraintName)) {
      this._toast.warn(this._crud.invalidNameMessage('unique constraint'), 'invalid constraint name');
      return;
    }
    const constraint = new TableConstraint(-1, this.uniqueConstraintName, 'UNIQUE');
    let counter = 0;
    this.oldColumns().forEach((v, k) => {
      if (v.unique) {
        constraint.addColumn(v.name);
        counter++;
      }
    });
    if (counter === 0) {
      this._toast.warn('Please select at least one column that should be part of the unique constraint.', 'unique constraint');
      return;
    }
    const constraintRequest = new ConstraintRequest(this.entity().id, constraint);
    this._crud.addUniqueConstraint(constraintRequest).subscribe({
      next: (res: RelationalResult) => {
        if (!res.error) {
          //this._catalog.updateIfNecessary();
          this._toast.success('The unique constraint was successfully created', res.query, 'added constraint');
          this.uniqueConstraintName = '';
          this.getGeneratedNames();
          this.oldColumns().forEach((v, k) => {
            v.unique = false;
          });
        } else {
          this._toast.exception(res, null, 'unique constraint error', ToastDuration.INFINITE);
        }
      }, error: err => {
        this._toast.error('Could not add unique constraint.', null, ToastDuration.INFINITE);
        console.log(err);
      }
    });
  }

  assignDefault(col: any, isFormGroup: boolean) {
    if (isFormGroup) {
      if (this._types.isNumeric(col.controls['dataType'].value)) {
        col.controls['defaultValue'].setValue(0);
      } else if (this._types.isBoolean(col.controls['dataType'].value)) {
        col.controls['defaultValue'].setValue(false);
      } else {
        col.controls['defaultValue'].setValue('');
      }
    } else {
      if (this._types.isNumeric(col.dataType)) {
        col.defaultValue = 0;
      } else if (this._types.isBoolean(col.dataType)) {
        col.defaultValue = false;
      } else {
        col.defaultValue = '';
      }
    }
  }

  triggerDefaultNull(col: UiColumnDefinition = null) {
    if (col === null) {//when updating a column
      if (this.updateColumn.controls['defaultValue'].value === null) {
        this.updateColumn.controls['defaultValue'].enable();
        this.assignDefault(this.updateColumn, true);
      } else {
        this.updateColumn.controls['defaultValue'].setValue(null);
        this.updateColumn.controls['defaultValue'].disable();
      }
    } else {//if col !== null: when inserting a new column
      if (col.defaultValue === null) {
        this.assignDefault(col, false);
      } else {
        col.defaultValue = null;
      }
    }
  }

  changeNullable(col: UiColumnDefinition = null) {
    if (col === null) {//when updating a column
      if (this.updateColumn.controls['defaultValue'].value === null && this.updateColumn.controls['nullable'].value === false) {
        this.updateColumn.controls['defaultValue'].enable();
        this.assignDefault(this.updateColumn, true);
      }
    } else {//if col !== null: when inserting a new column
      if (col.defaultValue === null && col.nullable === false) {
        this.assignDefault(col, false);
      }
    }
  }

  subscribeIndexes() {
    effect(() => {
      const entity = this.entity();
      const namespace = this.namespace();
      if (!entity && !namespace) {
        return;
      }
      this.indexes = toSignal(this._crud.getIndexes(new EditTableRequest(namespace.id, entity.id)))() as RelationalResult;
    });
  }


  initNewIndexValues() {
    const availableStores = this.availableStoresForIndexes;
    if (availableStores()?.length > 0) {
      this.selectedStoreForIndex = availableStores[0];
      if (availableStores[0].indexMethods && availableStores[0].indexMethods.length > 0) {
        this.newIndexForm.controls['method'].setValue(availableStores[0].indexMethods[0].name);
      }
    } else {
      this.selectedStoreForIndex = null;
      this.newIndexForm.controls['method'].setValue('');
    }
  }

  onSelectingIndexStore(store: AdapterModel) {
    this.selectedStoreForIndex = store;
    this.newIndexForm.controls['method'].setValue(store.indexMethods[0]);
  }

  getAvailableStoresForIndexes() {

    effect(() => {
      if (!this.availableStoresForIndexes || !this.availableStoresForIndexes()) {
        return;
      }
      const stores = this.availableStoresForIndexes();

      if (stores?.length > 0) {
        this.selectedStoreForIndex = this.availableStoresForIndexes[0];
        this.newIndexForm.controls['method'].setValue(this.selectedStoreForIndex.indexMethods[0]);
      } else {
        this.selectedStoreForIndex = null;
      }
    });
  }

  initPlacementModal(method: Method, placement: AllocationPlacementModel) {
    let store;
    const preselect = this._catalog.getAllocColumns(placement.id);
    this.placementMethod = method;
    if (placement != null) {
      store = <AdapterModel>this._catalog.getAdapter(placement.adapterId);
      this.selectedStore = store;
    }
    if (!this.selectedStore) {
      return;
    }
    this.columnPlacement = new UntypedFormGroup({});
    this.oldColumns().forEach((v, k) => {
      let state = true;
      if (preselect.length > 0 && !preselect.some(e => e.name === v.name && e.placementType === PlacementType.MANUAL)) {
        state = false;
      }
      this.columnPlacement.addControl(v.name, new UntypedFormControl(state));
    });
    this.placementModal = true;
  }

  clearPlacementModal() {
    this.selectedStore = null;
  }

  selectAllColumns(selectAll: boolean) {
    this.oldColumns().forEach((v, k) => {
      this.columnPlacement.get(v.name).setValue(selectAll);
    });
  }

  addPlacement() {
    const cols = [];
    for (const [k, v] of Object.entries(this.columnPlacement.value)) {
      //const v = this.columnPlacement.value[k];
      if (v) {
        cols.push(k);
      }
    }
    this.isAddingPlacement = true;
    this._crud.addDropPlacement(this.namespace().id, this.entity().id, this.selectedStore.id, this.placementMethod, cols).subscribe({
      next: (res: RelationalResult) => {
        if (res.error) {
          this._toast.exception(res);
        } else {
          if (this.placementMethod === 'ADD') {
            this._toast.success('Added placement on store ' + this.selectedStore.name, res.query, 'Added placement');
          } else if (this.placementMethod === 'MODIFY') {
            this._toast.success('Modified placement on store ' + this.selectedStore.name, res.query, 'Modified placement');
          }
          //this._catalog.updateIfNecessary();
        }
        this.selectedStore = null;
      }, error: err => {
        this._toast.error('Could not ' + this.placementMethod.toLowerCase() + ' placement on store ' + this.selectedStore.name);
      }
    }).add(() => {
      this.isAddingPlacement = false;
      this.placementModal = false;
    });
  }

  dropPlacement(adapterId: number) {
    const store = <AdapterModel>this._catalog.getAdapter(adapterId);
    this._crud.addDropPlacement(this.namespace().id, this.entity().id, store.id, Method.DROP).subscribe({
      next: (res: RelationalResult) => {
        if (res.error) {
          this._toast.exception(res);
        } else {
          this._toast.success('Dropped placement on store ' + store.name, res.query, 'Dropped placement');
          //this.getPlacementsAndPartitions();
          this.getAvailableStoresForIndexes();
        }
      }, error: err => {
        this._toast.error('Could not drop placement on store ' + store.name, 'Error');
      }
    });
  }

  getPartitionTypes() {
    this._crud.getPartitionTypes().subscribe({
      next: (res: string[]) => {
        this.partitionTypes = res;
      },
      error: err => {
        console.log(err);
      }
    });
  }

  /**
   * Whether the table is partitioned
   */
  isPartitioned() {
    return this.placements()?.length > 1;
  }

  getPartitionFunctionModel() {
    if (this.partitioningRequest.method === 'NONE') {
      this._toast.warn('Please select a partitioning method.');
      return;
    }
    this.partitioningRequest.schemaName = this.namespace().name;
    this.partitioningRequest.tableName = this.entity().name;
    this._crud.getPartitionFunctionModel(this.partitioningRequest).subscribe({
      next: (res: PartitionFunctionModel) => {
        this.partitionFunctionParams = res;
        if (this.partitionFunctionParams.error) {
          this._toast.warn(this.partitionFunctionParams.error);
        } else {
          this.partitionFunctionModal = true;
        }
      }, error: err => {
        this.partitionFunctionParams = null;
        this._toast.error('Could not get partitionFunctionParams');
        console.log(err);
      }
    });
  }

  /**
   * Horizontally partition a table
   */
  partitionTable() {
    this._crud.partitionTable(this.partitionFunctionParams).subscribe({
      next: (res: RelationalResult) => {
        if (res.error) {
          this._toast.exception(res);
          console.log(res.query);
        } else {
          this._toast.success('Partitioned table', res.query);
          //this.getPlacementsAndPartitions();
        }
        this.partitionFunctionModal = false;
      }, error: err => {
        this._toast.error(err);
      }
    });
  }

  mergePartitions() {
    //const split = this.tableId.split('\.');
    const request = new PartitioningRequest(this.namespace().name, this.entity().name);
    this.isMergingPartitions = true;
    this._crud.mergePartitions(request).subscribe({
      next: res => {
        const result = <RelationalResult>res;
        if (!result.error) {
          this._toast.success('Merged partitions ');
          //this.getPlacementsAndPartitions();
        } else {
          this._toast.exception(result);
        }
      }, error: err => {
        this._toast.error('Could not merge partitions');
        console.log(err);
      }
    }).add(() => {
      this.isMergingPartitions = false;
    });
  }

  modifyPartitioning() {
    const partitions = [];
    for (let i = 0; i < this.partitionsToModify.length; i++) {
      if (this.partitionsToModify[i].selected) {
        partitions.push(this.partitionsToModify[i].partitionName);
      }
    }
    //const split = this.tableId.split('\.');
    const request = new ModifyPartitionRequest(this.namespace().name, this.entity().name, partitions, this.selectedStore.name);
    this._crud.modifyPartitions(request).subscribe({
      next: (res: RelationalResult) => {
        if (!res.error) {
          this.partitioningModal = false;
          this._toast.success('Modified partitions');
          //this.getPlacementsAndPartitions();
          console.log(res.query);
        } else {
          this._toast.exception(res);
          console.log(res.query);
        }
      }, error: err => {
        this._toast.error('Could not modify the partitioning');
      }
    });
  }

  initPartitioningModal(adapterId: number, partitions: AllocationPartitionModel[]) {
    const store = <AdapterModel>this._catalog.getAdapter(adapterId);
    this.partitionsToModify = [];

    console.log(this.partitions());

    const selectedPartId = partitions.map(p => p.id);
    for (const [i, partition] of this.partitions().entries()) {
      this.partitionsToModify.push({
        partitionName: partition.name,
        selected: selectedPartId.includes(partition.id)
      });
    }

    this.selectedStore = store;
    this.partitioningModal = true;
  }

  clearPartitioningModal() {
    this.selectedStore = null;
  }

  selectAllPartitions(select: boolean) {
    for (const p of this.partitionsToModify) {
      p.selected = select;
    }
  }

  dropIndex(index: string) {
    this._crud.dropIndex(new IndexModel(this.namespace().id, this.entity().id, index, null, null, null)).subscribe({
      next: (res: RelationalResult) => {
        if (!res.error) {
          //this._catalog.updateIfNecessary();
        } else {
          this._toast.exception(res, 'Could not drop index:');
        }
      }, error: err => {
        console.log(err);
      }
    });
  }

  addIndex() {
    this.indexSubmitted = true;
    const newCols = [];
    for (const [k, v] of Object.entries(this.newIndexCols)) {
      if (v) {
        newCols.push(k);
      }
    }
    if (this.newIndexForm.controls['method'].valid && this.newIndexForm.controls['name'].errors && newCols.length > 0) {
      this.newIndexForm.controls['name'].setValue(this.proposedIndexName);
    }
    if (this.newIndexForm.valid && newCols.length > 0 && this.selectedStoreForIndex != null) {
      const i = this.newIndexForm.value;
      const index = new IndexModel(this.namespace().id, this.entity().id, i.name, this.selectedStoreForIndex.name, i.method, newCols);
      this.addingIndex = true;
      this._crud.createIndex(index).subscribe({
        next: (res: RelationalResult) => {
          if (!res.error) {
            //this._catalog.updateIfNecessary();
            this.getGeneratedNames();
            this.newIndexForm.reset({name: '', method: ''});
            this.initNewIndexValues();
            this.newIndexCols = new Map(Array.from(this.oldColumns().values()).map(c => [c.name, false]));
            this.indexSubmitted = false;
          } else {
            this._toast.exception(res, 'Could not create index:');
          }
        }, error: err => {
          console.log(err);
        }
      }).add(() => this.addingIndex = false);
    }
  }

  getGeneratedNames() {
    this._crud.getGeneratedNames().subscribe({
      next: (names: RelationalResult) => {
        if (names != null && !names.error) {
          this.proposedConstraintName = names.data[0][0];
          this.proposedIndexName = names.data[0][2];
        }
      }, error: err => {
        console.log(err);
      }
    });
  }

  inputValidation(key) {
    if (this.newIndexForm.controls[key].value === '') {
      return '';
    } else if (this.newIndexForm.controls[key].valid) {
      return {'is-valid': true};
    } else {
      return {'is-invalid': true};
    }
  }

  onTypeChange() {
    this.updateColumn.controls['defaultValue'].setValue(null);
  }

  onTypeChange2(col: UiColumnDefinition) {
    if (col.defaultValue !== null) {
      this.assignDefault(col, false);
    }
    col.precision = null;
    col.scale = null;
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

  validatePartitionModification() {
    if (this.partitionsToModify) {
      for (const p of this.partitionsToModify) {
        if (p.selected) {
          return true;
        }
      }
    }
    return false;
  }

  getOrNull(index: number) {
    return this.materializedInfo()[index] || null;
  }

  getColumnsOfKey(constraint: ConstraintModel): Signal<number[]> {
    return computed(() => this._catalog.getKey(constraint.keyId).columnIds);

  }

  getArray(values: IterableIterator<UiColumnDefinition>) {
    return Array.from(values);
  }
}
