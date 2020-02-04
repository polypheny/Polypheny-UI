import {Component, EventEmitter, Input, OnInit, Output, NgModule} from '@angular/core';
import * as $ from 'jquery';
import {FilteredUserInput, StatisticSet} from '../../../../components/data-table/models/result-set.model';
import {StatisticRequest} from '../../../../models/ui-request.model';
import {CrudService} from '../../../../services/crud.service';
import {ToastService} from '../../../../components/toast/toast.service';
import {BrowserModule} from '@angular/platform-browser';
import {FormsModule} from '@angular/forms';
import {AppComponent} from '../../../../app.component';


@Component({
    selector: 'app-refinement-options',
    templateUrl: './refinement-options.component.html',
    styleUrls: ['./refinement-options.component.scss']
})

@NgModule({
    imports: [
        BrowserModule,
        FormsModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class RefinementOptionsComponent implements OnInit {

    activeHeaders: {};
    statisticSet: StatisticSet;
    filteredUserInput: FilteredUserInput;
    stylingSet: {};
    _choosenTables = {};
    active: String;

    constructor(
        private _crud: CrudService,
        private _toast: ToastService
    ) {
    }

    ngOnInit() {
        this.getStatistic();
        this.popOverToggle();

    }


    popOverToggle(){

        $(function () {
            $('[data-toggle="popover"]').popover();
        });

        $('.input-group-prepend').popover('show');
    }

    /**
     * to only show the filter options for the chosen Tables
     */
    @Input()
    set choosenTables(choosenTables: {}){
        const oldChoosen = this._choosenTables;
        this._choosenTables = choosenTables;


        if( choosenTables && ((oldChoosen === null) || JSON.stringify(oldChoosen['column']) !== JSON.stringify(choosenTables['column']))){
            this.resetHeader(choosenTables);
        }

    }

    resetHeader(choosenTables) {
        if(!this.stylingSet || !choosenTables ){
            return;
        }
        this.activeHeaders = {};
        Object.keys(this.stylingSet).forEach(s => {
            let i = 0;
            Object.keys(this.stylingSet[s]).forEach( t => {
                if(choosenTables !== null && this.includesTable(choosenTables['column'], t) && i === 0 ){
                    this.activeHeaders[s] = t;
                    i++;
                }
            });
        });
    }

    /**
     * get filter statistics form data sets
     */
    getStatistic() {
        console.log('getStatistics');
        this._crud.allStatistics(new StatisticRequest()).subscribe(
            res => {
                this.prepareStatisticSet(<StatisticSet>res);
                this.stylingSet = res;
            }, err => {
                this._toast.toast('server error', 'Unknown error on the server.', 10, 'bg-danger');
            }
        );
    }

    /**
     * Checks if a column value is included in the chosen table
     */
    includes(o: string[], name: string){
        return o.includes(name);
    }

    /**
     * Checks if a schema is included in the chosen tables
     */
    includesSchema(o, name: string){
        const schema = [];
        if( !o || !o.length ) {
            return false;
        }
        o.forEach(s => {
           schema.push(s.split('.', 1)[0]);
        });
        return this.includes(schema, name);
    }

    /**
     * Checks if a table is chosen
     */
    includesTable(o, name: string){
        const schema = [];
        if( !o || !o.length ) {
            return false;
        }
        o.forEach(s => {
            schema.push(s.split('.')[1]);
        });
        return this.includes(schema, name);
    }

    /**
     * after changing the filter values emiting changes for graphical-querying component
     */
    @Output() filteredUserInputChange = new EventEmitter();
    changeUserInput(){
        const transmitSet = new FilteredUserInput();
        this._choosenTables['column'].forEach(el => {
            if (this.filteredUserInput.hasOwnProperty(el)){
                transmitSet[el] = this.filteredUserInput[el];
            }
        });
        this.filteredUserInputChange.emit(transmitSet);
    }

    /**
     * initializing filteredUserInput for dynamic binding
     */
    processUserInput(stat: StatisticSet){
        this.filteredUserInput = new FilteredUserInput();
        Object.keys(stat).forEach(key => {
            this.filteredUserInput[key] = {};
            const el = this.statisticSet[key];
            if(el['min'] && el['max']){
                this.filteredUserInput[key]['minMax'] = [el['min'], el['max']];
                this.filteredUserInput[key]['startMinMax'] = [el['min'], el['max']];
            }
            this.filteredUserInput[key]['sorting'] = 'OFF';
            this.filteredUserInput[key]['aggregate'] = 'OFF';
            this.filteredUserInput[key]['columnType'] = el['columnType'];

        });
    }

    /**
     * prepares the statisticSet from Server
     */
    prepareStatisticSet (res: StatisticSet) {
        this.statisticSet = new StatisticSet();
        Object.keys(res).forEach(keySchema => {
            Object.keys(res[keySchema]).forEach(keyTable => {
                Object.keys(res[keySchema][keyTable]).forEach(key => {
                    this.statisticSet[res[keySchema][keyTable][key]['qualifiedColumnName']] = res[keySchema][keyTable][key];
                });
            });
        });
        this.processStatistics(this.statisticSet);
        this.processUserInput(this.statisticSet);
    }

    /**
     * add additional information to the statistics for the components
     */
    processStatistics(stat: StatisticSet) {
        Object.keys(stat).forEach(key => {
            const el = stat[key];
            if(el['min'] && el['max']){
                if(this.statisticSet[key]['type']){
                    this.statisticSet[key]['type'].push('range');
                }else {
                    this.statisticSet[key]['type'] = ['range'];
                }
                this.statisticSet[key]['options'] = {
                    floor: el['min'],
                    ceil: el['max'],
                    step: 1,
                    uniqueValues: []
                };
            }
            if(this.statisticSet[key]['uniqueValues']){
                if(this.statisticSet[key]['type']){
                    this.statisticSet[key]['type'].push('uniqueValues');
                }else{
                    this.statisticSet[key]['type'] = ['uniqueValues'];
                }
            }
        });
    }

    filterHeaders(stylingSet: {}, choosenTable: {}, schema: string) {
        if (!choosenTable && !choosenTable['column'] ){
            return [];
        }
        const filtered = {};
        Object.keys(stylingSet).forEach((table, i) => {
            if(this.includesTable(choosenTable['column'], table)){
                filtered[table] = stylingSet[table];
            }
        });
        return filtered;
    }

    addToHeader(schema: string, table: string) {
        if( !this.activeHeaders ){
            this.activeHeaders = {};
        }
        this.activeHeaders[schema] = table;
    }

    hasMultipleSchemas() {
        return Object.keys(this.stylingSet).length > 1;
    }

    filterSet(inputSet: {}) {
        if(!inputSet || !this._choosenTables || !this._choosenTables['column']) {
            return {};
        }
        const filtered =  {};
        Object.keys(inputSet).forEach(e => {
            if(this.includes(this._choosenTables['column'], inputSet[e]['qualifiedColumnName'])){
            filtered[e] = inputSet[e];
            }
        });
        return filtered;
    }
}
