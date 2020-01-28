import {Component, EventEmitter, Input, OnInit, Output, NgModule} from '@angular/core';
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
    }

    /**
     * to only show the filter options for the chosen Tables
     */
    @Input()
    set choosenTables(choosenTables: {}){
        const oldChoosen = this._choosenTables;
        this._choosenTables = choosenTables;


        if( choosenTables && ( (oldChoosen === 'nothing' && choosenTables !== 'nothing') || JSON.stringify(oldChoosen['column']) !== JSON.stringify(choosenTables['column']))){
            this.resetHeader(choosenTables);
        }

    }

    resetHeader(choosenTables) {
        if(!this.stylingSet || !choosenTables || choosenTables === 'nothing'  ){
            return;
        }
        this.activeHeaders = {};
        Object.keys(this.stylingSet).forEach(s => {
            let i = 0;
            Object.keys(this.stylingSet[s]).forEach( t => {
                if(choosenTables !== 'nothing' && this.includesTable(choosenTables['column'], t) && i === 0 ){
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
                console.log('show me the stylingSet');
                console.log(this.stylingSet);

            }, err => {
                this._toast.toast('server error', 'Unknown error on the server.', 10, 'bg-danger');
            }
        );
    }

    includes(o: string[], name: string){
        return o.includes(name);
    }

    includesSchema(o, name: string){
        const schema = [];
        if( !o || o === 'nothing' || !o.length ) {
            return false;
        }
        o.forEach(s => {
           schema.push(s.split('.', 1)[0]);
        });
        return this.includes(schema, name);
    }

    includesTable(o, name: string){
        const schema = [];
        if( !o || o === 'nothing' || !o.length ) {
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
            this.filteredUserInput[key]['columnType'] = el['columnType'];

        });
    }

    prepareStatisticSet (res: StatisticSet) {
        this.statisticSet = new StatisticSet();
        Object.keys(res).forEach(keySchema => {
            Object.keys(res[keySchema]).forEach(keyTable => {
                Object.keys(res[keySchema][keyTable]).forEach(key => {
                    this.statisticSet[res[keySchema][keyTable][key]['fullColumnName']] = res[keySchema][keyTable][key];
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
            return null;
        }
        const filtered = {};
        Object.keys(stylingSet).forEach((table, i) => {
            if(this.includesTable(choosenTable['column'], table)){
                filtered[table] = stylingSet[table];
            }
        });

        /*if(choosenTable['column'] !== 'noting' && choosenTable['column']){
            this.activeHeaders = {};
            console.log('iside');
            console.log(choosenTable['column']);
            console.log(choosenTable);
            choosenTable['column'].forEach((table, index) => {
                if (index === 0) {
                    const splits = table.split('.');
                    this.activeHeaders[splits[0]] = splits[1];
                }
            });
            console.log('activ headers');
            console.log(this.activeHeaders);
        }*/

        return filtered;
    }

    addToHeader(schema: string, table: string) {
        console.log('clicked');
        console.log('clicked + ' + schema + ' ' + table);
        if( !this.activeHeaders ){
            this.activeHeaders = {};
        }
        this.activeHeaders[schema] = table;
    }

    hasMultipleSchemas() {
        return Object.keys(this.stylingSet).length > 1;
    }

    hasMultipleCols(schema: string, table: string, column: string) {
        let i = 0;
        this._choosenTables['column'].forEach(e => {
            const splits = e.split('.');
            if(splits[0] === schema && splits[1] === table ){
                i++;
            }
        });
        return i > 1;
    }
}
