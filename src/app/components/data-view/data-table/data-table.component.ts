import {Component, effect, EventEmitter, Input, OnInit, Output, TemplateRef, untracked, ViewChild, ViewEncapsulation} from '@angular/core';
import * as $ from 'jquery';
import {ClassifyRequest, Exploration, ExploreTable, NamespaceType} from '../../../models/ui-request.model';
import {PaginationElement} from '../models/pagination-element.model';
import {ExploreSet, RelationalResult, UiColumnDefinition} from '../models/result-set.model';
import {SortDirection, SortState} from '../models/sort-state.model';
import {CrudService} from '../../../services/crud.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {BsModalRef, BsModalService} from 'ngx-bootstrap/modal';
import {CombinedResult, DataViewComponent, Freshness, TimeUnits} from '../data-view.component';
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

  @Input() exploreSet?: ExploreSet;
  @Input() exploreId?: number;
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
  exploreDataCounter = 0;

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


  ngOnInit() {
    super.ngOnInit();
  }

  /**
   * Pagination for Explore-by-Example
   */

  /*getExploreTables() {

    if (this.isExploringData) {
      this.prepareClassifiedData();
    }
    const savedResultHead = this.result().header;
    this._crud.getExploreTables(new ExploreTable(this.asExploreResult(this.combinedResult()).explorerId, this.result().header as UiColumnDefinition[], this.result().currentPage)).subscribe({
      next: res => {
        const result = <RelationalResult>res;

        if (this.asExploreResult(this.combinedResult()).includesClassificationInfo) {
          this.userInput = {};
          this.prepareUserInput(this.asExploreResult(this.combinedResult()).classifiedData);
        }
        this.result().header = savedResultHead;
        this.result().data = result.data;
        this.result().query = result.query;
        this.result().affectedTuples = result.affectedTuples;
        this.result().highestPage = result.highestPage;

        //go to highest page if you are "lost" (if you are on a page that is higher than the highest possible page)
        if (+this._route.snapshot.paramMap.get('page') > this.result().highestPage) {
          this._router.navigate(['/views/data-table/' + this.entity().name + '/' + this.result().highestPage]);
        }
        this.setPagination();
        this.editing = -1;
        if (result.type === EntityType.ENTITY) {
          this.entityConfig.create = true;
          this.entityConfig.update = true;
          this.entityConfig.delete = true;
        } else {
          this.entityConfig.create = false;
          this.entityConfig.update = false;
          this.entityConfig.delete = false;
        }

      },
      error: err => {
        this._toast.error('Could not load the data.');
        console.log(err);
      }
    });
  }*/

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

  /**
   * Reset button within Explore-by-Example, resets actual Pagination Page
   */
  resetExplorationData() {
    this.exploreDataCounter = 0;
    this.userInput = [];
    this.exploreSet = undefined;
  }

  /**
   * Prepares labeled user data for Explore-by-Example
   */
  prepareClassifiedData() {
    this.cData.forEach(value => {
      if (!this.classifiedData) {
        this.classifiedData = [];
      }
      this.classifiedData.forEach(val => {
        if (val.slice(0, -1).toString() === value.slice(0, -1).toString() && value.slice(-1).toString() !== '?') {
          this.classifiedData.splice(this.classifiedData.indexOf(val));
        }
      });
      this.classifiedData.push(value);
    });
  }

  /**
   * Prepares data from backend in order to show data with correct colors and buttons
   * @param dataAfterClassification
   */
  prepareUserInput(dataAfterClassification) {

    for (let i = 0; i < dataAfterClassification.length; i++) {
      let data = '';
      const label = [];
      for (let j = 0; j < dataAfterClassification[i].length; j++) {
        if (dataAfterClassification[i][j] === 'true' || dataAfterClassification[i][j] === 'false') {
          data += (dataAfterClassification[i][j]);
        } else {
          label.push(dataAfterClassification[i][j].split('\'').join(''));

        }
      }
      this.userInput[label.join(',').toString()] = data;

    }
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

  /**
   * Send Classification for Explore-by-Example
   * Preparse tree to be shown in frontend
   */

  /*sendClassificationData() { // todo dl inject via plugin
    this.prepareClassifiedData();
    this._crud.exploreUserInput(new Exploration(this.exploreId, this.result().header as UiColumnDefinition[], this.classifiedData)).subscribe({
      next: res => {
        //this._toast.success('Classification successful');
        this.initalClassifiation = false;
        this.finalresult = false;
        if (this.tutorialMode) {
          this.openTutorial(this.tutorial);
        }
        this.exploreSet = <ExploreSet>res;
        this.exploreId = this.asExploreResult(this.combinedResult()).explorerId;
        // this.openModal(this.template);
        this.userInput = {};
        this.cData = [];
        this.exploreDataCounter = 0;

        this.prepareUserInput(this.exploreSet.dataAfterClassification);

        let tree = <string>this.exploreSet.graph;

        const digraph = dot.read(tree);
        const nodes = digraph.nodes().join('; ');

        const treeArray = tree.split(' shape=box style=filled ').join('').split('{');

        if (treeArray.length > 1) {
          tree = treeArray[0] + '{ ' + nodes.toString() + '; ' + treeArray[1];
        }

        const treeGraph = dot.read(tree);
        const render = new dagreD3.render();

        const svg = d3.select('svg#tree'),
            svgGroup = svg.append('g');

        render(d3.select('svg#tree g'), treeGraph);

        const xCenterOffset = (svg.attr('width') - treeGraph.graph().width) / 2;
        svgGroup.attr('transform', 'translate(' + xCenterOffset + ',20');
        svg.attr('height', treeGraph.graph().height + 1);
        svg.attr('width', treeGraph.graph().width + 1);


      }, error: err => {
        this._toast.error(('Classification Failed'));
        console.log(err);

      }
    });
  }

  exploreData() {
    this.isExploringData = true;
    this.cData = cloneDeep(this.result().data);
    this.cData.forEach(value => {
      if (this.userInput) {
        let count = 0;
        Object.keys(this.userInput).forEach(val => {
          if (this.userInput[val] !== '?' && val === value.toString()) {
            value.push(this.userInput[val]);
            count += 1;
          }
        });

        if (count === 0) {
          value.push('?');
        }
      }
    });
    this.exploreDataCounter++;
  }*/


  openTutorial(tutorial: TemplateRef<any>) {
    this.modalRefTutorial = this.modalService.show(tutorial);
  }

  openDecisionTree(decisionTree: TemplateRef<any>) {
    this.modalRefDecision = this.modalService.show(decisionTree);
    const finalTree = $('.hidden-layer').clone().removeClass('hidden-layer');
    finalTree.appendTo('#modal-body-tree');
  }

  openSQL(sql: TemplateRef<any>) {
    this.modalRef = this.modalService.show(sql);
  }


  /**
   * Final Request for final result Explore-by-Example
   */
  /*sendChosenCols() { // todo dl via injection
    this._crud.classifyData(new ClassifyRequest(this.exploreId, this.result().header as UiColumnDefinition[], this.classifiedData, this.cPage)).subscribe({
      next: res => {
        //this._toast.success('Final Result');
        this.finalresult = true;
        this.userInput = {};
        this.classifiedData = [];
        this.result.set(CombinedResult.fromRelational(<RelationalResult>res));
        this.exploreId = this.asExploreResult(this.combinedResult()).explorerId;
        if (this.result().query) {
          this.createdSQL = this.result().query;
        }
        this.setPagination();
        this.showViewExploring.emit(true);
      },
      error: err => {
        this._toast.error(('Error showing final Result'));
        console.log(err);
      }
    });
  }*/


  /*async startClassification() {
    await this.exploreData();
    this.sendClassificationData();
  }*/

  getSelected() {
    const values = Object.values(this.userInput);
    return values.filter((el, i, a) => {
      return el !== '?';
    }).length;
  }

  displayRowItem(data: string, col: UiColumnDefinition) {
    if (data == null) {
      return '';
    } else if (!col) {
      return data;
    } else {
      if (data.length > 1000) {
        return data.slice(0, 1000) + '...';
      }
    }
    return data;
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
