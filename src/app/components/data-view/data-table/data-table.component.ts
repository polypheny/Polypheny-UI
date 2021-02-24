import {Component, Input, OnChanges, OnInit, SimpleChanges, TemplateRef, ViewChild, ViewEncapsulation} from '@angular/core';
import * as $ from 'jquery';
import {cloneDeep} from 'lodash';
import {ClassifyRequest, Exploration, ExploreTable} from '../../../models/ui-request.model';
import {PaginationElement} from '../models/pagination-element.model';
import {DbColumn, ExploreSet, ResultSet} from '../models/result-set.model';
import {SortDirection, SortState} from '../models/sort-state.model';
import {ToastDuration, ToastService} from '../../toast/toast.service';
import {CrudService} from '../../../services/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import * as dot from 'graphlib-dot';
import * as dagreD3 from 'dagre-d3';
import * as d3 from 'd3';
import {BsModalService, BsModalRef} from 'ngx-bootstrap/modal';
import {HttpEventType} from '@angular/common/http';
import {DataViewComponent} from '../data-view.component';
import {WebuiSettingsService} from '../../../services/webui-settings.service';


@Component({
  selector: 'app-data-table',
  templateUrl: './data-table.component.html',
  styleUrls: ['./data-table.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class DataTableComponent extends DataViewComponent implements OnInit, OnChanges {
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
  finalresult = false;
  initalClassifiation = true;
  cPage = 1;

  columns = [];
  userInput = {};
  tableColor = '#FFFFFF';
  exploreDataCounter = 0;
  labled = [];


  constructor(
    public _crud: CrudService,
    public _toast: ToastService,
    public _route: ActivatedRoute,
    public _router: Router,
    public _types: DbmsTypesService,
    public _settings: WebuiSettingsService,
    public modalService: BsModalService
  ) {
    super( _crud, _toast, _route, _router, _types, _settings, modalService );
  }


  ngOnInit() {

    if (this.config && this.config.update) {
      this.documentListener();
    }

    this.setPagination();

    if (this.config && this.config.create) {
      this.buildInsertObject();
    }

  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['resultSet']) {
      this.setPagination();
      this.buildInsertObject();
    }
  }

  triggerEditing(i) {
    if (this.config.update) {
      this.updateValues.clear();
      this.resultSet.data[i].forEach((v, k) => {
        if (this.resultSet.header[k].dataType === 'bool') {
          this.updateValues.set(this.resultSet.header[k].name, this.getBoolean(v));
        }
        //assign multimedia types: null if the item is NULL, else undefined
        //null items will be submitted and updated, undefined items will not be part of the UPDATE statement
        else if ( this._types.isMultimedia( this.resultSet.header[k].dataType )) {
          if( v === null ){
            this.updateValues.set(this.resultSet.header[k].name, null);
          } else {
            this.updateValues.set(this.resultSet.header[k].name, undefined);
          }
        } else {
          this.updateValues.set(this.resultSet.header[k].name, v);
        }
      });
      this.editing = i;
    }
  }

  // see https://stackoverflow.com/questions/52017809/how-to-convert-string-to-boolean-in-typescript-angular-4
  getBoolean(value: any): Boolean {
    switch (value) {
      case true:
      case 'true':
      case 't':
      case 1:
      case '1':
      case 'on':
      case 'yes':
        return true;
      case 'null':
      case 'NULL':
      case null:
        return null;
      default:
        return false;
    }
  }

  documentListener() {
    const self = this;
    $(document).on('click', function (e) {
      if ($(e.target).parents('.editing').length === 0) {
        //don't close editing row during upload
        if ( self.uploadProgress < 0 ) {
          self.editing = -1;
        }
      }
    });
  }

  buildInsertObject() {
    if (this.config && !this.config.create) {
      return;
    }
    this.insertValues.clear();
    this.insertDirty.clear();
    if (this.resultSet.header) {
      this.resultSet.header.forEach((g, idx) => {
        //set insertDirty
        if (!g.nullable && g.dataType !== 'serial' && g.defaultValue === undefined) {
          //set dirty if not nullable, so it will be submitted, except if it has autoincrement (dataType 'serial') or a default value
          this.insertDirty.set(g.name, true);
        } else {
          this.insertDirty.set(g.name, false);
        }
        //set insertValues
        if (g.nullable) {
          this.insertValues.set(g.name, null);
        } else {
          if (this._types.isNumeric((g.dataType))) {
            this.insertValues.set(g.name, 0);
          } else if (this._types.isBoolean(g.dataType)) {
            this.insertValues.set(g.name, false);
          } else {
            this.insertValues.set(g.name, '');
          }
        }
      });
    }
  }

  inputChange(name: string, e) {
    this.insertValues.set(name, e);
    this.insertDirty.set(name, true);
  }

  insertRow() {
    const formData = new FormData();
    this.insertValues.forEach((v, k) => {
      //only values with dirty state will be submitted. Columns that are not nullable are already set dirty
      if (this.insertDirty.get(k) === true) {
        let value;
        if (isNaN(v)){
          value = v;
        } else {
          value = String(v);
        }
        formData.append( k, value );
      }
    });
    formData.append( 'tableId', String(this.resultSet.table) );
    this.uploadProgress = 100;//show striped progressbar
    this._crud.insertRow(formData).subscribe(
      res => {
        if( res.type && res.type === HttpEventType.UploadProgress ){
          this.uploadProgress = Math.round(100 * res.loaded / res.total);
        } else if( res.type === HttpEventType.Response ) {
          this.uploadProgress = -1;
          const result = <ResultSet>res.body;
          if (result.error) {
            this._toast.exception(result, 'Could not insert the data', 'insert error');
          } else if (result.affectedRows === 1) {
            $('.insert-input').val('');
            this.insertValues.clear();
            this.buildInsertObject();
            this.getTable();
          }
        }
      }, err => {
        this._toast.error('Could not insert the data.');
        console.log(err);
      }
    ).add( () => this.uploadProgress = -1 );
  }

  newUpdateValue(key, val) {
    this.updateValues.set(key, val);
  }

  updateRow(event) {
    event.stopPropagation();
    const oldValues = new Map<string, string>();//previous values
    $('.editing').each(function (e) {
      const oldVal = $(this).attr('data-before');
      const col = $(this).attr('data-col');
      if (col !== undefined) {
        oldValues.set(col, oldVal);
      }
    });
    const formData = new FormData();
    formData.append( 'tableId', this.resultSet.table);
    formData.append('oldValues', JSON.stringify(this.mapToObject(oldValues)));
    for( const [k,v] of this.updateValues ) {
      if( v === undefined ){
        //don't add undefined file inputs, but if they are null, they need to be added
        continue;
      }
      if( !(v instanceof File) ){
        //stringify to distinguish between null and 'null'
        formData.append( k, JSON.stringify(v) );
      } else {
        formData.append( k, v );
      }
    }
    this.uploadProgress = 100;//show striped progressbar
    //const req = new UpdateRequest(this.resultSet.table, this.mapToObject(this.updateValues), this.mapToObject(oldValues));
    this._crud.updateRow(formData).subscribe(
      res => {
        if( res.type && res.type === HttpEventType.UploadProgress ){
          this.uploadProgress = Math.round(100 * res.loaded / res.total);
        } else if( res.type === HttpEventType.Response ) {
          this.uploadProgress = -1;
          const result = <ResultSet>res.body;
          if (result.affectedRows) {
            this.getTable();
            let rows = ' rows';
            if (result.affectedRows === 1) {
              rows = ' row';
            }
            this._toast.success('Updated ' + result.affectedRows + rows, result.generatedQuery, 'update', ToastDuration.SHORT);
          } else if (result.error) {
            this._toast.warn('Could not update this row: ' + result.error);
          }
        }
      }, err => {
        this._toast.error('Could not update the data.');
        console.log(err);
      }
    ).add( () => this.uploadProgress = -1 );
  }


  /**
   * Pagination for Explore-by-Example
   */
  getExploreTables() {

    if (this.isExploringData) {
      this.prepareClassifiedData();
    }
    const savedResultHead = this.resultSet.header;
    this._crud.getExploreTables(new ExploreTable(this.resultSet.explorerId, this.resultSet.header, this.resultSet.currentPage)).subscribe(
      res => {
        const result = <ResultSet>res;

        if (result.includesClassificationInfo) {
          this.userInput = {};
          this.prepareUserInput(result.classifiedData);
        }
        this.resultSet.header = savedResultHead;
        this.resultSet.data = result.data;
        this.resultSet.generatedQuery = result.generatedQuery;
        this.resultSet.affectedRows = result.affectedRows;
        this.resultSet.highestPage = result.highestPage;

        //go to highest page if you are "lost" (if you are on a page that is higher than the highest possible page)
        if (+this._route.snapshot.paramMap.get('page') > this.resultSet.highestPage) {
          this._router.navigate(['/views/data-table/' + this.tableId + '/' + this.resultSet.highestPage]);
        }
        this.setPagination();
        this.editing = -1;
        if (result.type === 'TABLE') {
          this.config.create = true;
          this.config.update = true;
          this.config.delete = true;
        } else {
          this.config.create = false;
          this.config.update = false;
          this.config.delete = false;
        }

      }, err => {
        this._toast.error('Could not load the data.');
        console.log(err);
      }
    );
  }

  filterTable(e, filterVal, col: DbColumn) {
    this.resultSet.currentPage = 1;
    if (e.keyCode === 27) { //esc
      $('.table-filter').val('');
      this.filter.clear();
      this.getTable();
      return;
    }
    if (col.collectionsType || col.dataType.includes('ARRAY')) {
      if (this.isValidArray(filterVal) || !filterVal) {
        this.filter.set(col.name, filterVal);
      }
    } else {
      this.filter.set(col.name, filterVal);
    }
    this.getTable();
  }

  paginate(p: PaginationElement) {
    this.resultSet.currentPage = p.page;
    if (this.config.exploring) {
      this.getExploreTables();
    } else {
      this.getTable();
    }
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
    this.getTable();
  }

  /**
   * Reset button within Explore-by-Example, resets actual Pagination Page
   */
  resetExporationData() {
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

  isValidFilter(val, col: DbColumn) {
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
  sendClassificationData() {
    this.prepareClassifiedData();
    this._crud.exploreUserInput(new Exploration(this.exploreId, this.resultSet.header, this.classifiedData)).subscribe(
      res => {
        this._toast.success('Classification successful');
        this.initalClassifiation = false;
        this.finalresult = false;
        if (this.tutorialMode) {
          this.openTutorial(this.tutorial);
        }
        this.exploreSet = <ExploreSet>res;
        this.exploreId = this.resultSet.explorerId;
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


      }, err => {
        this._toast.error(('Classification Failed'));
        console.log(err);

      }
    );
  }

  exploreData() {
    this.isExploringData = true;
    this.cData = cloneDeep(this.resultSet.data);
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
  }


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
  sendChosenCols() {
    this._crud.classifyData(new ClassifyRequest(this.exploreId, this.resultSet.header, this.classifiedData, this.cPage)).subscribe(
      res => {
        this._toast.success('Final Result');
        this.finalresult = true;
        this.userInput = {};
        this.classifiedData = [];
        this.resultSet = <ResultSet>res;
        this.exploreId = this.resultSet.explorerId;
        if (this.resultSet.generatedQuery) {
          this.createdSQL = this.resultSet.generatedQuery;
        }
        this.setPagination();
      }, err => {
        this._toast.error(('Error showing final Result'));
        console.log(err);
      }
    );
  }


  async startClassification() {
    await this.exploreData();
    this.sendClassificationData();
  }

  getSelected() {
    const values = Object.values(this.userInput);
    return values.filter((el, i, a) => {
      return el !== '?';
    }).length;
  }

  displayRowItem ( data: string, col: DbColumn ) {
    if( data == null ) {
      return '';
    } else if ( !col ) {
      return data;
    } else {
      if( data.length > 1000 ) {
        return data.slice(0, 1000) + '...';
      }
    }
    return data;
  }

  getTooltip ( col: DbColumn ): string {
    if( !col ) {
      return '';
    }
    let out = 'name: ' + col.name;
    out += '\ntype: ' + col.dataType;
    if( col.collectionsType ){
      out += '\ncollection: ' + col.collectionsType;
    }
    if( col.primary ){
      out += '\nprimary';
    }
    if( col.unique ){
      out += '\nunique: ' + col.unique;
    }
    if( col.nullable ){
      out += '\nnullable: ' + col.nullable;
    }
    if( col.defaultValue ){
      out += '\ndefaultValue: ' + col.defaultValue;
    }

    if( col.precision ){
      out += '\nprecision: ' + col.precision;
    }
    if( col.scale ){
      out += '\nscale: ' + col.scale;
    }
    if( col.dimension ){
      out += '\ndimension: ' + col.dimension;
    }
    if( col.cardinality ){
      out += '\ncardinality: ' + col.cardinality;
    }
    return out;
  }

  /**
   * returns true if a columns can be ordered
   */
  canOrder( col: DbColumn ) {
    return !this._types.isMultimedia(col.dataType) && !col.collectionsType;
  }

}
