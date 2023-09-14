import {Component, OnInit} from '@angular/core';
import {SidebarService} from '@coreui/angular';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';

@Component({
    selector: 'app-about',
    templateUrl: './about.component.html',
    styleUrls: ['./about.component.scss']
})
export class AboutComponent implements OnInit {

    constructor(
        private _sidebar: LeftSidebarService
    ) {
    }

    ngOnInit() {
        this._sidebar.hide();
    }

}
