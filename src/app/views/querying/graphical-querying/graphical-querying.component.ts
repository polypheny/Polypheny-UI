import {AfterViewInit, Component, OnDestroy, OnInit, TemplateRef, ViewChild, ViewEncapsulation} from '@angular/core';
import * as $ from 'jquery';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/widgets/sortable';
import 'jquery-ui/ui/widgets/draggable';
import {CrudService} from '../../../services/crud.service';
import {FilteredUserInput, ResultSet} from '../../../components/data-view/models/result-set.model';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ToastService} from '../../../components/toast/toast.service';
import {EditTableRequest, QueryRequest, SchemaRequest} from '../../../models/ui-request.model';
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

    nodeLabels: string[] = ['Movie', 'Person']; //Hardcoded for the moment
    relationLabels: string[] = ['DIRECTED', 'ACTED_IN', 'FATHER_OF']; //Hardcoded for the moment
    lang: string; // usage as lang in console.component.hmtl 'sql', 'cypher', 'mql'
    tableId: string;
    config: TableConfig;
    // cypher input fields
    cypherFields: string[][] = [[]]; // Matrix à [n,5] size  -> [1] = Relationship, [2] = Node, [3] = 2.Relationship, [4] = 2.Node
    cypherReturn = '';
    cypherDropdown: string[] = [];
    //cypherRelationship: string[] = ['','','','']; // [0] = Relationship, [1] = Node, [2] = 2.Relationship, [3] = 2.Node
    fieldListCypher: string[] = ['MATCH'];
    fieldList: string[] = ['0'];
    fieldListMATCH: string[] = ['0'];
    fieldListGROUP: string[] = ['0'];
    fieldDepthCounter = 0;
    fieldDepthCounterMATCH = 0;
    fieldDepthCounterGROUP = 0;
    logicalDepthCounter = 0;
    logicalDepthCounterMATCH = 0;
    logicalDepthCounterGROUP = 0;
    // mql input fields
    mqlFields: any[][] = [['','','','',0,0]]; //mqlText1 = 0, mqlDropdown = 1, mqlText2 = 3, mqlTextX = 4, fieldDepth = 5, logicalDepth = 6

    mqlFieldsMATCH: any[][] = [['','','','',0,0]];
    mqlFieldsGROUP: any[][] = [['','','','',0,0]];
    activeNamespace: string; // same usage as console.components.ts
    collectionName: string;
    collectionName2: string;
    graphName: string;

    logicalOperatorStack: string[] = [];
    logicalOperatorStackMATCH: string[] = [];
    logicalOperatorStackGROUP: string[] = [];
    fieldCounter = 0;
    fieldCounterMATCH = 0;
    fieldCounterGROUP = 0;
    private readonly LOCAL_STORAGE_NAMESPACE_KEY = 'polypheny-namespace'; // same usage as console.components.ts

    // Dropdown
    show = false;
    showFIND = false;
    showMATCH = false;
    showGROUP = false;

    show2 = false;
    showFIND2 = false;
    showMATCH2 = false;
    showGROUP2 = false;
    private debounce: any;
    private debounceDelay = 200;

    private initialrect: DOMRect;

    mqlType: string;


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
                    const nodeAction = (tree, node, $event) => { // TO DO: it only shows columns _id_ and _data_ but not correct ones.
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

    setDefaultState(inputlang: string) { //sets the field values to zero if the user switches languages
        switch (inputlang) {
            case 'sql':
                this.collectionName = undefined;
                this.collectionName2 = undefined;
                this.graphName = undefined;
                //mql
                this.mqlFields = [['','','','',0,0]];
                this.mqlFieldsMATCH = [['','','','',0,0]];
                this.mqlFieldsGROUP = [['','','','',0,0]];
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
                this.logicalOperatorStackGROUP = [];
                this.fieldListGROUP = ['0'];
                this.fieldDepthCounterGROUP = 0;
                this.logicalDepthCounterGROUP = 0;
                //cypher
                this.cypherFields = [[]];
                this.cypherReturn = '';
                this.fieldListCypher = ['MATCH'];
                break;
            case 'cypher':
                this.collectionName = undefined;
                this.collectionName2 = undefined;
                this.mqlFields = [['','','','',0,0]];
                this.mqlFieldsMATCH = [['','','','',0,0]];
                this.mqlFieldsGROUP = [['','','','',0,0]];
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
                this.logicalOperatorStackGROUP = [];
                this.fieldListGROUP = ['0'];
                this.fieldDepthCounterGROUP = 0;
                this.logicalDepthCounterGROUP = 0;
                break;
            case 'mql':
                this.graphName = undefined;
                this.cypherFields = [[]];
                this.cypherReturn = '';
                this.fieldListCypher = ['MATCH'];
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
        }
    }

    setMenuShow2(doShow: boolean, instant = false, mqlCase: string) {
        switch (mqlCase) {
            case 'Find':
                if (instant) {
                    this.show2 = doShow;
                    return;
                }
                if (!doShow) {
                    this.debounce = setTimeout(() => {
                        this.show2 = false;
                    }, this.debounceDelay);
                } else {
                    this.show2 = true;
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
            case 'Aggr2':
                if (instant) {
                    this.showGROUP2 = doShow;
                    return;
                }
                if (!doShow) {
                    this.debounce = setTimeout(() => {
                        this.showGROUP2 = false;
                    }, this.debounceDelay);
                } else {
                    this.showGROUP2 = true;
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
            case 'Aggr2':
                if (this.showGROUP2) {
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
                            this.logicalOperatorStackGROUP.splice(targetIndex, 0, this.logicalOperatorStackGROUP.splice(index, 1)[0]);
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
            case 'Aggr2':
                this.fieldCounterGROUP += 1;
                this.fieldListGROUP.push(logical);
                this.logicalOperatorStackGROUP.push(logical);
                this.mqlFieldsGROUP.push([]);
                this.mqlFieldsGROUP[this.fieldListGROUP.length - 1][5] = this.fieldDepthCounterGROUP;
                this.mqlFieldsGROUP[this.fieldListGROUP.length - 1][6] = this.logicalDepthCounterGROUP;
                this.logicalDepthCounterGROUP += 1;
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
            case 'Aggr2':
                this.fieldCounterGROUP += 1;
                this.logicalDepthCounterGROUP -= 1;
                this.fieldListGROUP.push('END');
                this.logicalOperatorStackGROUP.pop();
                this.mqlFieldsGROUP.push([]);
                this.mqlFieldsGROUP[this.fieldListGROUP.length-1][5] = this.fieldDepthCounterGROUP;
                this.mqlFieldsGROUP[this.fieldListGROUP.length-1][6] = this.logicalDepthCounterGROUP;
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
        }
    }

    deleteCypherField(x:number) {
        this.fieldListCypher.splice(x, 1);
        this.cypherFields.splice(x, 1);
        this.generateCypher();
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
                    this.logicalOperatorStackGROUP = this.fieldListGROUP.filter((el) => el === 'AND' || el === 'OR' || el === 'END');
                    if (indicesToRemove.length === 1) {
                        this.logicalDepthCounterGROUP -= 1;
                    }
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
        }
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
        cypher += 'RETURN ' + this.cypherReturn + ';';
        this.editorGenerated.setCode(cypher);
    }

    async generateMQL() {
        let mql = '';
        const isInsideLogicalCondition = [];
        switch (this.mqlType) {
            case 'FIND':
                mql += 'db.getCollection("' + this.collectionName + '").find({';
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
                mql += 'db.getCollection("' + this.collectionName + '").aggregate([{$match: {';
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
                mql += '},{$group: {';
                //Group-Loop
                for (let i = 0; i < this.fieldList.length; i++) {
                    if (this.fieldListGROUP[i] === 'AND') {
                        mql += '$and: [';
                        isInsideLogicalCondition.push('AND');
                    }
                    if (this.fieldListGROUP[i] === 'OR') {
                        mql += '$or: [';
                        isInsideLogicalCondition.push('OR');
                    }
                    if (this.fieldListGROUP[i] !== 'AND' && this.fieldListGROUP[i] !== 'OR' && this.fieldListGROUP[i] !== 'END') {
                        if (isInsideLogicalCondition.length !== 0){
                            mql += '{';
                        }
                        switch (this.mqlFieldsGROUP[i][1]) {
                            case 'equal':
                                mql += '"' + this.mqlFieldsGROUP[i][0] + '" : ' + this.mqlFieldsGROUP[i][2];
                                break;
                            case 'notequal':
                                mql += '"' + this.mqlFieldsGROUP[i][0] + '" : {"$ne" : ' + this.mqlFieldsGROUP[i][2] + '}';
                                break;
                            case 'greater':
                                mql += '"' + this.mqlFieldsGROUP[i][0] + '" : {"$gt" : ' + this.mqlFieldsGROUP[i][2] + '}';
                                break;
                            case 'lesser':
                                mql += '"' + this.mqlFieldsGROUP[i][0] + '" : {"$lt" : ' + this.mqlFieldsGROUP[i][2] + '}';
                                break;
                            case 'contains':
                                mql += '"' + this.mqlFieldsGROUP[i][0] + '" : {$regex: \'/.*' + this.mqlFieldsGROUP[i][2] + '.*/i\'}';
                                break;
                            case 'notcontains':
                                mql += '"' + this.mqlFieldsGROUP[i][0] + '" : {"$not" : /.*' + this.mqlFieldsGROUP[i][2] + '.*/i}';
                                break;
                            case 'type':
                                mql += '"' + this.mqlFieldsGROUP[i][0] + '" : {"$type" : ' + this.mqlFieldsGROUP[i][2] + '}';
                                break;
                        }
                        if (isInsideLogicalCondition.length !== 0){
                            mql += '}';
                        }
                        const fieldListf = this.fieldListGROUP.filter((el) => el !== 'AND' && el !== 'OR' && el !== 'END');
                        let matchingIndex = -1;
                        for (let j = 0; j < fieldListf.length; j++) {
                            if (fieldListf[j] === this.fieldListGROUP[i]) {
                                matchingIndex = j;
                            }
                        }
                        if (matchingIndex + 1 <= fieldListf.length - 1 && matchingIndex !== -1 && this.mqlFieldsGROUP[i][1] !== undefined) {
                            mql += ', ';
                        }
                    }
                    if (this.fieldListGROUP[i] === 'END') {
                        mql += ']';
                        isInsideLogicalCondition.pop();
                    }
                }
                mql += '}])';
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

    executeCypherFilter(code: string) {
        this.loading = true;
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

