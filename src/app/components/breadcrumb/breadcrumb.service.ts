import {Injectable, OnDestroy, OnInit} from '@angular/core';
import {BehaviorSubject, Subject} from 'rxjs';
import {BreadcrumbItem} from './breadcrumb-item';

@Injectable({
    providedIn: 'root'
})
export class BreadcrumbService implements OnInit, OnDestroy {

    //BehaviorSubjects: https://pillar-soft.com/2018/07/02/behavior-subjects-in-angular-6/
    breadcrumbs: BehaviorSubject<BreadcrumbItem[]> = new BehaviorSubject<BreadcrumbItem[]>([]);
    dataModel = null;
    onClickSubject = new Subject<BreadcrumbItem>();

    routerId;

    constructor() {
    }

    ngOnInit() {
    }

    ngOnDestroy() {
        this.breadcrumbs.next([]);
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
    }

    hide() {
        this.breadcrumbs.next([]);
    }

    getNamespaceName() {
        if (this.breadcrumbs.getValue().length < 2) {
            return null;
        }
        return this.breadcrumbs.getValue()[1].name;
    }

    onBreadCrumbClicked() {
        return this.onClickSubject.asObservable();
    }
}
