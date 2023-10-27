import {Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild, ViewEncapsulation} from '@angular/core';
import * as $ from 'jquery';
import {NamespaceType} from '../../../models/ui-request.model';
import {PaginationElement} from '../models/pagination-element.model';
import {UiColumnDefinition} from '../models/result-set.model';
import {SortDirection, SortState} from '../models/sort-state.model';
import {CrudService} from '../../../services/crud.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {BsModalRef, BsModalService} from 'ngx-bootstrap/modal';
import {Freshness, TimeUnits} from '../data-view.component';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {LeftSidebarService} from '../../left-sidebar/left-sidebar.service';
import {CatalogService} from '../../../services/catalog.service';
import {DataTemplateComponent} from '../data-template/data-template.component';


@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DataTableComponent extends DataTemplateComponent implements OnInit {

  constructor(
      public _crud: CrudService,
      public _types: DbmsTypesService,
      public _settings: WebuiSettingsService,
      public _sidebar: LeftSidebarService,
      public modalService: BsModalService,
      public _catalog: CatalogService
  ) {
    super();

  }

  @ViewChild('decisionTree', {static: false}) public decisionTree: TemplateRef<any>;
  @ViewChild('sql', {static: false}) public sql: TemplateRef<any>;
  @ViewChild('editorGenerated', {static: false}) editorGenerated;
  @ViewChild('tutorial', {static: false}) public tutorial: TemplateRef<any>;

  classifiedData: string[][];
  isExploringData = false;
  cData: string[][];
  modalRef: BsModalRef;
  modalRefDecision: BsModalRef;
  modalRefTutorial: BsModalRef;
  @Input() tutorialMode: boolean;
  createdSQL: string;

  columns = [];
  userInput = {};

  @Output() showViewExploring = new EventEmitter();


  protected readonly Freshness = Freshness;
  protected readonly TimeUnits = TimeUnits;


  /*createViewButton(createViewExample) {
    this.modalRefCreateView = this.modalService.show(createViewExample);
    this._catalog.updateIfNecessary();
    this.getStores();

  }

  executeViewExample(createdSQL) {
    if (this.newViewName === '') {
      this._toast.warn('Please provide a name for the new view. The new view was not created.', 'missing view name', ToastDuration.INFINITE);
      return;
    }
    if (!this._crud.nameIsValid(this.newViewName)) {
      this._toast.warn('Please provide a valid name for the new view. The new view was not created.', 'invalid view name', ToastDuration.INFINITE);
      return;
    }

    if (this.tables().filter((t) => t.name === this.newViewName).length > 0) {
      this._toast.warn('A table or view with this name already exists. Please choose another name.', 'invalid table name', ToastDuration.INFINITE);
      return;
    }

    this.createdSQL = 'CREATE VIEW ' + this.newViewName + ' AS\n' + createdSQL;
    const code = this.createdSQL;
    this.executeCreateView(code);

    this.modalRefCreateView.hide();
    this.gotTables = false;
  }


  submitCreateViewExample(createdSQL) {

    let viewData;
    if (this.freshnessSelected === 'MANUAL') {
      viewData = 'CREATE MATERIALIZED VIEW ' + this.newViewName + ' AS ' + createdSQL + '\nON STORE ' + this.storeSelected + '\nFRESHNESS ' + this.freshnessSelected;
    } else if (this.freshnessSelected === 'UPDATE') {
      viewData = 'CREATE MATERIALIZED VIEW ' + this.newViewName + ' AS ' + createdSQL + '\nON STORE ' + this.storeSelected + '\nFRESHNESS ' + this.freshnessSelected + ' ' + this.intervalSelected;
    } else {
      viewData = 'CREATE MATERIALIZED VIEW ' + this.newViewName + ' AS ' + createdSQL + '\nON STORE ' + this.storeSelected + '\nFRESHNESS ' + this.freshnessSelected + ' ' + this.intervalSelected + ' ' + this.timeUniteSelected;
    }


    console.log(viewData);
    this.executeCreateView(viewData);

    this.modalRefCreateView.hide();
    this.gotTables = false;

  }

  asExploreResult(resultSet: RelationalExploreResult) {
    return <RelationalExploreResult>resultSet;
  }*/
  protected readonly NamespaceType = NamespaceType;

  trackByFn(index: any, item: any) {
    return index;
  }

  ngOnInit() {
    super.ngOnInit();
  }


  filterTable(e, filterVal, col: UiColumnDefinition) {
    this.result().currentPage = 1;
    if (e.keyCode === 27) { //esc
      $('.table-filter').val('');
      this.filter.clear();
      this.getEntityData();
      return;
    }
    if (col.collectionsType || col.dataType.includes('ARRAY')) {
      if (this.isValidArray(filterVal) || !filterVal) {
        this.filter.set(col.name, filterVal);
      }
    } else {
      this.filter.set(col.name, filterVal);
    }
    this.focusId = 'search-' + col.name;
    this.getEntityData();
  }

  paginate(p: PaginationElement) {
    this.result().currentPage = p.page;
    /*if (this.entityConfig.exploring) {
      this.getExploreTables();
    } else {*/
    this.getEntityData();
    //}
  }

  sortTable(s: SortState) {
    //todo primary ordering, secondary ordering
    if (s.sorting === false) {
      s.sorting = true;
      s.direction = SortDirection.ASC;
    } else {
      if (s.direction === SortDirection.ASC) {
        s.direction = SortDirection.DESC;
      } else {
        s.direction = SortDirection.ASC;
        s.sorting = false;
      }
    }
    this.getEntityData();
  }

  isValidArray(val: string): boolean {
    if (val.startsWith('[') && val.endsWith(']')) {
      try {
        JSON.parse(val);
        return true;
      } catch (e) {
        return false;
      }
    }
    return false;
  }

  isValidFilter(val, col: UiColumnDefinition) {
    if (!val) {
      return;
    }
    if (col.collectionsType || col.dataType.includes('ARRAY')) {
      if (!this.isValidArray(val)) {
        return 'is-invalid';
      }
    }
  }


  getTooltip(col: UiColumnDefinition): string {
    if (!col) {
      return '';
    }
    let out = 'name: ' + col.name;
    out += '\ntype: ' + col.dataType;
    if (col.collectionsType) {
      out += '\ncollection: ' + col.collectionsType;
    }
    if (col.primary) {
      out += '\nprimary';
    }
    if (col.unique) {
      out += '\nunique: ' + col.unique;
    }
    if (col.nullable) {
      out += '\nnullable: ' + col.nullable;
    }
    if (col.defaultValue) {
      out += '\ndefaultValue: ' + col.defaultValue;
    }

    if (col.precision) {
      out += '\nprecision: ' + col.precision;
    }
    if (col.scale) {
      out += '\nscale: ' + col.scale;
    }
    if (col.dimension) {
      out += '\ndimension: ' + col.dimension;
    }
    if (col.cardinality) {
      out += '\ncardinality: ' + col.cardinality;
    }
    return out;
  }

  /**
   * returns true if a columns can be ordered
   */
  canOrder(col: UiColumnDefinition) {
    return !this._types.isMultimedia(col.dataType) && !col.collectionsType;
  }
}
