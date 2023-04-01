import {AfterViewInit, Component, OnDestroy, OnInit, TemplateRef, ViewChild, ViewEncapsulation} from '@angular/core';
import * as $ from 'jquery';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/widgets/sortable';
import 'jquery-ui/ui/widgets/draggable';
import {CrudService} from '../../../services/crud.service';
import {FilteredUserInput, ResultSet} from '../../../components/data-view/models/result-set.model';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ToastService} from '../../../components/toast/toast.service';
import {DataModels, EditTableRequest, QueryRequest, SchemaRequest} from '../../../models/ui-request.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {ForeignKey, Uml} from '../../uml/uml.model';
import {Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {WebSocket} from '../../../services/webSocket';
import {BsModalRef, BsModalService} from 'ngx-bootstrap/modal';
import {ViewInformation} from '../../../components/data-view/data-view.component';
// new import added to extent graph
import {TableConfig} from '../../../components/data-view/data-table/table-config';
import * as d3 from 'd3';


@Component({
    selector: 'app-graphical-querying',
    templateUrl: './graphical-querying.component.html',
    styleUrls: ['./graphical-querying.component.scss'],
    encapsulation: ViewEncapsulation.None, // new elements in sortable should have margin as well

})
export class GraphicalQueryingComponent implements OnInit, AfterViewInit, OnDestroy {

    @ViewChild('editorGenerated', {static: false}) editorGenerated;
    @ViewChild('createViewModal', {static: false}) public createViewModal: TemplateRef<any>;
    generatedSQL;
    resultSet: ResultSet;
    selectedColumn = {};
    loading = false;
    modalRefCreateView: BsModalRef;
    whereCounter = 0;
    orderByCounter = 0;
    andCounter = 0;
    filteredUserSet: FilteredUserInput;
    private subscriptions = new Subscription();
    private readonly webSocket: WebSocket;

    //fields for the graphical query generation
    schemas = new Map<string, string>();//schemaName, schemaName
    tables = new Map<string, number>();//tableName, number of columns of this table
    columns = new Map<string, SidebarNode>();//columnId, columnName
    umlData = new Map<string, Uml>();//schemaName, uml
    joinConditions = new Map<string, JoinCondition>();
    showCreateView = false;
    viewEditorCode = '';

    constructor(
        private _crud: CrudService,
        private _leftSidebar: LeftSidebarService,
        private _toast: ToastService,
        private _router: Router,
        private _settings: WebuiSettingsService,
        public modalService: BsModalService
    ) {
        this.webSocket = new WebSocket(_settings);
        this.initWebSocket();
    }

    // new additions by me:

    nodeLabels: string[] = ['Movie', 'Person', 'Character']; //Hardcoded for the moment
    relationLabels: string[] = ['DIRECTED_BY', 'HAS_ACTOR', 'PLAYS']; //Hardcoded for the moment
    lang: string; // usage as lang in console.component.hmtl 'sql', 'cypher', 'mql'
    tableId: string;
    config: TableConfig;
    // cypher input fields
    cypherFields: string[][] = [[]]; // Matrix à [n,5] size  -> [1] = Relationship, [2] = Node, [3] = 2.Relationship, [4] = 2.Node

    cypherNode: string[][][] = [[[]]];

    cypherNode2: string[][][] = [[[]]];

    cypherNode3: string[][][] = [[[]]];

    cypherRel: string[][][] = [[[]]];

    cypherRel2: string[][][] = [[[]]];
    cypherReturnDrop: string[] = [''];
    cypherReturnProp: string[] = [''];
    cypherReturn2: string[] = [''];

    returnDropdown: string[] = [''];
    cypherDropdown: string[] = [];
    fieldListCypher: string[] = ['MATCH'];

    fieldListCypherNode: string[][] = [['NODE']];

    fieldListCypherNode2: string[][] = [['NODE']];

    fieldListCypherNode3: string[][] = [['NODE']];

    fieldListCypherRel2: string[][] = [['NODE']];

    fieldListCypherRel: string[][] = [['NODE']];
    fieldList: string[] = ['0'];
    fieldListMATCH: string[] = ['0'];
    fieldListGROUP: string[] = ['0'];
    fieldListSORT: string[] = ['0'];
    fieldDepthCounter = 0;
    fieldDepthCounterMATCH = 0;
    fieldDepthCounterGROUP = 0;
    fieldDepthCounterSORT = 0;
    logicalDepthCounter = 0;
    logicalDepthCounterMATCH = 0;
    // mql input fields
    mqlFields: any[][] = [['','','','',0,0]]; //mqlText1 = 0, mqlDropdown = 1, mqlText2 = 3, mqlTextX = 4, fieldDepth = 5, logicalDepth = 6

    mqlFieldsMATCH: any[][] = [['','','','',0,0]];
    mqlFieldsGROUP: any[][] = [['_id','','','_id',0,0]];

    mqlFieldsSORT: any[][] = [['','','','',0,0]];
    activeNamespace: string; // same usage as console.components.ts
    collectionName: string;
    collectionName2: string;
    graphName: string;

    logicalOperatorStack: string[] = [];
    logicalOperatorStackMATCH: string[] = [];

    fieldCounter = 0;
    fieldCounterMATCH = 0;
    fieldCounterGROUP = 0;
    fieldCounterSORT = 0;
    private readonly LOCAL_STORAGE_NAMESPACE_KEY = 'polypheny-namespace'; // same usage as console.components.ts

    // Dropdown
    show = false;
    showFIND = false;
    showCypherMatch = false;
    showMATCH = false;
    showGROUP = false;

    showSORT = false;

    show2 = false;
    showFIND2 = false;
    showMATCH2 = false;
    showGROUP2 = false;
    private debounce: any;
    private debounceDelay = 200;

    private initialrect: DOMRect;

    mqlType: string;

    activeMode: string;


  ngOnInit() {
    this._leftSidebar.open();
    this.initSchema(this.lang);
        this.initGraphicalQuerying();
        const sub = this._crud.onReconnection().subscribe(
            b => {
                if (b) {
                    this.initSchema(this.lang);
                }
            }
        );
        this.subscriptions.add(sub);
    }

    ngAfterViewInit() {
        this.generateSQL();
    }

    ngOnDestroy() {
        this._leftSidebar.close();
        // this._leftSidebar.reset();
        this.subscriptions.unsubscribe();
        this.webSocket.close();
    }

    initWebSocket() {
        this.webSocket.onMessage().subscribe(
            res => {
                const result = <ResultSet>res;
                this.resultSet = result[0];
                this.loading = false;
            }, err => {
                this._toast.error('Unknown error on the server.');
                this.loading = false;
            }
        );
    }

    initSchema(lang:string) {
        console.log(lang);
        if (lang === 'sql') {
            this._crud.getSchema(new SchemaRequest('views/graphical-querying/', true, 3, false, false )).subscribe(
                res => {
                    const nodeAction = (tree, node, $event) => {
                        if (!node.isActive && node.isLeaf) {
                            this.addCol(node.data);
                            node.setIsActive(true, true);
                        } else if (node.isActive && node.isLeaf) {
                            node.setIsActive(false, true);
                            this.removeCol(node.data.id);
                            //deletes the selection if nothing is choosen
                            if (this.selectedColumn['column'].toString() === node.data.id) {
                                this.selectedCol([]);
                            }
                        }
                    };
                    const schemaTemp = <SidebarNode[]>res;
                    const schema = [];
                    for (const s of schemaTemp) {
                        const node = SidebarNode.fromJson(s, {allowRouting: false, autoActive: false, action: nodeAction});
                        schema.push(node);
                    }
                    this._leftSidebar.setNodes(schema);
                    this._leftSidebar.open();
                }
            );
        }
        else if (lang === 'cypher') {
            this._crud.getSchema(new SchemaRequest('views/graphical-querying/', true, 1, false, false)).subscribe(
                res => {
                    const nodeAction = (tree, node, $event) => {
                        console.log(node.id);
                        this.graphName = node.id;
                        this.setDefaultDB(node.id); //changes the activeNamespace to the one chosen on the left side
                    };
                    const schemaTemp = <SidebarNode[]>res;
                    const schema = [];
                    for (const s of schemaTemp) {
                        const node = SidebarNode.fromJson(s, {allowRouting: false, autoActive: false, action: nodeAction});
                        schema.push(node);
                    }
                    this._leftSidebar.setNodes(schema);
                    this._leftSidebar.open();
                }
            );
        }
        else if (lang === 'mql') {
            this._crud.getSchema(new SchemaRequest('views/graphical-querying/', true, 2, false, false)).subscribe(
                res => {
                    const nodeAction = (tree, node, $event) => {
                        if (!node.isActive && node.isLeaf) {
                            this.setDefaultDB(node.parent.id);
                            this.collectionName = node.displayField;
                            this.collectionName2 = node.id;
                        }
                    };
                    const schemaTemp = <SidebarNode[]>res;
                    const schema = [];
                    for (const s of schemaTemp) {
                        const node = SidebarNode.fromJson(s, {allowRouting: false, autoActive: false, action: nodeAction});
                        schema.push(node);
                    }
                    this._leftSidebar.setNodes(schema);
                    this._leftSidebar.open();
                }
            );
        }
    }

    initGraphicalQuerying() {
        const self = this;

        $('#selectBox').sortable({
            stop: function (e, ui) {
                self.generateSQL();
            },
            cursor: 'grabbing',
            containment: 'parent',
            tolerance: 'pointer'
        });

        $('#selectBox').on('click', 'div span.del', function () {
            const id = $(this).parent().attr('data-id');
            self.removeCol(id);

            //deletes the selection if nothing is choosen
            if (self.selectedColumn['column'].toString() === id) {
                self.selectedCol([]);
            }
        });
    }

    removeCol(colId: string) {
        const data = colId.split('.');
        const tableId = data[0] + '.' + data[1];
        const tableCounter = this.tables.get(tableId);
        if (tableCounter === 1) {
            this.tables.delete(tableId);
        } else {
            this.tables.set(tableId, tableCounter - 1);
        }
        this.columns.delete(colId);

        $(`#selectBox [data-id="${colId}"]`).remove();
        this._leftSidebar.setInactive(colId);
        this.generateJoinConditions(); // re-generate join conditions
        this.generateSQL();
    }

    userInput(fSet: Object) {
        if (fSet instanceof FilteredUserInput) {
            this.filteredUserSet = fSet;
        }
        this.generateSQL();
    }

    checkboxMultipAlphabetic(col: string, checked: [string]) {
        const checkbox = [];
        checked.forEach(val => {
            checkbox.push('\'' + val.replace('check', '') + '\'');
        });
        if (checkbox.length > 1) {
            return (this.connectWheres() + col + ' IN (' + checkbox + ')');
        } else {
            return (this.connectWheres() + col + ' = ' + checkbox);
        }

    }

    checkboxMultipNumeric(col: string, checked: [string]) {
        const checkbox = [];
        checked.forEach(val => {
            checkbox.push(val.replace('check', ''));
        });
        if (checkbox.length > 1) {
            return (this.connectWheres() + col + ' IN (' + checkbox + ')');
        } else {
            return (this.connectWheres() + col + ' = ' + checkbox);
        }
    }

    minMax(col: string, minMax) {
        return (this.connectWheres() + col + ' BETWEEN ' + minMax[0] + ' AND ' + minMax[1]);
    }

    startingWith(col: string, firstLetters: string) {
        if (firstLetters.includes('*')) {
            return (this.connectWheres() + col + ' LIKE ' + '\'' + firstLetters.replace(new RegExp('\\*', 'g'), '%') + '\'');
        } else {
            return (this.connectWheres() + col + ' LIKE ' + '\'' + firstLetters + '\'');
        }

    }

    sorting(col: string, sort: string) {
        return (this.connectOrderby() + col + ' ' + sort);
    }

    sortingAggregate(col: string, sort: string, aggregate: string) {
        return (this.connectOrderby() + aggregate + '(' + col + ') ' + sort);
    }

    /**
     * adds everything selected in the filterset to two arrays in order to add in the generated query
     */
    processfilterSet() {
        const whereSql = [];
        const orderBySql = [];
        const groupBy = [];
        let flag = false;
        const checkboxSQLAlphabetic = {};
        const checkboxSQLNumerical = {};
        if (this.filteredUserSet) {
            Object.keys(this.filteredUserSet).forEach(col => {
                const el = this.filteredUserSet[col];
                if (this.selectedColumn['column'].includes(col)) {

                    if (el['minMax']) {
                        if (!(el['minMax'].toString() === el['startMinMax'].toString())) {
                            whereSql.push(this.minMax(this.wrapInParetheses(col), el['minMax']));
                        }
                    }

                    if (el['startsWith']) {
                        whereSql.push(this.startingWith(this.wrapInParetheses(col), el['startsWith']));
                    }

                    if (el['sorting'] && (el['sorting'] === 'ASC' || el['sorting'] === 'DESC')) {
                        if (el['aggregate'] && !(el['aggregate'] === 'OFF')) {
                            orderBySql.push(this.sortingAggregate(this.wrapInParetheses(col), el['sorting'], el['aggregate']));
                        } else {
                            orderBySql.push(this.sorting(this.wrapInParetheses(col), el['sorting']));
                        }

                    }

                    if (!el['aggregate'] || el['aggregate'] === 'OFF') {
                        if (!groupBy || !groupBy.length) {
                            groupBy.push('\nGROUP BY ' + this.wrapInParetheses(col));
                        } else {
                            groupBy.push(' , ' + this.wrapInParetheses(col));
                        }
                    }

                    if (el['aggregate'] && !(el['aggregate'] === 'OFF')) {
                        flag = true;
                    }

                    Object.keys(el).forEach(k => {
                        if (k.startsWith('check', 0) && el['columnType'] === 'alphabetic') {
                            //whereSql.push(this.checkboxAlphabetic(col, k, el[k]));
                            if (el[k]) {
                                if (checkboxSQLAlphabetic[col]) {
                                    checkboxSQLAlphabetic[col].push(k);
                                } else {
                                    checkboxSQLAlphabetic[col] = [k];
                                }
                            }
                        }
                        if (k.startsWith('check', 0) && el['columnType'] === 'numeric') {
                            //whereSql.push(this.checkboxNumeric(col, k, el[k]));
                            if (el[k]) {
                                if (checkboxSQLNumerical[col]) {
                                    checkboxSQLNumerical[col].push(k);
                                } else {
                                    checkboxSQLNumerical[col] = [k];
                                }
                            }
                        }

                        if (k.startsWith('check', 0) && el['columnType'] === 'temporal') {
                            //whereSql.push(this.checkboxNumeric(col, k, el[k]));
                            if (el[k]) {
                                if (checkboxSQLNumerical[col]) {
                                    checkboxSQLNumerical[col].push(`'${k}'`);
                                } else {
                                    checkboxSQLNumerical[col] = [`'${k}'`];
                                }
                            }
                        }

                    });
                }
            });
            if (checkboxSQLAlphabetic) {
                Object.keys(checkboxSQLAlphabetic).forEach(col => {
                    whereSql.push(this.checkboxMultipAlphabetic(this.wrapInParetheses(col), checkboxSQLAlphabetic[col]));
                });
            }
            if (checkboxSQLNumerical) {
                Object.keys(checkboxSQLNumerical).forEach(col => {
                    whereSql.push(this.checkboxMultipNumeric(this.wrapInParetheses(col), checkboxSQLNumerical[col]));
                });
            }
            if (flag) {
                return (whereSql.join('') + groupBy.join('') + orderBySql.join(''));
            } else {
                return (whereSql.join('') + orderBySql.join(''));
            }
        } else {
            return '';
        }
    }

    wrapInParetheses(k) {
        return '"' + k.split('.').join('"."') + '"';
    }

    onCloseModal() {
        this.activeMode = undefined;
    }


    setDefaultState(inputlang: string) { //sets the field values to zero if the user switches languages
        switch (inputlang) {
            case 'sql':
                this.collectionName = undefined;
                this.collectionName2 = undefined;
                this.graphName = undefined;
                //mql
                this.mqlFields = [['','','','',0,0]];
                this.mqlFieldsMATCH = [['','','','',0,0]];
                this.mqlFieldsGROUP = [['_id','','','_id',0,0]];
                this.mqlFieldsSORT = [['','','','',0,0]];
                this.fieldCounter = 0;
                this.logicalOperatorStack = [];
                this.fieldList = ['0'];
                this.fieldDepthCounter = 0;
                this.logicalDepthCounter = 0;
                this.fieldCounterMATCH = 0;
                this.logicalOperatorStackMATCH = [];
                this.fieldListMATCH = ['0'];
                this.fieldDepthCounterMATCH = 0;
                this.logicalDepthCounterMATCH = 0;
                this.fieldCounterGROUP = 0;
                this.fieldListGROUP = ['0'];
                this.fieldDepthCounterGROUP = 0;
                this.fieldCounterSORT = 0;
                this.fieldListSORT = ['0'];
                this.fieldDepthCounterSORT = 0;
                //cypher
                this.cypherFields = [[]];
                this.cypherNode = [[[]]];
                this.cypherNode2 = [[[]]];
                this.cypherNode3 = [[[]]];
                this.cypherRel = [[[]]];
                this.cypherRel2 = [[[]]];
                this.cypherReturnProp = [''];
                this.cypherReturnDrop = [''];
                this.cypherReturn2 = [''];
                this.fieldListCypher = ['MATCH'];
                this.fieldListCypherNode = [['NODE']];
                this.fieldListCypherNode2 = [['NODE']];
                this.fieldListCypherNode3 = [['NODE']];
                this.fieldListCypherRel2 = [['NODE']];
                this.fieldListCypherRel = [['NODE']];
                break;
            case 'cypher':
                this.collectionName = undefined;
                this.collectionName2 = undefined;
                this.mqlFields = [['','','','',0,0]];
                this.mqlFieldsMATCH = [['','','','',0,0]];
                this.mqlFieldsGROUP = [['_id','','','_id',0,0]];
                this.mqlFieldsSORT = [['','','','',0,0]];
                this.fieldCounter = 0;
                this.logicalOperatorStack = [];
                this.fieldList = ['0'];
                this.fieldDepthCounter = 0;
                this.logicalDepthCounter = 0;
                this.fieldCounterMATCH = 0;
                this.logicalOperatorStackMATCH = [];
                this.fieldListMATCH = ['0'];
                this.fieldDepthCounterMATCH = 0;
                this.logicalDepthCounterMATCH = 0;
                this.fieldCounterGROUP = 0;
                this.fieldListGROUP = ['0'];
                this.fieldDepthCounterGROUP = 0;
                this.fieldCounterSORT = 0;
                this.fieldListSORT = ['0'];
                this.fieldDepthCounterSORT = 0;
                break;
            case 'mql':
                this.graphName = undefined;
                this.cypherFields = [[]];
                this.cypherNode = [[[]]];
                this.cypherNode2 = [[[]]];
                this.cypherNode3 = [[[]]];
                this.cypherReturnProp = [''];
                this.cypherReturnDrop = [''];
                this.cypherReturn2 = [''];
                this.fieldListCypher = ['MATCH'];
                this.fieldListCypherNode = [['NODE']];
                this.fieldListCypherNode2 = [['NODE']];
                this.fieldListCypherNode3 = [['NODE']];
                this.fieldListCypherRel2 = [['NODE']];
                this.fieldListCypherRel = [['NODE']];
                break;
        }
    }

    // inspired by the same function in console.component.ts
    private setDefaultDB(name: string) {
        name = name.trim();
        this.activeNamespace = name;
        localStorage.setItem(this.LOCAL_STORAGE_NAMESPACE_KEY, name);
    }

    //taken from json-editor.component.ts
    setMenuShow(doShow: boolean, instant = false, mqlCase: string) {
        switch (mqlCase) {
            case 'Cypher':
                if (instant) {
                    this.show = doShow;
                    return;
                }
                if (!doShow) {
                    this.debounce = setTimeout(() => {
                        this.show = false;
                    }, this.debounceDelay);
                } else {
                    this.show = true;
                }
                break;
            case 'CypherMatch':
                if (instant) {
                    this.showCypherMatch = doShow;
                    return;
                }
                if (!doShow) {
                    this.debounce = setTimeout(() => {
                        this.showCypherMatch = false;
                    }, this.debounceDelay);
                } else {
                    this.showCypherMatch = true;
                }
                break;
            case 'Find':
                if (instant) {
                    this.showFIND = doShow;
                    return;
                }
                if (!doShow) {
                    this.debounce = setTimeout(() => {
                        this.showFIND = false;
                    }, this.debounceDelay);
                } else {
                    this.showFIND = true;
                }
                break;
            case 'Aggr1':
                if (instant) {
                    this.showMATCH = doShow;
                    return;
                }
                if (!doShow) {
                    this.debounce = setTimeout(() => {
                        this.showMATCH = false;
                    }, this.debounceDelay);
                } else {
                    this.showMATCH = true;
                }
                break;
            case 'Aggr2':
                if (instant) {
                    this.showGROUP = doShow;
                    return;
                }
                if (!doShow) {
                    this.debounce = setTimeout(() => {
                        this.showGROUP = false;
                    }, this.debounceDelay);
                } else {
                    this.showGROUP = true;
                }
                break;
            case 'Aggr3':
                if (instant) {
                    this.showSORT = doShow;
                    return;
                }
                if (!doShow) {
                    this.debounce = setTimeout(() => {
                        this.showSORT = false;
                    }, this.debounceDelay);
                } else {
                    this.showSORT = true;
                }
                break;
        }
    }

    //taken from json-editor.component.ts
    menuEnter(mqlCase: string) {
        switch (mqlCase) {
            case 'Cypher':
                if (this.show) {
                    clearTimeout(this.debounce);
                }
                break;
            case 'Find':
                if (this.showFIND) {
                    clearTimeout(this.debounce);
                }
                break;
            case 'Aggr1':
                if (this.showMATCH) {
                    clearTimeout(this.debounce);
                }
                break;
            case 'Aggr2':
                if (this.showGROUP) {
                    clearTimeout(this.debounce);
                }
                break;
            case 'Aggr3':
                if (this.showSORT) {
                    clearTimeout(this.debounce);
                }
                break;
        }
    }

    setMenuShow2(doShow: boolean, instant = false, mqlCase: string) {
        switch (mqlCase) {
            case 'Find':
                if (instant) {
                    this.showFIND2 = doShow;
                    return;
                }
                if (!doShow) {
                    this.debounce = setTimeout(() => {
                        this.showFIND2 = false;
                    }, this.debounceDelay);
                } else {
                    this.showFIND2 = true;
                }
            break;
            case 'Aggr1':
                if (instant) {
                    this.showMATCH2 = doShow;
                    return;
                }
                if (!doShow) {
                    this.debounce = setTimeout(() => {
                        this.showMATCH2 = false;
                    }, this.debounceDelay);
                } else {
                    this.showMATCH2 = true;
                }
                break;
        }
    }

    //taken from json-editor.component.ts
    menuEnter2(mqlCase: string) {
        switch (mqlCase) {
            case 'Find':
                if (this.showFIND2) {
                    clearTimeout(this.debounce);
                }
                break;
            case 'Aggr1':
                if (this.showMATCH2) {
                    clearTimeout(this.debounce);
                }
                break;
        }

    }

    //drag and drop for cypher labels
    drag(event: any) {
        event.dataTransfer.setData('text/plain', event.target.innerText);
    }

    //drag and drop for mql rows
    onDragStart(event: DragEvent, str: string) {
        event.dataTransfer?.setData('text/plain', str);
        const targetElement = event.currentTarget as HTMLElement;
        this.initialrect = targetElement.getBoundingClientRect();
    }

    onDragOver(event: DragEvent) {
        event.preventDefault();
    }

    onDrop(event: DragEvent, mqlCase: string) {
        event.preventDefault();
        const data = event.dataTransfer?.getData('text/plain');
        switch (mqlCase) {
            case 'Find':
                if (data) {
                    const index = this.fieldList.indexOf(data);
                    const targetElement = event.currentTarget as HTMLElement;
                    setTimeout(() => {
                        const rect = targetElement.getBoundingClientRect();
                        const mouseY = rect.top - this.initialrect.top;
                        const targetIndex = Math.round(mouseY / rect.height) + index;
                        if (index !== -1 && targetIndex !== -1 && index !== targetIndex) {
                            this.fieldList.splice(targetIndex, 0, this.fieldList.splice(index, 1)[0]);
                            this.mqlFields.splice(targetIndex, 0, this.mqlFields.splice(index, 1)[0]);
                            // Logical Operators
                            this.logicalOperatorStack.splice(targetIndex, 0, this.logicalOperatorStack.splice(index, 1)[0]);
                        }
                    }, 0);
                }
                this.generateMQL();
                break;
            case 'Aggr1':
                if (data) {
                    const index = this.fieldListMATCH.indexOf(data);
                    const targetElement = event.currentTarget as HTMLElement;
                    setTimeout(() => {
                        const rect = targetElement.getBoundingClientRect();
                        const mouseY = rect.top - this.initialrect.top;
                        const targetIndex = Math.round(mouseY / rect.height) + index;
                        if (index !== -1 && targetIndex !== -1 && index !== targetIndex) {
                            this.fieldListMATCH.splice(targetIndex, 0, this.fieldListMATCH.splice(index, 1)[0]);
                            this.mqlFieldsMATCH.splice(targetIndex, 0, this.mqlFieldsMATCH.splice(index, 1)[0]);
                            // Logical Operators
                            this.logicalOperatorStackMATCH.splice(targetIndex, 0, this.logicalOperatorStackMATCH.splice(index, 1)[0]);
                        }
                    }, 0);
                }
                this.generateMQL();
                break;
            case 'Aggr2':
                if (data) {
                    const index = this.fieldListGROUP.indexOf(data);
                    const targetElement = event.currentTarget as HTMLElement;
                    setTimeout(() => {
                        const rect = targetElement.getBoundingClientRect();
                        const mouseY = rect.top - this.initialrect.top;
                        const targetIndex = Math.round(mouseY / rect.height) + index;
                        if (index !== -1 && targetIndex !== -1 && index !== targetIndex) {
                            this.fieldListGROUP.splice(targetIndex, 0, this.fieldListGROUP.splice(index, 1)[0]);
                            this.mqlFieldsGROUP.splice(targetIndex, 0, this.mqlFieldsGROUP.splice(index, 1)[0]);
                            // Logical Operators
                        }
                    }, 0);
                }
                this.generateMQL();
                break;
            case 'Aggr3':
                if (data) {
                    const index = this.fieldListSORT.indexOf(data);
                    const targetElement = event.currentTarget as HTMLElement;
                    setTimeout(() => {
                        const rect = targetElement.getBoundingClientRect();
                        const mouseY = rect.top - this.initialrect.top;
                        const targetIndex = Math.round(mouseY / rect.height) + index;
                        if (index !== -1 && targetIndex !== -1 && index !== targetIndex) {
                            this.fieldListSORT.splice(targetIndex, 0, this.fieldListSORT.splice(index, 1)[0]);
                            this.mqlFieldsSORT.splice(targetIndex, 0, this.mqlFieldsSORT.splice(index, 1)[0]);
                            // Logical Operators
                        }
                    }, 0);
                }
                this.generateMQL();
                break;
        }
    }

    //similiar to data-graph.component.ts

    generateColor(index: number): string {
        const color = d3.interpolateSinebow;
        const ratio = 1 / (this.nodeLabels.length + this.relationLabels.length);
        return color(ratio * index);
    }

    addCypherField(type: string) {
        this.fieldListCypher.push(type);
        this.cypherFields.push([]);
        this.fieldListCypherNode.push(['NODE']);
        this.cypherNode.push([[]]);
        this.fieldListCypherNode2.push(['NODE']);
        this.cypherNode2.push([[]]);
        this.fieldListCypherNode3.push(['NODE']);
        this.cypherNode3.push([[]]);
        this.fieldListCypherRel.push(['NODE']);
        this.cypherRel.push([[]]);
        this.fieldListCypherRel2.push(['NODE']);
        this.cypherRel2.push([[]]);
    }

    addCypherMatchField(index: number, field:number) {
        if (field === 1){
            this.fieldListCypherNode[index].push('PROP');
            this.cypherNode[index].push([]);
        }
        if (field === 2){
            this.fieldListCypherNode2[index].push('PROP');
            this.cypherNode2[index].push([]);
        }
        if (field === 3){
            this.fieldListCypherNode3[index].push('PROP');
            this.cypherNode3[index].push([]);
        }
        if (field === 4){
            this.fieldListCypherRel[index].push('PROP');
            this.cypherRel[index].push([]);
        }
        if (field === 5){
            this.fieldListCypherRel2[index].push('PROP');
            this.cypherRel2[index].push([]);
        }
    }

    changeCypherField(type: string, index: number) {
        if (index + 1 > this.fieldListCypher.length-1) {
            this.fieldListCypher.push(type);
            this.cypherFields.push([]);
        }
        else {
            this.fieldListCypher[index + 1] = type;
        }
    }


    addMQLField(mqlCase: string) { // 'normal new Field'
        switch (mqlCase) {
            case 'Find':
                this.fieldCounter += 1;
                this.fieldList.push(String(this.fieldCounter));
                this.fieldDepthCounter = 0;
                this.mqlFields.push([]);
                this.mqlFields[this.fieldList.length-1][5] = 0; //Key-Object Depth
                this.mqlFields[this.fieldList.length-1][6] = -1; //Logical Operator Depth
                break;
            case 'Aggr1':
                this.fieldCounterMATCH += 1;
                this.fieldListMATCH.push(String(this.fieldCounterMATCH));
                this.fieldDepthCounterMATCH = 0;
                this.mqlFieldsMATCH.push([]);
                this.mqlFieldsMATCH[this.fieldListMATCH.length-1][5] = 0;
                this.mqlFieldsMATCH[this.fieldListMATCH.length-1][6] = -1;
                break;
            case 'Aggr2':
                this.fieldCounterGROUP += 1;
                this.fieldListGROUP.push(String(this.fieldCounterGROUP));
                this.fieldDepthCounterGROUP = 0;
                this.mqlFieldsGROUP.push([]);
                this.mqlFieldsGROUP[this.fieldListGROUP.length-1][5] = 0;
                this.mqlFieldsGROUP[this.fieldListGROUP.length-1][6] = -1;
                break;
            case 'Aggr3':
                this.fieldCounterSORT += 1;
                this.fieldListSORT.push(String(this.fieldCounterSORT));
                this.fieldDepthCounterSORT = 0;
                this.mqlFieldsSORT.push([]);
                this.mqlFieldsSORT[this.fieldListSORT.length-1][5] = 0;
                this.mqlFieldsSORT[this.fieldListSORT.length-1][6] = -1;
                break;
        }
    }

    addMQLFieldKeyObject(mqlCase: string) { // adding a property
        switch (mqlCase) {
            case 'Find':
                this.mqlFields[this.fieldCounter][1] = undefined;// deleting equal from field before
                this.fieldCounter += 1;
                this.fieldDepthCounter += 1;
                this.fieldList.push(String(this.fieldCounter)); //adding addition marker to fieldList
                this.mqlFields.push([]);
                this.mqlFields[this.fieldList.length-1][5] = this.fieldDepthCounter; //Key-Object Depth
                this.mqlFields[this.fieldList.length-1][6] = -1; //Logical Operator Depth
                break;
            case 'Aggr1':
                this.mqlFieldsMATCH[this.fieldCounterMATCH][1] = undefined;
                this.fieldCounterMATCH += 1;
                this.fieldDepthCounterMATCH += 1;
                this.fieldListMATCH.push(String(this.fieldCounterMATCH));
                this.mqlFieldsMATCH.push([]);
                this.mqlFieldsMATCH[this.fieldListMATCH.length-1][5] = this.fieldDepthCounterMATCH;
                this.mqlFieldsMATCH[this.fieldListMATCH.length-1][6] = -1;
                break;
            case 'Aggr2':
                this.mqlFieldsGROUP[this.fieldCounterGROUP][1] = undefined;
                this.fieldCounterGROUP += 1;
                this.fieldDepthCounterGROUP += 1;
                this.fieldListGROUP.push(String(this.fieldCounterGROUP));
                this.mqlFieldsGROUP.push([]);
                this.mqlFieldsGROUP[this.fieldListGROUP.length-1][5] = this.fieldDepthCounterGROUP;
                this.mqlFieldsGROUP[this.fieldListGROUP.length-1][6] = -1;
                break;
            case 'Aggr3':
                this.mqlFieldsSORT[this.fieldCounterSORT][1] = undefined;
                this.fieldCounterSORT += 1;
                this.fieldDepthCounterSORT += 1;
                this.fieldListSORT.push(String(this.fieldCounterSORT));
                this.mqlFieldsSORT.push([]);
                this.mqlFieldsSORT[this.fieldListSORT.length-1][5] = this.fieldDepthCounterSORT;
                this.mqlFieldsSORT[this.fieldListSORT.length-1][6] = -1;
                break;
        }
    }

    addMQLFieldKeyObject2(mqlCase: string) { // staying on the same 'level' of property
        switch (mqlCase) {
            case 'Find':
                this.fieldCounter += 1;
                this.fieldList.push(String(this.fieldCounter)); //adding addition marker to fieldList
                this.mqlFields.push([]);
                this.mqlFields[this.fieldList.length - 1][5] = this.fieldDepthCounter; //Key-Object Depth
                this.mqlFields[this.fieldList.length - 1][6] = -1; //Logical Operator Depth
                break;
            case 'Aggr1':
                this.fieldCounterMATCH += 1;
                this.fieldListMATCH.push(String(this.fieldCounterMATCH));
                this.mqlFieldsMATCH.push([]);
                this.mqlFieldsMATCH[this.fieldListMATCH.length - 1][5] = this.fieldDepthCounterMATCH;
                this.mqlFieldsMATCH[this.fieldListMATCH.length - 1][6] = -1;
                break;
            case 'Aggr2':
                this.fieldCounterGROUP += 1;
                this.fieldListGROUP.push(String(this.fieldCounterGROUP));
                this.mqlFieldsGROUP.push([]);
                this.mqlFieldsGROUP[this.fieldListGROUP.length - 1][5] = this.fieldDepthCounterGROUP;
                this.mqlFieldsGROUP[this.fieldListGROUP.length - 1][6] = -1;
                break;
            case 'Aggr3':
                this.fieldCounterSORT += 1;
                this.fieldListSORT.push(String(this.fieldCounterSORT));
                this.mqlFieldsSORT.push([]);
                this.mqlFieldsSORT[this.fieldListSORT.length - 1][5] = this.fieldDepthCounterSORT;
                this.mqlFieldsSORT[this.fieldListSORT.length - 1][6] = -1;
                break;
        }
    }

    addLogicalOperator(logical: string, mqlCase: string) { // adding Logical Operator AND or OR
        switch (mqlCase) {
            case 'Find':
                this.fieldCounter += 1;
                this.fieldList.push(logical);
                this.logicalOperatorStack.push(logical);
                this.mqlFields.push([]);
                this.mqlFields[this.fieldList.length - 1][5] = this.fieldDepthCounter; //Key-Object Depth
                this.mqlFields[this.fieldList.length - 1][6] = this.logicalDepthCounter; //Logical Operator Depth
                this.logicalDepthCounter += 1;
                break;
            case 'Aggr1':
                this.fieldCounterMATCH += 1;
                this.fieldListMATCH.push(logical);
                this.logicalOperatorStackMATCH.push(logical);
                this.mqlFieldsMATCH.push([]);
                this.mqlFieldsMATCH[this.fieldListMATCH.length - 1][5] = this.fieldDepthCounterMATCH;
                this.mqlFieldsMATCH[this.fieldListMATCH.length - 1][6] = this.logicalDepthCounterMATCH;
                this.logicalDepthCounterMATCH += 1;
                break;
        }
    }

    endLogicalOperator(mqlCase: string) { // ending Logical Operator AND or OR
        switch (mqlCase) {
            case 'Find':
                this.fieldCounter += 1;
                this.logicalDepthCounter -= 1;
                this.fieldList.push('END');
                this.logicalOperatorStack.pop();
                this.mqlFields.push([]);
                this.mqlFields[this.fieldList.length-1][5] = this.fieldDepthCounter; //Key-Object Depth
                this.mqlFields[this.fieldList.length-1][6] = this.logicalDepthCounter; //Logical Operator Depth
                break;
            case 'Aggr1':
                this.fieldCounterMATCH += 1;
                this.logicalDepthCounterMATCH -= 1;
                this.fieldListMATCH.push('END');
                this.logicalOperatorStackMATCH.pop();
                this.mqlFieldsMATCH.push([]);
                this.mqlFieldsMATCH[this.fieldListMATCH.length-1][5] = this.fieldDepthCounterMATCH;
                this.mqlFieldsMATCH[this.fieldListMATCH.length-1][6] = this.logicalDepthCounterMATCH;
                break;
        }
    }

    prependKeyObject(depth: number, index: number, mqlCase:string) { //creating the dot notation for objects
        let prependText = '';
        switch (mqlCase) {
            case 'Find':
                if (depth !== 0) { //does not have to iterarate through this if depth 0
                    for (let i = this.mqlFields.length - 1; i >= 0; i--) { //searches elements in array with lower depth to append for dot-notation
                        if (this.mqlFields[i][5] < depth) {
                            prependText += this.mqlFields[i][0] + '.';
                            break;
                        }
                    }
                }
                this.mqlFields[index][0] = prependText + this.mqlFields[index][3];
                break;
            case 'Aggr1':
                if (depth !== 0) {
                    for (let i = this.mqlFieldsMATCH.length - 1; i >= 0; i--) {
                        if (this.mqlFieldsMATCH[i][5] < depth) {
                            prependText += this.mqlFieldsMATCH[i][0] + '.';
                            break;
                        }
                    }
                }
                this.mqlFieldsMATCH[index][0] = prependText + this.mqlFieldsMATCH[index][3];
                break;
            case 'Aggr2':
                if (depth !== 0) {
                    for (let i = this.mqlFieldsGROUP.length - 1; i >= 0; i--) {
                        if (this.mqlFieldsGROUP[i][5] < depth) {
                            prependText += this.mqlFieldsGROUP[i][0] + '.';
                            break;
                        }
                    }
                }
                this.mqlFieldsGROUP[index][0] = prependText + this.mqlFieldsGROUP[index][3];
                break;
            case 'Aggr3':
                if (depth !== 0) {
                    for (let i = this.mqlFieldsSORT.length - 1; i >= 0; i--) {
                        if (this.mqlFieldsSORT[i][5] < depth) {
                            prependText += this.mqlFieldsSORT[i][0] + '.';
                            break;
                        }
                    }
                }
                this.mqlFieldsSORT[index][0] = prependText + this.mqlFieldsSORT[index][3];
                break;
        }
    }

    deleteCypherField(x:number) {
        this.fieldListCypher.splice(x, 1);
        this.cypherFields.splice(x, 1);

        this.fieldListCypherNode.splice(x, 1);
        this.cypherNode.splice(x, 1);
        this.fieldListCypherNode2.splice(x, 1);
        this.cypherNode2.splice(x, 1);
        this.fieldListCypherNode3.splice(x, 1);
        this.cypherNode3.splice(x, 1);
        this.fieldListCypherRel.splice(x, 1);
        this.cypherRel.splice(x, 1);
        this.fieldListCypherRel2.splice(x, 1);
        this.cypherRel2.splice(x, 1);
        this.generateCypher();
    }

    deleteCypherMatchField(index: number, x:number, field: number) {
        if (field === 1){
            this.fieldListCypherNode[index].splice(x, 1);
            this.cypherNode[index].splice(x, 1);
        }
        if (field === 2) {
            this.fieldListCypherNode2[index].splice(x, 1);
            this.cypherNode2[index].splice(x, 1);
        }
        if (field === 3) {
            this.fieldListCypherNode3[index].splice(x, 1);
            this.cypherNode3[index].splice(x, 1);
        }
        if (field === 4) {
            this.fieldListCypherRel[index].splice(x, 1);
            this.cypherRel[index].splice(x, 1);
        }
        if (field === 5) {
            this.fieldListCypherRel2[index].splice(x, 1);
            this.cypherRel2[index].splice(x, 1);
        }
    }

    deleteMQLField(x:number, mqlCase:string) {
        switch (mqlCase) {
            case 'Find':
                if (this.fieldList[x] === 'AND' || this.fieldList[x] === 'OR' || this.fieldList[x] === 'END') { //Deleting logical Operator and its END
                    const indicesToRemove = [];
                    for (let i = x; i < this.fieldList.length; i++) { // finds element and next element with same logical depth
                        if (this.mqlFields[i][6] === this.mqlFields[x][6]) { // comparing logical depths
                            indicesToRemove.push(i);
                        }
                        if (indicesToRemove.length === 2) {
                            break;
                        }
                    }
                    this.mqlFields = this.mqlFields.filter((_, index) => !indicesToRemove.includes(index));
                    this.fieldCounter = this.fieldCounter - indicesToRemove.length;
                    if (indicesToRemove[1] === this.fieldList.length && x !== 0) { //if last row of rows, we have to adapt fieldDepthCounter
                        this.fieldDepthCounter = this.mqlFields[x - 1][5];
                    }
                    this.fieldList = this.fieldList.filter((_, index) => !indicesToRemove.includes(index));
                    this.logicalOperatorStack = this.fieldList.filter((el) => el === 'AND' || el === 'OR' || el === 'END');
                    if (indicesToRemove.length === 1) { // there is no END, so the logical depth counter has to be substracted
                        this.logicalDepthCounter -= 1;
                    }
                }
                else { // normal field
                    this.fieldList.splice(x, 1);
                    this.mqlFields.splice(x, 1);
                    this.fieldCounter -= 1;
                    if (x === this.fieldList.length && x !== 0) { //if last row of rows, we have to adapt fieldDepthCounter
                        this.fieldDepthCounter = this.mqlFields[x-1][5];
                    }
                }
                this.generateMQL();
                break;
            case 'Aggr1':
                if (this.fieldListMATCH[x] === 'AND' || this.fieldListMATCH[x] === 'OR' || this.fieldListMATCH[x] === 'END') {
                    const indicesToRemove = [];
                    for (let i = x; i < this.fieldListMATCH.length; i++) {
                        if (this.mqlFieldsMATCH[i][6] === this.mqlFieldsMATCH[x][6]) {
                            indicesToRemove.push(i);
                        }
                        if (indicesToRemove.length === 2) {
                            break;
                        }
                    }
                    this.mqlFieldsMATCH = this.mqlFieldsMATCH.filter((_, index) => !indicesToRemove.includes(index));
                    this.fieldCounterMATCH = this.fieldCounterMATCH - indicesToRemove.length;
                    if (indicesToRemove[1] === this.fieldListMATCH.length && x !== 0) {
                        this.fieldDepthCounterMATCH = this.mqlFieldsMATCH[x - 1][5];
                    }
                    this.fieldListMATCH = this.fieldListMATCH.filter((_, index) => !indicesToRemove.includes(index));
                    this.logicalOperatorStackMATCH = this.fieldListMATCH.filter((el) => el === 'AND' || el === 'OR' || el === 'END');
                    if (indicesToRemove.length === 1) {
                        this.logicalDepthCounterMATCH -= 1;
                    }
                }
                else { // normal field
                    this.fieldListMATCH.splice(x, 1);
                    this.mqlFieldsMATCH.splice(x, 1);
                    this.fieldCounterMATCH -= 1;
                    if (x === this.fieldListMATCH.length && x !== 0) {
                        this.fieldDepthCounterMATCH = this.mqlFieldsMATCH[x-1][5];
                    }
                }
                this.generateMQL();
                break;
            case 'Aggr2':
                if (this.fieldListGROUP[x] === 'AND' || this.fieldListGROUP[x] === 'OR' || this.fieldListGROUP[x] === 'END') {
                    const indicesToRemove = [];
                    for (let i = x; i < this.fieldListGROUP.length; i++) {
                        if (this.mqlFieldsGROUP[i][6] === this.mqlFieldsGROUP[x][6]) {
                            indicesToRemove.push(i);
                        }
                        if (indicesToRemove.length === 2) {
                            break;
                        }
                    }
                    this.mqlFieldsGROUP = this.mqlFieldsGROUP.filter((_, index) => !indicesToRemove.includes(index));
                    this.fieldCounterGROUP = this.fieldCounterGROUP - indicesToRemove.length;
                    if (indicesToRemove[1] === this.fieldListGROUP.length && x !== 0) {
                        this.fieldDepthCounterGROUP = this.mqlFieldsGROUP[x - 1][5];
                    }
                    this.fieldListGROUP = this.fieldListGROUP.filter((_, index) => !indicesToRemove.includes(index));
                }
                else { // normal field
                    this.fieldListGROUP.splice(x, 1);
                    this.mqlFieldsGROUP.splice(x, 1);
                    this.fieldCounterGROUP -= 1;
                    if (x === this.fieldListGROUP.length && x !== 0) {
                        this.fieldDepthCounterGROUP = this.mqlFieldsGROUP[x-1][5];
                    }
                }
                this.generateMQL();
                break;
            case 'Aggr3':
                if (this.fieldListSORT[x] === 'AND' || this.fieldListSORT[x] === 'OR' || this.fieldListSORT[x] === 'END') {
                    const indicesToRemove = [];
                    for (let i = x; i < this.fieldListSORT.length; i++) {
                        if (this.mqlFieldsSORT[i][6] === this.mqlFieldsSORT[x][6]) {
                            indicesToRemove.push(i);
                        }
                        if (indicesToRemove.length === 2) {
                            break;
                        }
                    }
                    this.mqlFieldsSORT = this.mqlFieldsSORT.filter((_, index) => !indicesToRemove.includes(index));
                    this.fieldCounterSORT = this.fieldCounterSORT - indicesToRemove.length;
                    if (indicesToRemove[1] === this.fieldListSORT.length && x !== 0) {
                        this.fieldDepthCounterSORT = this.mqlFieldsSORT[x - 1][5];
                    }
                    this.fieldListSORT = this.fieldListSORT.filter((_, index) => !indicesToRemove.includes(index));
                }
                else { // normal field
                    this.fieldListSORT.splice(x, 1);
                    this.mqlFieldsSORT.splice(x, 1);
                    this.fieldCounterSORT -= 1;
                    if (x === this.fieldListSORT.length && x !== 0) {
                        this.fieldDepthCounterSORT = this.mqlFieldsSORT[x-1][5];
                    }
                }
                this.generateMQL();
                break;
        }
    }

    generateDropDownArray() {
        this.returnDropdown = [];
        for (let i = 0; i <= this.fieldListCypherNode.length - 1; i++) {
            if (this.cypherNode[i][0][0] !== '' && this.cypherNode[i][0][0] !== undefined) {
                this.returnDropdown.push(this.cypherNode[i][0][0]);
            }
            if (this.cypherNode2[i][0][0] !== '' && this.cypherNode2[i][0][0] !== undefined && this.cypherDropdown[i] !== 'cypher-none') {
                this.returnDropdown.push(this.cypherNode2[i][0][0]);
            }
            if (this.cypherNode3[i][0][0] !== '' && this.cypherNode3[i][0][0] !== undefined && this.cypherDropdown[i] === 'cypher-multiple') {
                this.returnDropdown.push(this.cypherNode3[i][0][0]);
            }
            if (this.cypherRel[i][0][0] !== '' && this.cypherRel[i][0][0] !== undefined && this.cypherDropdown[i] !== 'cypher-none' && this.cypherDropdown[i] !== 'cypher-outgoing') {
                this.returnDropdown.push(this.cypherRel[i][0][0]);
            }
            if (this.cypherRel2[i][0][0] !== '' && this.cypherRel2[i][0][0] !== undefined && this.cypherDropdown[i] === 'cypher-multiple') {
                this.returnDropdown.push(this.cypherRel2[i][0][0]);
            }
        }
        this.returnDropdown = this.returnDropdown.filter((value, index) => this.returnDropdown.indexOf(value) === index); //only show unique values as options
        this.returnDropdown = this.returnDropdown.sort(); // sorts array alphabetically
    }

    async generateMatch(index: number, field: number) {
        // generate the content of the field
        if (field === 1) {
            if (this.cypherNode[index][0][1] === '*') { // dropdown is empty
                this.cypherFields[index][0] = this.cypherNode[index][0][0];
            }
            else {
                this.cypherFields[index][0] = this.cypherNode[index][0][0] + ': ' + this.cypherNode[index][0][1];
            }
            for (let i = 1; i < this.fieldListCypherNode[index].length; i++) {
                if (i === 1) { // first property element
                    this.cypherFields[index][0] += ' {';
                }
                this.cypherFields[index][0] += this.cypherNode[index][i][0] + ': ' + this.cypherNode[index][i][1];
                if (i < this.fieldListCypherNode[index].length - 1) {
                    this.cypherFields[index][0] += ', ';
                }
                if (i === this.fieldListCypherNode[index].length - 1) {
                    this.cypherFields[index][0] += '}';
                }
            }
        }
        if (field === 2) {
            if (this.cypherNode2[index][0][1] === '*') { // dropdown is empty
                this.cypherFields[index][2] = this.cypherNode2[index][0][0];
            }
            else {
                this.cypherFields[index][2] = this.cypherNode2[index][0][0] + ': ' + this.cypherNode2[index][0][1];
            }
            for (let i = 1; i < this.fieldListCypherNode2[index].length; i++) {
                if (i === 1) { // first property element
                    this.cypherFields[index][2] += ' {';
                }
                this.cypherFields[index][2] += this.cypherNode2[index][i][0] + ': ' + this.cypherNode2[index][i][1];
                if (i < this.fieldListCypherNode2[index].length - 1) {
                    this.cypherFields[index][2] += ', ';
                }
                if (i === this.fieldListCypherNode2[index].length - 1) {
                    this.cypherFields[index][2] += '}';
                }
            }
        }
        if (field === 3) {
            if (this.cypherNode3[index][0][1] === '*') { // dropdown is empty
                this.cypherFields[index][4] = this.cypherNode3[index][0][0];
            }
            else {
                this.cypherFields[index][4] = this.cypherNode3[index][0][0] + ': ' + this.cypherNode3[index][0][1];
            }
            for (let i = 1; i < this.fieldListCypherNode3[index].length; i++) {
                if (i === 1) { // first property element
                    this.cypherFields[index][4] += ' {';
                }
                this.cypherFields[index][4] += this.cypherNode3[index][i][0] + ': ' + this.cypherNode3[index][i][1];
                if (i < this.fieldListCypherNode3[index].length - 1) {
                    this.cypherFields[index][4] += ', ';
                }
                if (i === this.fieldListCypherNode3[index].length - 1) {
                    this.cypherFields[index][4] += '}';
                }
            }
        }
        if (field === 4) {
            this.cypherFields[index][1] = this.cypherRel[index][0][0] + ': ' + this.cypherRel[index][0][1];
            for (let i = 1; i < this.fieldListCypherRel[index].length; i++) {
                if (i === 1) { // first property element
                    this.cypherFields[index][1] += ' {';
                }
                this.cypherFields[index][1] += this.cypherRel[index][i][0] + ': ' + this.cypherRel[index][i][1];
                if (i < this.fieldListCypherRel[index].length - 1) {
                    this.cypherFields[index][1] += ', ';
                }
                if (i === this.fieldListCypherRel[index].length - 1) {
                    this.cypherFields[index][1] += '}';
                }
            }
        }
        if (field === 5) {
            this.cypherFields[index][3] = this.cypherRel2[index][0][0] + ': ' + this.cypherRel2[index][0][1];
            for (let i = 1; i < this.fieldListCypherRel2[index].length; i++) {
                if (i === 1) { // first property element
                    this.cypherFields[index][3] += ' {';
                }
                this.cypherFields[index][3] += this.cypherRel2[index][i][0] + ': ' + this.cypherRel2[index][i][1];
                if (i < this.fieldListCypherRel2[index].length - 1) {
                    this.cypherFields[index][3] += ', ';
                }
                if (i === this.fieldListCypherRel2[index].length - 1) {
                    this.cypherFields[index][3] += '}';
                }
            }
        }
        this.generateCypher();
    }

    async generateCypher() {
        let cypher = '';
        for (let i = 0; i < this.fieldListCypher.length; i++) {
            if (this.fieldListCypher[i] === 'MATCH') {
                cypher += 'MATCH ' + '(' + this.cypherFields[i][0] + ')';
                switch (this.cypherDropdown[i]) {
                    case 'cypher-outgoing':
                        cypher += '-->(' + this.cypherFields[i][2] + ')';
                        break;
                    case 'cypher-directed':
                        cypher += '-[' + this.cypherFields[i][1] + ']->(' + this.cypherFields[i][2] + ')';
                        break;
                    case 'cypher-multiple':
                        cypher += '-[' + this.cypherFields[i][1] + ']->(' + this.cypherFields[i][2] + ')<-[' + this.cypherFields[i][3] + ']-(' + this.cypherFields[i][4] + ')';
                        break;
                }
            }
            if (this.fieldListCypher[i] === 'WHERE') {
                cypher += 'WHERE ' + this.cypherFields[i][0] + ' ' + this.cypherFields[i][1] + ' ' + this.cypherFields[i][2];
            }
            if (this.fieldListCypher[i] === 'OR' || this.fieldListCypher[i] === 'AND' || this.fieldListCypher[i] === 'NOR') {
                cypher +=  this.fieldListCypher[i] + ' ' + this.cypherFields[i][0] + ' ' + this.cypherFields[i][1] + ' ' + this.cypherFields[i][2];
            }
            cypher += '\n';
        }
        cypher += 'RETURN ';
        for (let i = 0; i < this.cypherReturnDrop.length; i++) {
            cypher += this.cypherReturnDrop[i];
            if (this.cypherReturnProp[i] !== undefined && this.cypherReturnProp[i] !== '') {
                cypher += '.' + this.cypherReturnProp[i];
            }
            if (i < this.cypherReturnDrop.length - 1) {
                cypher += ', ';
            }
        }
        this.editorGenerated.setCode(cypher);
    }

    onDropdownClick(dropdown: any) { // is needed to change the cypherReturnDrop[0], by changes
        const event = new Event('change');
        dropdown.dispatchEvent(event);
    }

    async generateMQL() {
        let mql = '';
        const isInsideLogicalCondition = [];
        switch (this.mqlType) {
            case 'FIND':
                mql += 'db.' + this.collectionName + '.find({';
                for (let i = 0; i < this.fieldList.length; i++) {
                    if (this.fieldList[i] === 'AND') {
                        mql += '$and: [';
                        isInsideLogicalCondition.push('AND');
                    }
                    if (this.fieldList[i] === 'OR') {
                        mql += '$or: [';
                        isInsideLogicalCondition.push('OR');
                    }
                    if (this.fieldList[i] !== 'AND' && this.fieldList[i] !== 'OR' && this.fieldList[i] !== 'END') {
                        if (isInsideLogicalCondition.length !== 0){
                            mql += '{';
                        }
                        switch (this.mqlFields[i][1]) {
                            case 'equal':
                                mql += '"' + this.mqlFields[i][0] + '" : ' + this.mqlFields[i][2];
                                break;
                            case 'notequal':
                                mql += '"' + this.mqlFields[i][0] + '" : {"$ne" : ' + this.mqlFields[i][2] + '}';
                                break;
                            case 'greater':
                                mql += '"' + this.mqlFields[i][0] + '" : {"$gt" : ' + this.mqlFields[i][2] + '}';
                                break;
                            case 'lesser':
                                mql += '"' + this.mqlFields[i][0] + '" : {"$lt" : ' + this.mqlFields[i][2] + '}';
                                break;
                            case 'contains':
                                mql += '"' + this.mqlFields[i][0] + '" : {$regex: \'/.*' + this.mqlFields[i][2] + '.*/i\'}';
                                break;
                            case 'notcontains':
                                mql += '"' + this.mqlFields[i][0] + '" : {"$not" : /.*' + this.mqlFields[i][2] + '.*/i}';
                                break;
                            case 'type':
                                mql += '"' + this.mqlFields[i][0] + '" : {"$type" : ' + this.mqlFields[i][2] + '}';
                                break;
                        }
                        if (isInsideLogicalCondition.length !== 0){
                            mql += '}';
                        }
                        const fieldListf = this.fieldList.filter((el) => el !== 'AND' && el !== 'OR' && el !== 'END');
                        let matchingIndex = -1;
                        for (let j = 0; j < fieldListf.length; j++) {
                            if (fieldListf[j] === this.fieldList[i]) {
                                matchingIndex = j;
                            }
                        }
                        if (matchingIndex + 1 <= fieldListf.length - 1 && matchingIndex !== -1 && this.mqlFields[i][1] !== undefined) {
                            mql += ', ';
                        }
                    }
                    if (this.fieldList[i] === 'END') {
                        mql += ']';
                        isInsideLogicalCondition.pop();
                    }
                }
                mql += '})';
                this.editorGenerated.setCode(mql);
                break;
            case 'AGGR':
                mql += 'db.' + this.collectionName + '.aggregate([{$match: {';
                // Match-Loop
                for (let i = 0; i < this.fieldListMATCH.length; i++) {
                    if (this.fieldListMATCH[i] === 'AND') {
                        mql += '$and: [';
                        isInsideLogicalCondition.push('AND');
                    }
                    if (this.fieldListMATCH[i] === 'OR') {
                        mql += '$or: [';
                        isInsideLogicalCondition.push('OR');
                    }
                    if (this.fieldListMATCH[i] !== 'AND' && this.fieldListMATCH[i] !== 'OR' && this.fieldListMATCH[i] !== 'END') {
                        if (isInsideLogicalCondition.length !== 0){
                            mql += '{';
                        }
                        switch (this.mqlFieldsMATCH[i][1]) {
                            case 'equal':
                                mql += '"' + this.mqlFieldsMATCH[i][0] + '" : ' + this.mqlFieldsMATCH[i][2];
                                break;
                            case 'notequal':
                                mql += '"' + this.mqlFieldsMATCH[i][0] + '" : {"$ne" : ' + this.mqlFieldsMATCH[i][2] + '}';
                                break;
                            case 'greater':
                                mql += '"' + this.mqlFieldsMATCH[i][0] + '" : {"$gt" : ' + this.mqlFieldsMATCH[i][2] + '}';
                                break;
                            case 'lesser':
                                mql += '"' + this.mqlFieldsMATCH[i][0] + '" : {"$lt" : ' + this.mqlFieldsMATCH[i][2] + '}';
                                break;
                            case 'contains':
                                mql += '"' + this.mqlFieldsMATCH[i][0] + '" : {$regex: \'/.*' + this.mqlFieldsMATCH[i][2] + '.*/i\'}';
                                break;
                            case 'notcontains':
                                mql += '"' + this.mqlFieldsMATCH[i][0] + '" : {"$not" : /.*' + this.mqlFieldsMATCH[i][2] + '.*/i}';
                                break;
                            case 'type':
                                mql += '"' + this.mqlFieldsMATCH[i][0] + '" : {"$type" : ' + this.mqlFieldsMATCH[i][2] + '}';
                                break;
                        }
                        if (isInsideLogicalCondition.length !== 0){
                            mql += '}';
                        }
                        const fieldListf = this.fieldListMATCH.filter((el) => el !== 'AND' && el !== 'OR' && el !== 'END');
                        let matchingIndex = -1;
                        for (let j = 0; j < fieldListf.length; j++) {
                            if (fieldListf[j] === this.fieldListMATCH[i]) {
                                matchingIndex = j;
                            }
                        }
                        if (matchingIndex + 1 <= fieldListf.length - 1 && matchingIndex !== -1 && this.mqlFieldsMATCH[i][1] !== undefined) {
                            mql += ', ';
                        }
                    }
                    if (this.fieldListMATCH[i] === 'END') {
                        mql += ']';
                        isInsideLogicalCondition.pop();
                    }
                }
                mql += '}}, {$group: {';
                //Group-Loop
                for (let i = 0; i < this.fieldListGROUP.length; i++) {
                    if (this.mqlFieldsGROUP[i][0] === '_id') {
                        mql += '"' + this.mqlFieldsGROUP[i][0] + '" : "$' + this.mqlFieldsGROUP[i][2] + '"';
                    }
                    else {
                        mql += '"' + this.mqlFieldsGROUP[i][0] + '" : { ' + this.mqlFieldsGROUP[i][1] + ' : "$' + this.mqlFieldsGROUP[i][2] + '"}';
                    }
                    if (i < this.mqlFieldsGROUP.length-1) {
                        mql += ', ';
                    }
                }
                mql += '}}, {$sort: {';
                //Sort-Loop
                for (let i = 0; i < this.fieldListSORT.length; i++) {
                    mql += '"' + this.mqlFieldsSORT[i][0] + '" : ' + this.mqlFieldsSORT[i][1];
                    if (i < this.mqlFieldsSORT.length-1) {
                        mql += ', ';
                    }
                }
                mql += '}}])';
                this.editorGenerated.setCode(mql);
                break;
        }
    }

    async generateSQL() {
        this.whereCounter = 0;
        this.andCounter = 0;
        this.orderByCounter = 0;
        let filteredInfos = '';

        if (this.columns.size === 0) {
            //this.editorGenerated.setCode('');
            return;
        }

        let sql = 'SELECT ';
        const cols = [];
        const filterCols = [];
        $('#selectBox').find('.dbCol').each((i, el) => {
            const name = $(el).attr('data-id');
            let id = '"' + name.split('.').join('"."') + '"';
            if (this.filteredUserSet) {
                Object.keys(this.filteredUserSet).forEach(col => {
                    const element = this.filteredUserSet[col];
                    if (this.selectedColumn['column'].includes(col)) {
                        if (element['aggregate'] && !(element['aggregate'] === 'OFF')) {
                            if (col === name) {
                                id = element['aggregate'] + '(' + id + ')';
                            }
                        }
                    }
                });
            }

            cols.push(id);
            filterCols.push(name);
        });
        sql += cols.join(', ');
        sql += '\nFROM ';
        const tables = [];
        this.tables.forEach((v, k) => {
            tables.push('"' + k.split('.').join('"."') + '"');
        });
        sql += tables.join(', ');

        //get join conditions
        let counter = 0;
        const joinConditions = [];
        this.joinConditions.forEach((v, k) => {
            if (v.active) {
                counter++;
                joinConditions.push(v.condition);
            }
        });
        if (counter > 0) {
            sql += this.connectWheres() + joinConditions.join(' AND ');
        }

        //to only show filters for selected tables/cols
        this.selectedCol(filterCols);

        filteredInfos = await this.processfilterSet();
        let finalized;

        finalized = sql + filteredInfos;

        this.generatedSQL = finalized;
        this.editorGenerated.setCode(finalized);
    }

    selectedCol(col: {}) {
        this.selectedColumn = {
            column: col
        };
    }

    /*
     * to select correct keyword ORDER BY Comma
     */
    connectOrderby() {
        if (this.orderByCounter === 0) {
            this.orderByCounter += 1;
            return '\nORDER BY ';
        } else {
            return ', ';
        }
    }

    /*
     * to select correct keyword WHERE AND
     */
    connectWheres() {
        if (this.whereCounter === 0) {
            this.whereCounter += 1;
            return '\nWHERE ';
        } else {
            return '\nAND ';
        }
    }

    executeQuery() {
        this.loading = true;
        const code = this.editorGenerated.getCode();
        if (!this._crud.anyQuery(this.webSocket, new QueryRequest(code, false, true, this.lang, this.activeNamespace))) {
            this.loading = false;
            this.resultSet = new ResultSet('Could not establish a connection with the server.', code);
        }
    }

    addCol(data) {
        const treeElement = new SidebarNode(data.id, data.name, null, null);

        if (this.columns.get(treeElement.id) !== undefined) {
            //skip if already in select list
            return;
        } else {
            this.columns.set(treeElement.id, treeElement);
        }

        if (this.tables.get(treeElement.getTable()) !== undefined) {
            this.tables.set(treeElement.getTable(), this.tables.get(treeElement.getTable()) + 1);
        } else {
            this.tables.set(treeElement.getTable(), 1);
        }

        if (this.schemas.get(treeElement.getSchema()) === undefined) {
            this.schemas.set(treeElement.getSchema(), treeElement.getSchema());
            this._crud.getUml(new EditTableRequest(treeElement.getSchema())).subscribe(
                res => {
                    const uml = <Uml>res;
                    this.umlData.set(treeElement.getSchema(), uml);
                    this.generateJoinConditions();
                }, err => {
                    this._toast.error('Could not get foreign keys of the schema ' + treeElement.getSchema());
                }
            );
        } else {
            this.generateJoinConditions();
        }
        $('#selectBox').append(`<div class="btn btn-secondary btn-sm dbCol" data-id="${treeElement.id}">${treeElement.getColumn()} <span class="del">&times;</span></div>`).sortable('refresh');
        this.generateSQL();
    }

    toggleCondition(con: JoinCondition) {
        con.toggle();
        this.generateSQL();
    }

    /**
     * Generate the needed join conditions
     */
    generateJoinConditions() {
        this.joinConditions.clear();
        this.umlData.forEach((uml, key) => {
            uml.foreignKeys.forEach((fk: ForeignKey, key2) => {
                const fkId = fk.sourceSchema + '.' + fk.sourceTable + '.' + fk.sourceColumn;
                const pkId = fk.targetSchema + '.' + fk.targetTable + '.' + fk.targetColumn;
                if (this.tables.get(fk.targetSchema + '.' + fk.targetTable) !== undefined &&
                    this.tables.get(fk.sourceSchema + '.' + fk.sourceTable) !== undefined) {
                    this.joinConditions.set(fkId + pkId, new JoinCondition(this.wrapInParetheses(fkId) + ' = ' + this.wrapInParetheses(pkId)));
                }
            });
        });
    }

    createView(info: ViewInformation) {
        this.editorGenerated.setCode(info.fullQuery);
    }

    executeView(info: ViewInformation) {
        this.editorGenerated.setCode(info.fullQuery);
        this.executeQuery();
    }

}

class JoinCondition {
    condition: string;
    active: boolean;

    constructor(condition: string) {
        this.condition = condition;
        this.active = true;
    }

    toggle() {
        this.active = !this.active;
    }
}

