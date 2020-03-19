import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import * as $ from 'jquery';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/widgets/sortable';
import 'jquery-ui/ui/widgets/draggable';
import {CrudService} from '../../../services/crud.service';
import {FilteredUserInput, ResultSet, StatisticSet} from '../../../components/data-table/models/result-set.model';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ToastService} from '../../../components/toast/toast.service';
import {EditTableRequest, QueryRequest, SchemaRequest, StatisticRequest} from '../../../models/ui-request.model';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {ForeignKey, Uml} from '../../uml/uml.model';
import {DataTableComponent} from '../../../components/data-table/data-table.component';

@Component({
    selector: 'app-graphical-querying',
    templateUrl: './graphical-querying.component.html',
    styleUrls: ['./graphical-querying.component.scss'],
    encapsulation: ViewEncapsulation.None, // new elements in sortable should have margin as well

})
export class GraphicalQueryingComponent implements OnInit, AfterViewInit, OnDestroy {

    @ViewChild('editorGenerated', {static: false}) editorGenerated;
    generatedSQL;
    resultSet: ResultSet;
    selectedColumn = {};
    loading = false;
    whereCounter = 0;
    orderByCounter = 0;
    andCounter = 0;
    filteredUserSet: FilteredUserInput;
    dataTableCounter = 0;

    //fields for the graphical query generation
    schemas = new Map<string, string>();//schemaName, schemaName
    tables = new Map<string, number>();//tableName, number of columns of this table
    columns = new Map<string, SidebarNode>();//columnId, columnName
    umlData = new Map<string, Uml>();//schemaName, uml
    joinConditions = new Map<string, JoinCondition>();

    @ViewChild(DataTableComponent, {static: false}) dataTable: DataTableComponent;

    constructor(
            private _crud: CrudService,
            private _leftSidebar: LeftSidebarService,
            private _toast: ToastService
    ) {
    }

    ngOnInit() {
        this._leftSidebar.setSchema(new SchemaRequest('views/graphical-querying/', false, 3));
        this._leftSidebar.setAction((node) => {
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
        });
        this.initGraphicalQuerying();
    }

    ngAfterViewInit() {
        this.generateSQL();
    }

    ngOnDestroy() {
        this._leftSidebar.close();
        // this._leftSidebar.reset();
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
        return "\"" + k.split(".").join("\".\"") + "\"";
    }

    async generateSQL() {
        this.whereCounter = 0;
        this.andCounter = 0;
        this.orderByCounter = 0;
        let filteredInfos = '';

        if (this.columns.size === 0) {
            this.editorGenerated.setCode('');
            return;
        }

        let sql = 'SELECT ';
        const cols = [];
        const filterCols = [];
        $('#selectBox').find('.dbCol').each((i, el) => {
            const name = $(el).attr('data-id');
            let id = "\"" + name.split(".").join("\".\"") + "\"";
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
            tables.push("\"" + k.split(".").join("\".\"") + "\"");
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

        const finalized = sql + filteredInfos;
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
        this.dataTableCounter++;
        console.log('executeQuery Start');
        this.loading = true;
        this._crud.anyQuery(new QueryRequest(this.editorGenerated.getCode(), false)).subscribe(
                res => {
                    const result = <ResultSet>res;
                    this.resultSet = result[0];
                    this.loading = false;
                }, err => {
                    this._toast.error('Unknown error on the server.');
            this.loading = false;
                }
        );
        if(this.dataTableCounter > 1){
            this.dataTable.resetExporationData();
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
                const fkId = fk.fkTableSchema + '.' + fk.fkTableName + '.' + fk.fkColumnName;
                const pkId = fk.pkTableSchema + '.' + fk.pkTableName + '.' + fk.pkColumnName;
                if (this.tables.get(fk.pkTableSchema + '.' + fk.pkTableName) !== undefined &&
                        this.tables.get(fk.fkTableSchema + '.' + fk.fkTableName) !== undefined) {
                    this.joinConditions.set(fkId + pkId, new JoinCondition(this.wrapInParetheses(fkId) + ' = ' + this.wrapInParetheses(pkId)));
                }
            });
        });
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
