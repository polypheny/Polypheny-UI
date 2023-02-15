import {Component, OnInit} from '@angular/core';
import {BreadcrumbService} from './breadcrumb.service';

@Component({
    selector: 'app-breadcrumb-main',
    templateUrl: './breadcrumb.component.html',
    styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent implements OnInit {

    breadcrumbs: BreadcrumbItem[] = [];
    zoom;
    hidden = true;

    routerId;

    constructor(
        public _breadcrumb: BreadcrumbService,
    ) {
    }

    ngOnInit() {

        this.routerId = this._breadcrumb.routerId;
        this.zoom = this._breadcrumb.getZoom();

        this._breadcrumb.getBreadcrumbs().subscribe(breadcrumbs => {
            this.breadcrumbs = breadcrumbs;
            this.hidden = breadcrumbs.length <= 0;
        });
    }

    zoomIn() {
        this.zoom = this._breadcrumb.zoomIn();
    }

    zoomOut() {
        this.zoom = this._breadcrumb.zoomOut();
    }

}

class BreadcrumbItem {
    name: string;
    routerLink?: any;

    constructor(name: string, routerLink?: any) {
        this.name = name;
        if (routerLink) {
            this.routerLink = routerLink;
        }
    }
}
