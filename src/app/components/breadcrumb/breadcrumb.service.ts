import {Injectable, OnDestroy, OnInit} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {BreadcrumbItem} from './breadcrumb-item';

@Injectable({
    providedIn: 'root'
})
export class BreadcrumbService implements OnInit, OnDestroy {

    //BehaviorSubjects: https://pillar-soft.com/2018/07/02/behavior-subjects-in-angular-6/
    breadcrumbs: BehaviorSubject<BreadcrumbItem[]> = new BehaviorSubject<BreadcrumbItem[]>([]);
    MAXCOLS = 10;
    zoom: number;
    _showZoom = true;
    tableName = null;
    dataModel = null;
    onClickSubject = new Subject<BreadcrumbItem>();

    routerId;

    constructor() {
        if (localStorage.getItem('breadcrumb.zoom') === null) {
            localStorage.setItem('breadcrumb.zoom', String(this.MAXCOLS - 1));
        }
        this.zoom = +localStorage.getItem('breadcrumb.zoom');
    }

    ngOnInit() {
    }

    ngOnDestroy() {
        this.breadcrumbs.next([]);
    }

    private setZoom(zoom: number) {
        this.zoom = zoom;
        localStorage.setItem('breadcrumb.zoom', String(zoom));
    }

    zoomIn() {
        if (this.zoom < this.MAXCOLS) {
            this.setZoom(this.zoom + 1);
        }
        return this.zoom;
    }

    zoomOut() {
        if (this.zoom > 1) {
            this.setZoom(this.zoom - 1);
        }
        return this.zoom;
    }

    getZoom() {
        return this.zoom;
    }

    getTableId() {
        return this.tableName;
    }

    getMasonryZoom() {
        return this.MAXCOLS - (this.zoom + 1);
    }

    getCardClass() {
        //todo color..
        return '';
    }

    getBreadcrumbs() {
        return this.breadcrumbs.asObservable();
    }

    public setBreadcrumbs(breadcrumbs: BreadcrumbItem[]) {
        this.breadcrumbs.next(breadcrumbs);
        this.showZoom();
    }

    public setDashboardBreadcrumbs(breadcrumbs: BreadcrumbItem[]) {
        this.breadcrumbs.next(breadcrumbs);
        this.hideZoom();
    }

    public setBreadcrumbsSchema(breadcrumbs: BreadcrumbItem[], tableId: string) {
        this.breadcrumbs.next(breadcrumbs);
        this.hideZoom();
        this.tableName = tableId;
    }

    hide() {
        this.breadcrumbs.next([]);
    }

    hideZoom() {
        this._showZoom = false;
    }

    showZoom() {
        this._showZoom = true;
    }

    getNamespaceName() {
        if (this.breadcrumbs.getValue().length < 2) {
            return null;
        }
        return this.breadcrumbs.getValue()[1].name;
    }

    isRelational() {
        return this.dataModel != null && this.dataModel === 'relational';
    }

    onBreadCrumbClicked() {
        return this.onClickSubject.asObservable();
    }

    setNamespaceType(dataModel: string) {
        if (!dataModel) {
            this.dataModel = null;
            return;
        }
        this.dataModel = dataModel.toLowerCase();
    }
}
