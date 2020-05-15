import {Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation, TemplateRef, Output, EventEmitter} from '@angular/core';
import * as $ from 'jquery';
import {EditTableRequest, QueryExplorationRequest, SchemaRequest} from '../../../models/ui-request.model';
import {CrudService} from '../../../services/crud.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ExplorColSet, ExploreSet, ResultSet} from '../../../components/data-table/models/result-set.model';
import {ToastService} from '../../../components/toast/toast.service';
import {DataTableComponent} from '../../../components/data-table/data-table.component';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {ForeignKey, Uml} from '../../uml/uml.model';
import {  BsModalService, BsModalRef  } from 'ngx-bootstrap/modal';
import {Subscription} from 'rxjs';

@Component({
    selector: 'app-explore-by-example',
    templateUrl: './explore-by-example.component.html',
    styleUrls: ['./explore-by-example.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ExploreByExampleComponent implements OnInit, OnDestroy {


    @ViewChild('editGenerated', {static: false}) editGenerated;
    loading = false;
    resultSet: ResultSet;
    showResultTable: boolean;
    join = [];
    classificationPossible = true;
    @ViewChild('template', {static: false}) public template: TemplateRef<any>;
    @ViewChild('informationExploreProcess', {static: false}) public informationExploreProcess: TemplateRef<any>;
    @Output() tutorialModeChange = new EventEmitter();
    @ViewChild(DataTableComponent, {static: false}) dataTable: DataTableComponent;
    private subscriptions = new Subscription();
    constraints = new Map<string, string>();
    schemas = new Map<string, string>();
    umlData = new Map<string, Uml>();//schemaName, uml
    joinConditions = new Map<string, JoinCondition>();
    tab = new Map<string, number>();//tableName, number of columns of this table
    tables = new Map<string, number>();//tableName, number of columns of this table
    columns = new Map<string, SidebarNode>();//columnId, columnName

    modalRef: BsModalRef;
    tutorialMode = false;
    tableModeImage = 'assets/img/explore/tutorialModeTable.PNG';
    exploreId = 0;
    cPage = 1;


    constructor(
            private _crud: CrudService,
            private _leftSidebar: LeftSidebarService,
            private _toast: ToastService,
            private modalService: BsModalService) {
    }


    ngOnInit() {
        this._leftSidebar.open();
        this.initSchema();
        const sub = this._crud.onReconnection().subscribe(
                b => {
                    if(b) { this.initSchema(); }
                }
        );
        this.subscriptions.add(sub);


    }

    initSchema() {
        this._crud.getSchema(new SchemaRequest('views/graphical-querying/', false, 3)).subscribe(
                res => {
                    const nodeAction = (tree, node, $event) => {
                        if (!node.isActive && node.isLeaf) {
                            this.addCol(node.data);
                            node.setIsActive(true, true);
                        } else if (node.isActive && node.isLeaf) {
                            node.setIsActive(false, true);
                            this.removeCol(node.data.id);

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
        this.generateJoinConditions();

    }

    ngOnDestroy(): void {
        this._leftSidebar.close();
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
                    this.joinConditions.set(fkId + pkId, new JoinCondition(fkId + ' = ' + pkId));
                }
            });
        });
    }

    selectedColumns() {
        this.resultSet = null;
        const id = [];
        const table = [];
        this.columns.forEach((v, k) =>{
            id.push(k);
        });

        this.tables.forEach((v, k) =>{
           table.push(k);
        });

        if(table.length > 0){
            this.generateTableSQL(id, table);
        }else{
            this._toast.error('Please select at least one column from the left sidebar to start the process.');
        }

    }

    async generateTableSQL(ids, tables) {

        let sql = 'SELECT ';
        const cols = [];
        const tabs = [];
        ids.forEach(id => {
            cols.push(id);
        });
        sql += cols.join(', ');
        sql += '\nFROM ';
        tables.forEach(table => {
            tabs.push(table);
        });

        sql += tabs.join(', ');

        let counter = 0;
        const joinConditions = [];
        this.joinConditions.forEach((v, k) => {
            if (v.active) {
                counter++;
                joinConditions.push(v.condition);

            }
        });
        if (counter > 0) {
            sql += '\nWHERE ' + joinConditions.join(' AND ');
        }


        //console.log('sql: ' + sql);
        this.sendSQL(sql);
    }


    openModal(template: TemplateRef<any>) {
        this.modalRef = this.modalService.show(template);
    }

    sendSQL(sql: string) {
        this.showResultTable = true;
        this.loading = true;
        this._crud.createInitialExploreQuery(new QueryExplorationRequest(sql, false, this.cPage)).subscribe(
                res => {
                    this.resultSet = <ResultSet>res;
                    if(this.resultSet.error){
                        this._toast.error(this.resultSet.error);
                        return;
                    }
                    this.exploreId= this.resultSet.explorerId;

                    if(this.tutorialMode && this.classificationPossible){
                        this.openModal(this.informationExploreProcess);
                    }
                    this.loading = false;
                    this.classificationPossible = this.resultSet.classificationInfo !== 'NoClassificationPossible';
                    if(!this.classificationPossible){
                        this._toast.warn('Not enough Data to use the classification. All available data is already within the initial table.');
                    }
                    this._toast.success('Initial table successfully loaded.');
                }, err => {
                    this._toast.error('Creation of initial table failed.');
                    this.loading = false;
                }
        );
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
