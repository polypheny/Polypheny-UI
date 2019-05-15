import {Injectable, OnDestroy, OnInit} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {BreadcrumbItem} from './breadcrumb-item';

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService implements OnInit, OnDestroy {

  //BehaviorSubjects: https://pillar-soft.com/2018/07/02/behavior-subjects-in-angular-6/
  breadcrumbs: BehaviorSubject<BreadcrumbItem[]> = new BehaviorSubject<BreadcrumbItem[]>([]);
  MAXCOLS = 10;
  zoom = this.MAXCOLS - 2;

  routerId;

  constructor() { }

  ngOnInit() {}

  ngOnDestroy() {
    this.breadcrumbs.next([]);
  }

  zoomIn() {
    if (this.zoom < this.MAXCOLS) {
      this.zoom++;
    }
    return this.zoom;
  }

  zoomOut() {
    if (this.zoom > 1) {
      this.zoom--;
    }
    return this.zoom;
  }

  getZoom() {
    return this.zoom;
  }

  getMasonryZoom() {
    return this.MAXCOLS - ( this.zoom-1 );
  }

  getCardClass() {
    //todo color..
    return '';
  }

  getBreadcrumbs(){
    return this.breadcrumbs.asObservable();
  }

  public setBreadcrumbs( breadcrumbs: BreadcrumbItem[] ) {
    this.breadcrumbs.next( breadcrumbs );
  }

  hide() {
    this.breadcrumbs.next([]);
  }

}
