import {Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {ColumnRequest, EditTableRequest, PrimaryForeignKeyRequest, QueryExplorationRequest, QueryRequest, SchemaRequest} from '../../../models/ui-request.model';
import {CrudService} from '../../../services/crud.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ExplorColSet, ResultSet, SelectedColSet} from '../../../components/data-table/models/result-set.model';
import {ToastService} from '../../../components/toast/toast.service';
import {DataTableComponent} from '../../../components/data-table/data-table.component';
import {SidebarNode} from '../../../models/sidebar-node.model';
import {ForeignKey, Uml} from '../../uml/uml.model';


@Component({
    selector: 'app-explore-by-example',
    templateUrl: './explore-by-example.component.html',
    styleUrls: ['./explore-by-example.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ExploreByExampleComponent implements OnInit, OnDestroy{


    @ViewChild('editGenerated', {static: false}) editGenerated;
    schema: {};
    loading = false;
    resultSet: ResultSet;
    exploreCols: ExplorColSet;
    choosenTables = [];
    ids = [];
    tables = [];
    colNames = [];
    showResultTable: boolean;
    join = [];

    @ViewChild(DataTableComponent, {static: false}) dataTable: DataTableComponent;
    constraints = new Map<string, string>();
    schemas = new Map<string, string>();
    umlData = new Map<string, Uml>();//schemaName, uml
    joinConditions = new Map<string, JoinCondition>();
    tab = new Map<string, number>();//tableName, number of columns of this table

    constructor(
            private _crud: CrudService,
            private _leftSidebar: LeftSidebarService,
            private _toast: ToastService) {
    }

    ngOnInit() {
        this._crud.getSchema(new SchemaRequest('views/graphical-querying/', false, 2)).subscribe(
                res => {
                    const nodeAction = (tree, node, $event) => {
                        if (!node.isActive && node.isLeaf) {
                            this.choosenTables.push(node.data.id);
                            this.processSchema(this.schema);
                            node.setIsActive(true, true);
                        } else if (node.isActive && node.isLeaf) {

                            const tables = [];
                            this.choosenTables.forEach(value => {
                                if (value !== node.data['id']) {
                                    tables.push(value);
                                }
                            });
                            this.choosenTables = tables;
                            this.processSchema(this.schema);
                            node.setIsActive(false, true);
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


        this._crud.getSchema(new SchemaRequest('views/explore-by-example/', false, 3)).subscribe(
                res => {
                    this.schema = res;
                }, err => {
                    console.log(err);
                }
        );
    }

    ngOnDestroy(): void {
       this._leftSidebar.close();
    }

    async processSchema(schema: {}) {
        this.exploreCols = new ExplorColSet();
        this.ids = [];
        this.tables = [];
        Object.keys(schema).forEach(child1 => {
            (schema[child1]['children']).forEach(child2 => {
                (child2['children']).forEach(child3 => {
                    const table = child3['id'];
                    if (this.choosenTables && this.choosenTables.includes(table)) {
                        this.tables.push(table);
                        (child3['children'].forEach(value => {
                            const id = value['id'];
                            this.getConstraints(value);
                            this.ids.push(id);
                            this.exploreCols[id] = false;
                        }));
                    }
                });
            });
        });
        //await this.getConstraints(this.tables);

        this.showResultTable = false;
        if(this.ids.length < 11 && this.tables.length > 0) {
            this.showResultTable = true;
            this.generateTableSQL(this.ids, this.tables);
        }
    }


    async getConstraints (value) {

        console.log('id: ' + value.id);
        console.log('name: ' + value.name);
        const treeElement = new SidebarNode(value.id, value.name, null, null);

        if (this.tab.get(treeElement.getTable()) !== undefined) {
            this.tab.set(treeElement.getTable(), this.tab.get(treeElement.getTable()) + 1);
        } else {
            this.tab.set(treeElement.getTable(), 1);
        }

        if (this.schemas.get(treeElement.getSchema()) === undefined) {
            this.schemas.set(treeElement.getSchema(), treeElement.getSchema());
            this._crud.getUml(new EditTableRequest(treeElement.getSchema())).subscribe(
                    res => {
                        const uml = <Uml>res;
                        console.log('uml foreignkeys: ' + uml);
                        this.umlData.set(treeElement.getSchema(), uml);
                        this.generateJoinConditions();
                    }, err => {
                        this._toast.error('Could not get foreign keys of the schema ' + treeElement.getSchema());
                    }
            );
        } else {
            this.generateJoinConditions();
        }
        
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
                if (this.tab.get(fk.pkTableSchema + '.' + fk.pkTableName) !== undefined &&
                        this.tab.get(fk.fkTableSchema + '.' + fk.fkTableName) !== undefined) {
                    this.joinConditions.set(fkId + pkId, new JoinCondition(fkId + ' = ' + pkId));
                    console.log('fkId; ' + fkId);
                    console.log('pkId: ' + pkId);
                }
            });
        });
        console.log('join: ' + this.joinConditions.values() + 'more: ' + this.joinConditions.keys());
    }


    selectedColumns() {
        const id = [];
        Object.keys(this.exploreCols).forEach(value => {
            if (this.exploreCols[value] === true){
                id.push(value);
            }
        });
        this.generateTableSQL(id, this.tables);
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


        console.log('sql: ' + sql);
        this.sendSQL(sql);
    }


    sendSQL(sql: string) {
        this.showResultTable = true;
        this.loading = true;
        this._crud.createQuery(new QueryExplorationRequest(sql, false)).subscribe(
                res => {
                    this.resultSet = <ResultSet>res;
                    this.loading = false;

                }, err => {
                    this._toast.error('Unknown error on the server.');
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
