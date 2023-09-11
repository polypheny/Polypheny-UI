import {Component, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {CrudService} from '../../../services/crud.service';
import {ToasterService} from '../../toast-exposer/toaster.service';
import {DbmsTypesService} from '../../../services/dbms-types.service';
import {BsModalService} from 'ngx-bootstrap/modal';
import {DataViewComponent} from '../data-view.component';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {LeftSidebarService} from '../../left-sidebar/left-sidebar.service';
import {CatalogService} from '../../../services/catalog.service';
import {QueryLanguage} from '../models/result-set.model';

@Component({
    selector: 'app-data-card',
    templateUrl: './data-card.component.html',
    styleUrls: ['./data-card.component.scss']
})
export class DataCardComponent extends DataViewComponent implements OnInit {

    showInsertCard = false;
    jsonValid = false;

    constructor(
        public _crud: CrudService,
        public _toast: ToasterService,
        public _route: ActivatedRoute,
        public _router: Router,
        public _types: DbmsTypesService,
        public _settings: WebuiSettingsService,
        public _sidebar: LeftSidebarService,
        public _catalog: CatalogService,
        public modalService: BsModalService
    ) {
        super(_crud, _toast, _route, _router, _types, _settings, _sidebar, _catalog, modalService);
    }

    ngOnInit(): void {
        if (this.config && this.config.create) {
            this.buildInsertObject();
        }
        this.setPagination();
    }

    setJsonValid($event: any) {
        this.jsonValid = $event;
    }

    showInsert() {
        this.editing = null;
        this.showInsertCard = true;
    }

    protected readonly QueryLanguage = QueryLanguage;
}
