import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {StatisticSet} from '../../../../components/data-table/models/result-set.model';
import {StatisticRequest} from '../../../../models/ui-request.model';
import {CrudService} from '../../../../services/crud.service';
import {ToastService} from '../../../../components/toast/toast.service';
import {Options} from 'ng5-slider';

@Component({
    selector: 'app-refinement-options',
    templateUrl: './refinement-options.component.html',
    styleUrls: ['./refinement-options.component.scss']
})
export class RefinementOptionsComponent implements OnInit {

    statisticSet: StatisticSet;
    hasOptions = true;
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

    getStatistic() {
        console.log('getStatistics');
        this._crud.allStatistics(new StatisticRequest()).subscribe(
            res => {
                console.log('response received');
                console.log(res);
                this.processStatistics(<StatisticSet>res);
            }, err => {
                this._toast.toast('server error', 'Unknown error on the server.', 10, 'bg-danger');
            }
        );
        /*let dummyResult:Object = {
            'test.test.id':
                {
                    'name': 'id',
                    'min': 1,
                    'max': 10
                },
            'test.test.name':
                {
                    'name': 'name',
                    'min': 11,
                    'max': 333
                }

        };*/
        //this.processStatistics(<StatisticSet>dummyResult);
    }

    includes(o: string[], name: string){
        return o.includes(name);
    }



    processStatistics(res: StatisticSet) {
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
                }else{
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


    /**
     * Toggle visability of additonal refinement options
     */
    toggleOptions() {
        this.optionsOpen = !this.optionsOpen;
    }
}
