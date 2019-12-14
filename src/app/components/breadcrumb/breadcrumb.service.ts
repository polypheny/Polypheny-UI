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

  routerId;

  constructor() {
    if( localStorage.getItem( 'breadcrumb.zoom' ) === null ) {
      localStorage.setItem( 'breadcrumb.zoom', String(this.MAXCOLS - 2) );
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
