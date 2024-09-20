import {Component, inject, OnInit} from '@angular/core';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';

@Component({
    selector: 'app-inventory',
    templateUrl: './inventory.component.html',
    styleUrls: ['./inventory.component.scss']
})
export class InventoryComponent implements OnInit {

    private readonly _sidebar = inject(LeftSidebarService);

    constructor() {
    }

    ngOnInit() {
        this._sidebar.hide();
    }

}
