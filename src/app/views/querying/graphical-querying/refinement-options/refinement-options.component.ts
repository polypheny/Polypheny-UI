import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';
import {FilteredUserInput, StatisticSet} from '../../../../components/data-view/models/result-set.model';
import {StatisticRequest} from '../../../../models/ui-request.model';
import {CrudService} from '../../../../services/crud.service';
import {ToasterService} from '../../../../components/toast-exposer/toaster.service';

@Component({
    selector: 'app-refinement-options',
    templateUrl: './refinement-options.component.html',
    styleUrls: ['./refinement-options.component.scss']
})

export class RefinementOptionsComponent implements OnInit {

    activeHeaders: {};
    statisticSet: StatisticSet;
    filteredUserInput: FilteredUserInput;
    stylingSet: {};
    _choosenTables = {};
    active: String;
    @Output() filteredUserInputChange = new EventEmitter();

    constructor(
        private _crud: CrudService,
        private _toast: ToasterService
    ) {
    }

    ngOnInit() {
        this.getStatistic();
    }

    /**
     * to only show the filter options for the chosen Tables
     */
    @Input()
    set choosenTables(choosenTables: {}) {
        const oldChoosen = this._choosenTables;
        this._choosenTables = choosenTables;

        if (choosenTables && ((oldChoosen === null) || JSON.stringify(oldChoosen['column']) !== JSON.stringify(choosenTables['column']))) {
            this.resetHeader(choosenTables);
        }
    }

    resetHeader(choosenTables) {
        if (!this.stylingSet || !choosenTables) {
            return;
        }
        this.activeHeaders = {};
        Object.keys(this.stylingSet).forEach(s => {
            let i = 0;
            Object.keys(this.stylingSet[s]).forEach(t => {
                if (choosenTables !== null && this.includesTable(choosenTables['column'], t) && i === 0) {
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
        this._crud.allStatistics(new StatisticRequest()).subscribe(
            res => {
                this.prepareStatisticSet(<StatisticSet>res);
                this.stylingSet = res;
            }, err => {
                this._toast.error('Unknown error on the server.');
            }
        );
    }

    /**
     * Checks if a column value is included in the chosen table
     */
    includes(o: string[], name: string) {
        return o.includes(name);
    }

    /**
     * Checks if a schema is included in the chosen tables
     */
    includesSchema(o, name: string) {
        const schema = [];
        if (!o || !o.length) {
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
    includesTable(o, name: string) {
        const schema = [];
        if (!o || !o.length) {
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
    changeUserInput() {
        const transmitSet = new FilteredUserInput();
        this._choosenTables['column'].forEach(el => {
            if (this.filteredUserInput.hasOwnProperty(el)) {
                if (this.statisticSet[el]['columnType'] === 'temporal') {
                    const {getLabel, getNumber, step} = this.getTemporal(this.statisticSet[el]['temporalType']);
                    const fel = this.filteredUserInput[el];

                    transmitSet[el] = {
                        ...fel,
                        minMax: fel['minMax'].map(getLabel).map(d => `'${d}'`),
                        startMinMax: fel['startMinMax'].map(getLabel).map(d => `'${d}'`)
                    };
                } else {
                    transmitSet[el] = this.filteredUserInput[el];
                }

            }
        });
        this.filteredUserInputChange.emit(transmitSet);
    }

    /**
     * initializing filteredUserInput for dynamic binding
     */
    processUserInput(stat: StatisticSet) {
        this.filteredUserInput = new FilteredUserInput();
        Object.keys(stat).forEach(key => {
            this.filteredUserInput[key] = {};
            const el = this.statisticSet[key];
            if (el['min'] && el['max']) {
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
    prepareStatisticSet(res: StatisticSet) {
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
            if (el['min'] && el['max']) {
                if (this.statisticSet[key]['type']) {
                    this.statisticSet[key]['type'].push('range');
                } else {
                    this.statisticSet[key]['type'] = ['range'];
                }
                if (el['columnType'] === 'temporal') {
                    let {getLabel, getNumber, step} = this.getTemporal(el['temporalType']);
                    el['min'] = getNumber(el['min']);
                    el['max'] = getNumber(el['max']);
                    this.statisticSet[key]['options'] = {
                        floor: el['min'],
                        ceil: el['max'],
                        translate: getLabel,
                        step,
                        uniqueValues: []
                    };
                } else {
                    this.statisticSet[key]['options'] = {
                        floor: el['min'],
                        ceil: el['max'],
                        step: 1,
                        uniqueValues: []
                    };
                }
            }
            if (this.statisticSet[key]['uniqueValues']) {
                if (this.statisticSet[key]['type']) {
                    this.statisticSet[key]['type'].push('uniqueValues');
                } else {
                    this.statisticSet[key]['type'] = ['uniqueValues'];
                }
            }
        });
    }

    filterHeaders(stylingSet: {}, choosenTable: {}, schema: string) {
        if (!choosenTable && !choosenTable['column']) {
            return [];
        }
        const filtered = {};
        Object.keys(stylingSet).forEach((table, i) => {
            if (this.includesTable(choosenTable['column'], table)) {
                filtered[table] = stylingSet[table];
            }
        });
        return filtered;
    }

    addToHeader(schema: string, table: string) {
        if (!this.activeHeaders) {
            this.activeHeaders = {};
        }
        this.activeHeaders[schema] = table;
    }

    hasMultipleSchemas() {
        return Object.keys(this.stylingSet).length > 1;
    }

    filterSet(inputSet: {}) {
        if (!inputSet || !this._choosenTables || !this._choosenTables['column']) {
            return {};
        }
        const filtered = {};
        Object.keys(inputSet).forEach(e => {
            if (this.includes(this._choosenTables['column'], inputSet[e]['qualifiedColumnName'])) {
                filtered[e] = inputSet[e];
            }
        });
        return filtered;
    }

    getTemporal(temporalType: string) {
        let getNumber, getLabel, step;
        if (temporalType == 'TIME') {
            getNumber = (ts: string) => new Date('2020-01-01 ' + ts).getTime() / 1000;
            getLabel = (time: number, type: any) => new Date(time * 1000).toISOString().slice(11, 19);
            step = 1; // 1000ms = 1s
        } else if (temporalType == 'DATE') {
            getNumber = (ts: string) => {
                console.log('date slider,getNumber', ts);
                return new Date(ts).getTime() / 1000;
            };
            getLabel = (time: number, type: any) => time ? new Date(time * 1000).toISOString().slice(0, 10) : '';
            step = 86400; // 1000ms * 60s * 60min * 24hrs = 1day
        } else {
            getNumber = (ts: string) => new Date(ts).getTime() / 1000;
            getLabel = (time: number, type: any) => new Date(time * 1000).toISOString().slice(0, 19).replace('T', ' ');
            step = 1;
        }
        return {getLabel, getNumber, step};
    }
}
