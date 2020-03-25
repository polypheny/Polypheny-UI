import {Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {QueryExplorationRequest, QueryRequest, SchemaRequest} from '../../../models/ui-request.model';
import {CrudService} from '../../../services/crud.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ExplorColSet, ResultSet, SelectedColSet} from '../../../components/data-table/models/result-set.model';
import {ToastService} from '../../../components/toast/toast.service';
import * as dot from 'graphlib-dot';
import * as dagreD3 from 'dagre-d3';
import * as d3 from 'd3';
import {DataTableComponent} from '../../../components/data-table/data-table.component';


@Component({
    selector: 'app-explore-by-example',
    templateUrl: './explore-by-example.component.html',
    styleUrls: ['./explore-by-example.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class ExploreByExampleComponent implements OnInit {

    @ViewChild('editGenerated', {static: false}) editGenerated;
    schema: {};
    loading = false;
    resultSet: ResultSet;
    exploreCols: ExplorColSet;
    selectedCols: SelectedColSet;
    choosenTables = [];
    ids = [];
    tables = [];

    @ViewChild(DataTableComponent, {static: false}) dataTable: DataTableComponent;

    constructor(
            private _crud: CrudService,
            private _leftSidebar: LeftSidebarService,
            private _toast: ToastService) {
    }

    ngOnInit() {

        this._leftSidebar.setTableSchema(new SchemaRequest('views/explore-by-example/', false, 2));
        this._leftSidebar.setAction((node) => {
            if (!node.isActive && node.isLeaf) {
                console.log('testing');
                console.log(node);
                console.log(node.data['id']);
                this.choosenTables.push(node.data['id']);
                this.buildObject(this.schema);
                node.setIsActive(true, true);
            } else if (node.isActive && node.isLeaf) {
                node.setIsActive(false, true);
            }
        });

        this._crud.getSchema(new SchemaRequest('views/explore-by-example/', false, 3)).subscribe(
                res => {
                    this.schema = res;
                    console.log('schema');
                    console.log(res);
                }, err => {
                    console.log(err);
                }
        );

    }

    buildObject(schema: {}) {
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
                            console.log(this.exploreCols);
                            console.log('show me if this works for the col names: ' + id.replace(table, ''));
                        }));
                    }
                });
            });
        });
        if(this.ids.length < 11){
            this.generateTableSQL(this.ids, this.tables);
        }
    }


    selectedColumns() {
        const id = [];
        console.log(this.exploreCols);
        Object.keys(this.exploreCols).forEach(value => {
            if (this.exploreCols[value] === true){
                id.push(value);
            }
        });
        console.log('shwo me the table in selected cols' + this.tables);
        this.generateTableSQL(id, this.tables);

    }

    generateTableSQL(ids, tables) {
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

        console.log('show me the sql statement' + sql);


        this.sendSQL(sql);
    }


    sendSQL(sql: string) {
        //this.editGenerated.setCode(sql);
        console.log('executeQuery for explore by example');
        this.loading = true;
        this._crud.createQuery(new QueryExplorationRequest(sql, false)).subscribe(
                res => {

                    console.log(res);
                    this.resultSet = <ResultSet>res;
                    this.loading = false;
                    /*const initialResult = result[0];
                    this.resultSet = initialResult;
                    //this.prepareResultSet(initialResult);
                    console.log('THIS IS THA RESULT SET');
                    console.log(initialResult);

                    this.loading = false;*/
                }, err => {
                    this._toast.error('Unknown error on the server.');
                    this.loading = false;
                }
        );
    }

    prepareResultSet(res) {
        (res['data']).forEach(value => {
            console.log('show me the value');
            console.log(value);
            console.log('can i see the new change');
            value.push('test');

            /**
             (value['data'].forEach(data =>{
                console.log('show me the data');
                console.log(data);

            }));**/
        });
        this.resultSet = res;
    }



}
