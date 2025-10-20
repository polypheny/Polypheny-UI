import {Component, inject, OnInit} from '@angular/core';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';

@Component({
    selector: 'app-about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss'],
    standalone: false
})
export class AboutComponent implements OnInit {

    private readonly _sidebar = inject(LeftSidebarService);

    constructor() {
    }

    ngOnInit() {
        this._sidebar.hide();
    }

}
