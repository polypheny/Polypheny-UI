import {Component, OnInit, OnDestroy, ViewChild, HostListener} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import * as $ from 'jquery';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {CrudService} from '../../../services/crud.service';
import {
  DbColumn, FieldType,
  Index, ModifyPartitionRequest, PartitionFunctionModel,
  PartitioningRequest,
  PolyType,
  ResultSet,
  TableConstraint
} from '../../../components/data-view/models/result-set.model';
import {ToastDuration, ToastService} from '../../../components/toast/toast.service';
import {FormControl, FormGroup, Validators} from '@angular/forms';
import {ColumnRequest, ConstraintRequest, EditTableRequest} from '../../../models/ui-request.model';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {CatalogColumnPlacement, GraphPlacements, Placements, PlacementType, Store} from '../../adapters/adapter.model';
import {ModalDirective} from 'ngx-bootstrap/modal';
import * as _ from 'lodash';
import {Subscription} from 'rxjs';
import {DbTable, ForeignKey, SvgLine, Uml} from '../../../views/uml/uml.model';

@Component({
  selector: 'app-graph-edit',
  templateUrl: './graph-edit-graph.component.html',
  styleUrls: ['./graph-edit-graph.component.scss']
})

export class GraphEditGraphComponent implements OnInit, OnDestroy {

  graphId: string;

  resultSet: ResultSet;
  types: PolyType[] = [];
  editColumn = -1;
  createColumn = new DbColumn( '', false, true, 'text', '', null, null, null);
  confirm = -1;
  oldColumns = new Map<string, DbColumn>();
  updateColumn = new FormGroup({name: new FormControl('')});


  //data placement handling
  stores: Store[];
  availableStoresForIndexes: Store[];
  selectedStore: Store;
  dataPlacements: GraphPlacements;
  columnPlacement: FormGroup;
  placementMethod: 'ADD' | 'MODIFY' | 'DROP';
  isAddingPlacement = false;

  //partition handling
  partitionTypes: string[];
  partitioningRequest: PartitioningRequest = new PartitioningRequest();
  isMergingPartitions = false;
  partitionsToModify: { partitionName: string, selected: boolean }[];
  partitionFunctionParams: PartitionFunctionModel;
  fieldTypes: typeof FieldType = FieldType;

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
    this.getGraphId();
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
    if( $(targetElement).parents('.editing').length === 0 ){
      self.editColumn = -1;
    }
  }

  getGraphId () {
    this.graphId = this._route.snapshot.paramMap.get('id');
    const sub = this._route.params.subscribe((params) => {
      this.graphId = params['id'];
    });
    this.subscriptions.add(sub);
  }


  getStores() {
    this._crud.getStores().subscribe(
      res => {
        this.stores = <Store[]>res;
      }, err => {
        console.log(err);
      });
  }

  getAddableStores (): Store[] {
    if(!this.stores) { return []; }
    return this.stores.filter( (s: Store) => {
      //hide stores that are already part of the placement
      if ( this.dataPlacements && this.dataPlacements.stores && this.dataPlacements.stores.length > 0 ) {
        let showStore = true;
        for ( const store of this.dataPlacements.stores ) {
          if( store.uniqueName === s.uniqueName ) {
            showStore = false;
          }
        }
        return showStore;
      }
      else {
        return true;
      }
    });
  }


  modifyPlacement( method: 'ADD' | 'DROP', store = null ){
    if( store != null ) {
      this.selectedStore = store;
    }
    if (!this.selectedStore) {
      return;
    }
    this.isAddingPlacement = true;
    this._crud.addDropGraphPlacement(this.graphId, this.selectedStore.uniqueName, method ).subscribe( res => {
      const result = <ResultSet> res;
      if( result.error ) {
        this._toast.exception( result );
      } else {
        if ( method === 'ADD' ) {
          this._toast.success('Added placement on store ' + this.selectedStore.uniqueName, result.generatedQuery, 'Added placement' );
        } else if (method === 'DROP') {
          this._toast.success('Dropped placement on store ' + this.selectedStore.uniqueName, result.generatedQuery, 'Dropped placement' );
        }
        this.getPlacements();
      }
    }).add(() => {
      this.isAddingPlacement = false;
    });
  }
  

  validate( defaultValue ){
    if( defaultValue === null ){
      return '';
    } else if ( isNaN(defaultValue) || defaultValue === '' ) {
      return 'is-invalid';
    }else{
      return 'is-valid';
    }
  }

  private getPlacements() {
    this._crud.getGraphPlacements( this.graphId ).subscribe( res => {
      console.log(res);
      this.dataPlacements = <GraphPlacements>res;
      if( this.dataPlacements.exception ){
        // @ts-ignore
        this._toast.exception( {error: this.dataPlacements.exception.detailMessage, exception: this.dataPlacements.exception} );
      }
    });
  }

}
