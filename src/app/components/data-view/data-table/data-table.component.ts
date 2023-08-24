import {Component, EventEmitter, Input, OnInit, Output, TemplateRef, ViewChild, ViewEncapsulation} from '@angular/core';
import * as $ from 'jquery';
import {cloneDeep} from 'lodash';
import {ClassifyRequest, Exploration, ExploreTable} from '../../../models/ui-request.model';
import {PaginationElement} from '../models/pagination-element.model';
import {ExploreSet, RelationalExploreResult, RelationalResult, UiColumnDefinition} from '../models/result-set.model';
import {SortDirection, SortState} from '../models/sort-state.model';
import {ToastDuration, ToasterService} from '../../toast-exposer/toaster.service';
import {CrudService} from '../../../services/crud.service';
import {ActivatedRoute, Router} from '@angular/router';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import * as dot from 'graphlib-dot';
import * as dagreD3 from 'dagre-d3';
import * as d3 from 'd3';
import {BsModalRef, BsModalService} from 'ngx-bootstrap/modal';
import {DataViewComponent} from '../data-view.component';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {LeftSidebarService} from '../../left-sidebar/left-sidebar.service';
import {CatalogService} from '../../../services/catalog.service';


@Component({
    selector: 'app-data-table',
    templateUrl: './data-table.component.html',
    styleUrls: ['./data-table.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class DataTableComponent extends DataViewComponent implements OnInit {

    constructor(
        public _crud: CrudService,
        public _toast: ToasterService,
        public _route: ActivatedRoute,
        public _router: Router,
        public _types: DbmsTypesService,
        public _settings: WebuiSettingsService,
        public _sidebar: LeftSidebarService,
        public modalService: BsModalService,
        public _catalog: CatalogService
    ) {
        super(_crud, _toast, _route, _router, _types, _settings, _sidebar, _catalog, modalService);
        this.initWebsocket();
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
    finalresult = false;
    initalClassifiation = true;
    cPage = 1;
    viewName = 'viewName';

    columns = [];
    userInput = {};
    tableColor = '#FFFFFF';
    exploreDataCounter = 0;
    labled = [];

    @Output() showViewExploring = new EventEmitter();

    protected readonly RelationalExploreResult = RelationalExploreResult;


    ngOnInit() {

        if (this.config && this.config.update) {
            this.documentListener();
        }

        this.setPagination();

        if (this.config && this.config.create) {
            this.buildInsertObject();
        }

    }

    /**
     * Pagination for Explore-by-Example
     */
    getExploreTables() {

        if (this.isExploringData) {
            this.prepareClassifiedData();
        }
        const savedResultHead = this.resultSet.header;
        this._crud.getExploreTables(new ExploreTable(this.asExploreResult(this.resultSet).explorerId, this.resultSet.header, this.resultSet.currentPage)).subscribe(
            res => {
                const result = <RelationalResult>res;

                if (this.asExploreResult(this.resultSet).includesClassificationInfo) {
                    this.userInput = {};
                    this.prepareUserInput(this.asExploreResult(this.resultSet).classifiedData);
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

    filterTable(e, filterVal, col: UiColumnDefinition) {
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
        this.focusId = 'search-' + col.name;
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
    sendClassificationData() {
        this.prepareClassifiedData();
        this._crud.exploreUserInput(new Exploration(this.exploreId, this.resultSet.header, this.classifiedData)).subscribe(
            res => {
                //this._toast.success('Classification successful');
                this.initalClassifiation = false;
                this.finalresult = false;
                if (this.tutorialMode) {
                    this.openTutorial(this.tutorial);
                }
                this.exploreSet = <ExploreSet>res;
                this.exploreId = this.asExploreResult(this.resultSet).explorerId;
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
                //this._toast.success('Final Result');
                this.finalresult = true;
                this.userInput = {};
                this.classifiedData = [];
                this.resultSet = <RelationalResult>res;
                this.exploreId = this.asExploreResult(this.resultSet).explorerId;
                if (this.resultSet.generatedQuery) {
                    this.createdSQL = this.resultSet.generatedQuery;
                }
                this.setPagination();
                this.showViewExploring.emit(true);
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


    createViewButton(createViewExample) {
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

        if (this.tables.value.filter((t) => t.name === this.newViewName).length > 0) {
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

    asExploreResult(resultSet: RelationalResult) {
        return <RelationalExploreResult>resultSet;
    }
}
