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
  zoom: number;
  _showZoom = true;
  tableId = '!notShow!';

  routerId;

  constructor() {
    if( localStorage.getItem( 'breadcrumb.zoom' ) === null ) {
      localStorage.setItem( 'breadcrumb.zoom', String(this.MAXCOLS - 1) );
    }
    this.zoom = +localStorage.getItem( 'breadcrumb.zoom' );
  }

  ngOnInit() {}

  ngOnDestroy() {
    this.breadcrumbs.next([]);
  }

  private setZoom( zoom: number ){
    this.zoom = zoom;
    localStorage.setItem( 'breadcrumb.zoom', String(zoom) );
  }

  zoomIn() {
    if (this.zoom < this.MAXCOLS) {
      this.setZoom( this.zoom+1 );
    }
    return this.zoom;
  }

  zoomOut() {
    if (this.zoom > 1) {
      this.setZoom( this.zoom-1 );
    }
    return this.zoom;
  }

  getZoom() {
    return this.zoom;
  }

  getTableId(){
    return this.tableId;
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
    this.showZoom();
  }

  public setDashboardBreadcrumbs( breadcrumbs: BreadcrumbItem[] ) {
    this.breadcrumbs.next( breadcrumbs );
    this.hideZoom();
  }

  public setBreadcrumbsSchema( breadcrumbs: BreadcrumbItem[], tableId: string) {
    this.breadcrumbs.next( breadcrumbs );
    this.hideZoom();
    this.tableId = tableId;
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

}
