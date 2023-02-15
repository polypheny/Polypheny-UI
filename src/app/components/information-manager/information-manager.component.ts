import {Component, Input, OnInit, ViewEncapsulation} from '@angular/core';
import {InformationPage} from '../../models/information-page.model';
import {KeyValue} from '@angular/common';
import {InformationService} from '../../services/information.service';

@Component({
    selector: 'app-information-manager',
    templateUrl: './information-manager.component.html',
    styleUrls: ['./information-manager.component.scss'],
    encapsulation: ViewEncapsulation.None
})
export class InformationManagerComponent implements OnInit {

    @Input() data: InformationPage;
    @Input() zoom;
    refreshingPage = false;
    refreshingGroup = [];

    constructor(
        private _information: InformationService
    ) {
    }

    ngOnInit() {
    }

    getCardClass(color) {
        let card = '';
        switch (color) {
            case 'BLUE':
                card = 'bg-primary';
                break;
            case 'LIGHTBLUE':
                card = 'bg-info';
                break;
            case 'YELLOW':
                card = 'bg-warning';
                break;
            case 'RED':
                card = 'bg-danger';
                break;
            case 'GREEN':
                card = 'bg-success';
                break;
        }
        card = card + ' card';
        return card;
    }

    /** order groups within a page, respectively information-elements within a group
     * items with lower order value are rendered first, then this with higher values, then thows where uiOrder is null ( -> 0)
     */
    private order(a: KeyValue<string, any>, b: KeyValue<string, any>) {
        let out = 0;
        if (a.value.uiOrder !== 0 && b.value.uiOrder === 0) {
            out = -1;
        } else if (a.value.uiOrder === 0 && b.value.uiOrder !== 0) {
            out = 1;
        } else if (a.value.uiOrder > b.value.uiOrder) {
            out = 1;
        } else if (a.value.uiOrder < b.value.uiOrder) {
            out = -1;
        }
        return out;
    }

    getZoom() {
        if (this.data.fullWidth) {
            return {'column-count': 1};
        } else {
            return {'column-count': this.zoom};
        }
    }

    refreshPage() {
        this.refreshingPage = true;
        this._information.refreshPage(this.data.id).subscribe().add(() => this.refreshingPage = false);
    }

    refreshGroup(id: string) {
        this.refreshingGroup[id] = true;
        this._information.refreshGroup(id).subscribe().add(() => this.refreshingGroup[id] = false);
    }

}
