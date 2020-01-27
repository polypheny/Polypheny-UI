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

    statisticSet: StatisticSet;
    filteredUserInput: FilteredUserInput;
    _choosenTables = {};

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
        this._choosenTables = choosenTables;
        console.log('test');
        console.log(this._choosenTables);
    }

    /**
     * get filter statistics form data sets
     */
    getStatistic() {
        console.log('getStatistics');
        this._crud.allStatistics(new StatisticRequest()).subscribe(
            res => {
                this.prepareStatisticSet(<StatisticSet>res);
            }, err => {
                this._toast.toast('server error', 'Unknown error on the server.', 10, 'bg-danger');
            }
        );
    }

    includes(o: string[], name: string){
        return o.includes(name);
    }

    /**
     * after changing the filter values emiting changes for graphical-querying component
     */
    @Output() filteredUserInputChange = new EventEmitter();
    changeUserInput(){
        console.log('filteredUserInput');
        console.log(this.filteredUserInput);
        /*this.filteredUserInputChange.emit(this.filteredUserInput);
        console.log('show me this chosen tables');
        console.log(this._choosenTables);*/

        const transmitSet = new FilteredUserInput();
        this._choosenTables['column'].forEach(el => {
            console.log('inside for each');
            console.log(el);
            if (this.filteredUserInput.hasOwnProperty(el)){
                console.log('inside if');
                console.log(el);
                transmitSet[el] = this.filteredUserInput[el];
                //this.filteredUserInput[el] = this.statisticSet[el];
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

            /** after implementing isFull on the server side to try to store the checkbox values differently
            if(el['isFull'] === false){
                this.filteredUserInput[key]['check'] = [];

                Object.keys(el['uniqueValues']).forEach(els =>{
                    const uniqueVal = el['uniqueValues'][els];

                    this.filteredUserInput[key]['check'].push(uniqueVal);
                });
            }
             **/
        });
    }

    prepareStatisticSet (res: StatisticSet) {
        console.log('statistics I get');
        console.log(res);
        this.statisticSet = new StatisticSet();
        Object.keys(res).forEach(keySchema => {
            Object.keys(res[keySchema]).forEach(keyTable => {
                Object.keys(res[keySchema][keyTable]).forEach(key => {
                    this.statisticSet[res[keySchema][keyTable][key]['fullColumnName']] = res[keySchema][keyTable][key];
                });
            });
        });
        console.log('print my new statisicset');
        console.log(this.statisticSet);
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

}
