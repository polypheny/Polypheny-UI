import {Component, Input, OnInit} from '@angular/core';
import {EntityConfig} from '../../../../../components/data-view/data-table/entity-config';
import {Result} from '../../../../../components/data-view/models/result-set.model';

@Component({
    selector: 'app-db-poly-output',
    templateUrl: './nb-poly-output.component.html',
    styleUrls: ['./nb-poly-output.component.scss'],
    standalone: false
})
export class NbPolyOutputComponent implements OnInit {

    @Input() resultSet: Result<any, any>;
    @Input() resultVariable: string;
    @Input() resultIsTooLong: boolean;

    tableConfig: EntityConfig = {
        create: false,
        update: false,
        delete: false,
        sort: false,
        search: false,
        exploring: false,
        hideCreateView: true
    };

    constructor() {
    }

    ngOnInit(): void {
    }
}
