import {Injectable, OnDestroy, OnInit} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {BreadcrumbItem} from './breadcrumb-item';

@Injectable({
  providedIn: 'root'
})
export class BreadcrumbService implements OnInit, OnDestroy {

  //BehaviorSubjects: https://pillar-soft.com/2018/07/02/behavior-subjects-in-angular-6/
  breadcrumbs: BehaviorSubject<BreadcrumbItem[]> = new BehaviorSubject<BreadcrumbItem[]>([]);
  size = [3, 4, 6, 12];
  zoom = 1;
  masonry = false;

  mode;
  routerId;

  constructor() { }

  ngOnInit() {}

  ngOnDestroy() {
    this.breadcrumbs.next([]);
  }

  zoomIn() {
    if (this.zoom < this.size.length - 1) {
      this.zoom++;
    }
    return this.zoom;
  }

  zoomOut() {
    if (this.zoom > 0) {
      this.zoom--;
    }
    return this.zoom;
  }

  getZoom(){
    return this.zoom;
  }

  getMasonry() {
    return this.masonry;
  }

  getSize() {
    return this.size;
  }

  getCardClass() {
    //todo color
    if(this.masonry) return '';
    else return 'col-sm-'+this.size[this.zoom];
  }

  getWrapperClass() {
    if (this.masonry) return 'card-columns';
    else return 'row';
  }

  toggleMasonry() {
    this.masonry = !this.masonry;
    return this.masonry;
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
