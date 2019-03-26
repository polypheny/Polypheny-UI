import { Component, OnInit } from '@angular/core';
import { BreadcrumbService } from './breadcrumb.service';

@Component({
  selector: 'app-breadcrumb-main',
  templateUrl: './breadcrumb.component.html',
  styleUrls: ['./breadcrumb.component.scss']
})
export class BreadcrumbComponent implements OnInit {

  breadcrumbs:BreadcrumbItem[] = [];
  size;
  zoom;
  masonry;
  hidden = true;

  mode;
  routerId;

  constructor (
    private _breadcrumb: BreadcrumbService,
  ) { }

  ngOnInit() {

    this.mode = this._breadcrumb.mode;
    this.routerId = this._breadcrumb.routerId;
    this.size = this._breadcrumb.getSize();
    this.zoom = this._breadcrumb.getZoom();
    this.masonry = this._breadcrumb.getMasonry();

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

  toggleMasonry() {
    this.masonry = this._breadcrumb.toggleMasonry();
  }

}

class BreadcrumbItem {
  name: string;
  routerLink?: any;

  constructor( name:string, routerLink?: any ){
    this.name = name;
    if(routerLink){
      this.routerLink = routerLink;
    }
  }
}
