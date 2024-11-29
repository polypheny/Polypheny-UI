import {
    Component,
    inject,
    OnDestroy,
    OnInit
} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {WebuiSettingsService} from '../../../services/webui-settings.service';
import {UtilService} from '../../../services/util.service';
import {ToasterService} from '../../../components/toast-exposer/toaster.service';
import {CatalogService} from '../../../services/catalog.service';

@Component({
    selector: 'app-gis',
    templateUrl: './gis.component.html',
    styleUrls: ['./gis.component.scss']
})
export class GisComponent implements OnInit, OnDestroy {
    private readonly _crud = inject(CrudService);
    private readonly _leftSidebar = inject(LeftSidebarService);
    private readonly _breadcrumb = inject(BreadcrumbService);
    private readonly _settings = inject(WebuiSettingsService);
    public readonly _util = inject(UtilService);
    public readonly _toast = inject(ToasterService);
    public readonly _catalog = inject(CatalogService);
    private readonly _sidebar = inject(LeftSidebarService);

    ngOnDestroy(): void {
        console.log("GisComponent.ngOnDestroy")
    }
    ngOnInit(): void {
        console.log("GisComponent.ngOnInit")
    }
}
