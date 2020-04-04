import {Component, OnDestroy, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {ColumnRequest, EditTableRequest, QueryExplorationRequest, QueryRequest, SchemaRequest} from '../../../models/ui-request.model';
import {CrudService} from '../../../services/crud.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ExplorColSet, ResultSet, SelectedColSet} from '../../../components/data-table/models/result-set.model';
import {ToastService} from '../../../components/toast/toast.service';
import {DataTableComponent} from '../../../components/data-table/data-table.component';
import {SidebarNode} from '../../../models/sidebar-node.model';


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
                            this.choosenTables.push(node.data['id']);
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
                            this.ids.push(id);
                            this.exploreCols[id] = false;
                        }));
                    }
                });
            });
        });
        await this.getConstraints(this.tables);

        console.log("i am first");

        this.showResultTable = false;
        if(this.ids.length < 11 && this.tables.length > 0) {
            this.showResultTable = true;
            this.generateTableSQL(this.ids, this.tables);
        }
    }


    async getConstraints (tables: string[]) {
        this.constraints = new Map<string, string>();
        console.log("i am first...");
        for( const table of tables){
            await this._crud.getConstraints( new ColumnRequest(table) ).toPromise().then(
                    async res => {
                        console.log("test");
                        const constraintsInfo = <ResultSet> res;
                        if (constraintsInfo.data.length > 0){
                            this.constraints.set(table, constraintsInfo.data.toString());
                        }
                        await this.generateJoinConditions();
                        console.log('test');
                        console.log(this.constraints);
                    }, err => {
                        console.log(err);
                        console.log('fehler mit constraint');
                    }
            );
        }
        console.log("why here");
    }

    async generateJoinConditions(){
        const keyValue = [];
        const name = [];
        const fullName = [];
        const keyValues = new Map<string, string>();
        this.join = [];
        let values =[];
        console.log('generateJoinCondition');

        this.constraints.forEach((value, key) => {


            values = value.split(',');

            console.log('testing again');
            console.log('values: ' + values);
            console.log('value: ' + value);
            console.log(values[1]);
            console.log(values[2]);
            console.log('show me the values length: ' + values.length);
            if (values[1] === 'PRIMARY KEY' || values[1] === 'FOREIGN KEY') {
                console.log('am I in the if');
                if (name.includes(values[2])) {
                    console.log('test if I am in the second if');
                    if ((values[1] === 'PRIMARY KEY' && keyValues.get(fullName[name.indexOf(values[2])]) === 'FOREIGN KEY') || (values[1] === 'FOREIGN KEY' && keyValues.get(fullName[name.indexOf(values[2])]) === 'PRIMARY KEY')) {
                        console.log('inside of if where join is made');
                        console.log(fullName[name.indexOf(values[2])] + '=' + key + '.' + values[2]);
                        this.join.push(fullName[name.indexOf(values[2])] + ' = ' + key + '.' + values[2]);
                    }
                }
                keyValues.set(key + '.' + values[2], values[1]);
                keyValue.push(values[1]);
                name.push(values[2]);
                fullName.push(key + '.' + values[2], values[1]);
            }

            });

        console.log('keyvale:' + keyValue);
        console.log('name: '+ name);
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
        const tab = [];
        ids.forEach(id => {
            cols.push(id);
        });
        sql += cols.join(', ');
        sql += '\nFROM ';
        tables.forEach(table => {
            tab.push(table);
        });

        sql += tab.join(', ');
        if(this.join !== undefined && this.join.length > 0){
            sql += '\nWHERE ' + this.join.join('AND ');
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
