import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FilteredUserInput, StatisticSet} from '../../../../components/data-table/models/result-set.model';
import {StatisticRequest} from '../../../../models/ui-request.model';
import {CrudService} from '../../../../services/crud.service';
import {ToastService} from '../../../../components/toast/toast.service';

@Component({
    selector: 'app-refinement-options',
    templateUrl: './refinement-options.component.html',
    styleUrls: ['./refinement-options.component.scss']
})
export class RefinementOptionsComponent implements OnInit {

    statisticSet: StatisticSet;
    filteredUserInput: FilteredUserInput;
    hasOptions = true;
    _choosenTables = {};
    optionsOpen = false;
    hasFiter = false;


    constructor(
        private _crud: CrudService,
        private _toast: ToastService
    ) {
    }

    ngOnInit() {
        this.getStatistic();
    }

    @Input()
    set choosenTables(choosenTables: {}){
        this._choosenTables = choosenTables;
    }

    getStatistic() {
        console.log('getStatistics');
        this._crud.allStatistics(new StatisticRequest()).subscribe(
            res => {
                this.processStatistics(<StatisticSet>res);
                console.log('before user stats');
                this.processUserInput(<StatisticSet>res);
                console.log('after user stats');
            }, err => {
                this._toast.toast('server error', 'Unknown error on the server.', 10, 'bg-danger');
            }
        );
    }

    includes(o: string[], name: string){
        return o.includes(name);
    }

    processUserInput(res: StatisticSet){
        console.log('test');
        this.filteredUserInput = res;
        console.log('choosenTables');
        console.log(this.filteredUserInput);
    }

    processStatistics(res: StatisticSet) {
        console.log('test processStatistics');
        console.log('statistc set');
        console.log(res);
        this.statisticSet = res;
        Object.keys(this.statisticSet).forEach(key => {
            const el = this.statisticSet[key];
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

                const uniqueValData = [];
                Object.keys(this.statisticSet[key]['uniqueValues']).forEach((i, k) => {
                    uniqueValData[i] = [k];
                });


                if(this.statisticSet[key]['options']){
                    // tslint:disable-next-line:forin
                    for(const i in uniqueValData){
                        this.statisticSet[key]['options']['uniqueValues'].push(i);
                    }
                } else{
                    this.statisticSet[key]['options'] = {
                        uniqueValues: []
                    };
                    // tslint:disable-next-line:forin
                    for(const i in uniqueValData){
                        this.statisticSet[key]['options']['uniqueValues'].push(i);
                    }

                }

            }
        });
    }


    @Output() updateFilterSQL = new EventEmitter();

    updateMinMax(event: Object, name: String) {
        console.log('update min max');
        const updateType = 'minmax';
        const updated = {name, event, updateType};
        this.updateFilterSQL.emit(updated);
    }

    updateCheck(event: Object, name: String){
        console.log('update Checkbox');
        const updateType = 'check';
        const updated = {name, event, updateType};
        this.updateFilterSQL.emit(updated);
    }

    sortAscending(event: Object, name: String){
        console.log('sort ascending');
        const updateType = 'ASC';
        const updated = {name, event, updateType};
        console.log(updated);
        this.updateFilterSQL.emit(updated);
    }
    sortDescending(event: Object, name: String){
        console.log('sort descending');
        const updateType = 'DESC';
        const updated = {name, event, updateType};
        console.log(updated);
        this.updateFilterSQL.emit(updated);
    }

    sortOff(event: Object, name: String){
        console.log('sort descending');
        const updateType = 'OFF';
        const updated = {name, event, updateType};
        console.log(updated);
        this.updateFilterSQL.emit(updated);
    }

    /**
     * Toggle visability of additonal refinement options
     */
    toggleOptions() {
        this.optionsOpen = !this.optionsOpen;
    }
}
