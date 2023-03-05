import {
    AfterViewInit,
    Component,
    Input,
    OnDestroy,
    OnInit,
    TemplateRef,
    ViewChild,
    ViewEncapsulation
} from '@angular/core';
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
import {ActivatedRoute, Router} from '@angular/router';
import {Subscription} from 'rxjs';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {WebSocket} from '../../../services/webSocket';
import {BsModalRef, BsModalService} from 'ngx-bootstrap/modal';
import {ViewInformation} from '../../../components/data-view/data-view.component';
// new import added to extent graph
import {DataGraphComponent} from '../../../components/data-view/data-graph/data-graph.component';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {TableConfig} from '../../../components/data-view/data-table/table-config';

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
    lang: string; // usage as lang in console.component.hmtl 'sql', 'cypher', 'mql'
    tableId: string;
    config: TableConfig;
    // cypher input fields
    cypherMatch = '';
    cypherWhere = '';
    cypherReturn = '';
    cypherDropdown: string;

    cypherRelationship: string[] = ['','','','']; // [0] = Relationship, [1] = Node, [2] = 2.Relationship, [3] = 2.Node
    fieldList: string[] = ['0']; // each newly created input field in mql gets another value
    fieldDepth: number[] = [0];
    fieldDepthCounter = 0;
    logicalDepth: number[] = [-1];
    logicalDepthCounter = 0;
    // mql input fields
    mqlDropdown: string[] = [];
    mqlTextX: string[] = [];
    mqlText1: string[] = [];
    mqlText2: string[] = [];
    activeNamespace: string; // same usage as console.components.ts
    collectionName: string;
    graphName: string;

    logicalOperatorStack: string[] = [];
    fieldCounter = 0;
    private readonly LOCAL_STORAGE_NAMESPACE_KEY = 'polypheny-namespace'; // same usage as console.components.ts

    // Dropdown
    show = false;

    show2 = false;
    private debounce: any;
    private debounceDelay = 200;

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
      this._crud.getSchema(new SchemaRequest('views/graphical-querying/', true, 3, false, false, [DataModels.RELATIONAL])).subscribe(
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
      this._crud.getSchema(new SchemaRequest('views/graphical-querying/', true, 1, false, false, [DataModels.GRAPH])).subscribe(
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
      this._crud.getSchema(new SchemaRequest('views/graphical-querying/', true, 2, false, false, [DataModels.DOCUMENT])).subscribe(
          res => {
            const nodeAction = (tree, node, $event) => { // TO DO: it only shows columns _id_ and _data_ but not correct ones.
              if (!node.isActive && node.isLeaf) {
                console.log(node.parent.id);
                this.setDefaultDB(node.parent.id);
                console.log(node.displayField);
                this.collectionName = node.displayField;
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
                this.graphName = undefined;
                this.mqlDropdown = [];
                this.mqlTextX = [];
                this.mqlText1 = [];
                this.mqlText2 = [];
                this.fieldCounter = 0;
                this.logicalDepth = [0];
                this.fieldList = ['0'];
                this.fieldDepth = [0];
                this.fieldDepthCounter = 0;
                this.cypherMatch = ''; // three input fields for match
                this.cypherWhere = '';
                this.cypherReturn = '';
                this.cypherRelationship = ['','','',''];
                this.logicalDepthCounter = 0;
                break;
            case 'cypher':
                this.collectionName = undefined;
                this.mqlDropdown = [];
                this.mqlTextX = [];
                this.mqlText1 = [];
                this.mqlText2 = [];
                this.fieldCounter = 0;
                this.fieldList = ['0'];
                this.fieldDepth = [0];
                this.fieldDepthCounter = 0;
                this.logicalDepth = [0];
                this.logicalDepthCounter = 0;
                break;
            case 'mql':
                this.graphName = undefined;
                this.cypherMatch = ''; // three input fields for match
                this.cypherWhere = '';
                this.cypherReturn = '';
                this.cypherRelationship = ['','','',''];
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
    setMenuShow(doShow: boolean, instant = false) {
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
    }

    //taken from json-editor.component.ts
    menuEnter() {
        if (this.show) {
            clearTimeout(this.debounce);
        }
    }

    setMenuShow2(doShow2: boolean, instant = false) {
        if (instant) {
            this.show2 = doShow2;
            return;
        }
        if (!doShow2) {
            this.debounce = setTimeout(() => {
                this.show2 = false;
            }, this.debounceDelay);
        } else {
            this.show2 = true;
        }
    }

    //taken from json-editor.component.ts
    menuEnter2() {
        if (this.show2) {
            clearTimeout(this.debounce);
        }
    }

    addMQLField() { // 'normal new Field'
        this.fieldCounter += 1;
        this.fieldList.push(String(this.fieldCounter));
        this.fieldDepthCounter = 0;
        this.fieldDepth.push(this.fieldDepthCounter);
        this.logicalDepth.push(-1);
    }

    addMQLFieldKeyObject() { // adding a property
        this.fieldCounter += 1;
        this.fieldList.push(String(this.fieldCounter)); //adding addition marker to fieldList
        this.fieldDepthCounter += 1;
        this.fieldDepth.push(this.fieldDepthCounter);
        this.logicalDepth.push(-1);
        //this.mqlDropdown[] = undefined;// deleting equal from field before
    }

    addMQLFieldKeyObject2() { // staying on the same 'level' of property
        this.fieldCounter += 1;
        this.fieldList.push(String(this.fieldCounter)); //adding addition marker to fieldList
        this.fieldDepth.push(this.fieldDepthCounter);
        this.logicalDepth.push(-1);
    }

    addLogicalOperator(logical: string) { // adding Logical Operator AND or OR
        this.fieldCounter += 1;
        this.fieldList.push(logical); //adding addition marker to fieldList
        this.fieldDepth.push(this.fieldDepthCounter);
        this.logicalDepth.push(this.logicalDepthCounter);
        this.logicalDepthCounter += 1;
        this.logicalOperatorStack.push(logical);
    }

    endLogicalOperator() { // ending Logical Operator AND or OR
        this.fieldCounter += 1;
        this.fieldList.push('END'); //adding addition marker to fieldList
        this.fieldDepth.push(this.fieldDepthCounter);
        this.logicalDepthCounter -= 1;
        this.logicalDepth.push(this.logicalDepthCounter);
        this.logicalOperatorStack.pop();
    }

    prependKeyObject(depth: number, index: number) { //creating the dot notation for objects
        let prependText = '';
        if (depth !== 0) { //does not have to iterarate through this if depth 0
            for (let i = this.mqlText1.length - 1; i >= 0; i--) { //searches elements in array with lower depth to append for dot-notation
                if (this.fieldDepth[i] < depth) {
                    prependText += this.mqlText1[i] + '.';
                    break;
                }
            }
        }
        this.mqlText1[index] = prependText + this.mqlTextX[index];
    }

    deleteMQLField(x:number) {
        this.mqlDropdown.splice(x, 1);
        this.mqlText1.splice(x, 1);
        this.mqlText2.splice(x, 1);
        this.mqlTextX.splice(x, 1);
        if (x === this.mqlText1.length - 1 && x !== 0) { //if last row of rows, we have to adapt fieldDepthCounter
            this.fieldDepthCounter = this.fieldDepth[x - 1];
        }
        this.fieldDepth.splice(x, 1);
        this.fieldCounter -= 1;
        if (this.fieldList[x] === 'AND' || this.fieldList[x] === 'OR' || this.fieldList[x] === 'END') { //Deleting logical Operator and its END
            const indicesToRemove: number[] = [];
            for (let i = x; i < this.fieldList.length; i++) {
                if (this.logicalDepth[i] === this.logicalDepth[x]) { //should only delete the next element of logical Operator
                    indicesToRemove.push(i);
                    if (indicesToRemove.length === 2) {
                        break;
                    }
                }
            }
            this.fieldList = this.fieldList.filter((_, index) => !indicesToRemove.includes(index));
            this.logicalDepth = this.logicalDepth.filter((_, index) => !indicesToRemove.includes(index));
            if (indicesToRemove.length === 1) { // there is no END, so the logical depth counter has to be substracted
                this.logicalDepthCounter -= 1;
            }
        }
        else {
            this.fieldList.splice(x, 1);
            this.logicalDepth.splice(x, 1);
        }
        this.generateMQL();
    }

    async generateCypher() {
        let cypher = '';
        cypher += 'MATCH ' + '(' + this.cypherMatch + ')';
        switch (this.cypherDropdown) {
            case 'cypher-outgoing':
                cypher += '-->(' + this.cypherRelationship[1] + ')';
                break;
            case 'cypher-directed':
                cypher += '-[' + this.cypherRelationship[0] + ']->(' + this.cypherRelationship[1] + ')';
                break;
            case 'cypher-multiple':
                cypher += '-[' + this.cypherRelationship[0] + ']->(' + this.cypherRelationship[1] + ')<-[' + this.cypherRelationship[2] + ']-(' + this.cypherRelationship[3] + ')';
                break;
        }
        if (this.cypherWhere !== '') {
            cypher += '\nWHERE ' + this.cypherWhere;
        }
        cypher += '\nRETURN ' + this.cypherReturn + ';';
        this.editorGenerated.setCode(cypher);
    }

    async generateMQL() {
        let mql = '';
        const isInsideLogicalCondition = [];
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
                switch (this.mqlDropdown[i]) {
                    case 'equal':
                        mql += '"' + this.mqlText1[i] + '" : ' + this.mqlText2[i];
                        break;
                    case 'notequal':
                        mql += '"' + this.mqlText1[i] + '" : {"$ne" : ' + this.mqlText2[i] + '}';
                        break;
                    case 'greater':
                        mql += '"' + this.mqlText1[i] + '" : {"$gt" : ' + this.mqlText2[i] + '}';
                        break;
                    case 'lesser':
                        mql += '"' + this.mqlText1[i] + '" : {"$lt" : ' + this.mqlText2[i] + '}';
                        break;
                    case 'contains':
                        mql += '"' + this.mqlText1[i] + '" : {$regex: \'/.*' + this.mqlText2[i] + '.*/i\'}';
                        break;
                    case 'notcontains':
                        mql += '"' + this.mqlText1[i] + '" : {"$not" : /.*' + this.mqlText2[i] + '.*/i}';
                        break;
                    case 'type':
                        mql += '"' + this.mqlText1[i] + '" : {"$type" : ' + this.mqlText2[i] + '}';
                        break;
                }
                if (isInsideLogicalCondition.length !== 0){
                    mql += '}';
                }
                if (i + 1 <= this.mqlDropdown.length - 1) {
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
        console.log(code);
        console.log(this.activeNamespace);
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

