import {Component, Input, OnInit} from '@angular/core';
import {ResultSet} from '../../../../../../components/data-view/models/result-set.model';
import {TableConfig} from '../../../../../../components/data-view/data-table/table-config';

@Component({
    selector: 'app-db-poly-output',
    templateUrl: './db-poly-output.component.html',
    styleUrls: ['./db-poly-output.component.scss']
})
export class DbPolyOutputComponent implements OnInit {

    @Input() resultSet: ResultSet;
    @Input() resultVariable: string;

    tableConfig: TableConfig = {
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
