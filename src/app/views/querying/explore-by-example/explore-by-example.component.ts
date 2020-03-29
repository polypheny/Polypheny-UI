import {Component, OnInit, ViewChild, ViewEncapsulation} from '@angular/core';
import {QueryExplorationRequest, QueryRequest, SchemaRequest} from '../../../models/ui-request.model';
import {CrudService} from '../../../services/crud.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {ExplorColSet, ResultSet, SelectedColSet} from '../../../components/data-table/models/result-set.model';
import {ToastService} from '../../../components/toast/toast.service';
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
    choosenTables = [];
    ids = [];
    tables = [];
    colNames = [];
    showResultTable: boolean;

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
                this.choosenTables.push(node.data['id']);
                this.processSchema(this.schema);
                node.setIsActive(true, true);
            } else if (node.isActive && node.isLeaf) {
 
                const tables = [];
                this.choosenTables.forEach( value => {
                    if(value !== node.data['id']){
                        tables.push(value);
                    }
                });
                this.choosenTables = tables;
                this.processSchema(this.schema);
                node.setIsActive(false, true);
            }
        });


        this._crud.getSchema(new SchemaRequest('views/explore-by-example/', false, 3)).subscribe(
                res => {
                    this.schema = res;
                }, err => {
                    console.log(err);
                }
        );

    }

    processSchema(schema: {}) {
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
        this.showResultTable = false;
        if(this.ids.length < 11 && this.tables.length > 0){
            this.showResultTable = true;
            this.generateTableSQL(this.ids, this.tables);
        }
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

    //TODO Isabel Joins not possible at the moment
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
