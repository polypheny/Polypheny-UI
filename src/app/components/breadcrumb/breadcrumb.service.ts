import {Injectable, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {BehaviorSubject} from 'rxjs';

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
  _activatedRoute:ActivatedRoute;

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
    else return 'col-lg-'+this.size[this.zoom];
  }

  getWrapperClass() {
    if (this.masonry) return 'card-columns';
    else return 'row';
  }

  toggleMasonry() {
    this.masonry = !this.masonry;
    return this.masonry;
  }

  /** must be called when you use the breadcrumb-service somewhere */
  setActivatedRoute(activatedRoute: ActivatedRoute){
    this._activatedRoute = activatedRoute;
    this._activatedRoute.params.subscribe(params => {
      if(params['id']) {
        this.routerId = params['id'];
      }
      if(params['mode']){
        this.mode = params['mode'];
      }
      this.updateBreadcrumbs();
    });
  }

  updateBreadcrumbs() {
    //todo get parent ids
    //todo hide if no breadcrumbs
    const path = '/home/';
    const home = new BreadcrumbItem('Home', '/home');
    switch (this.mode) {
      case 'global':
        this.breadcrumbs.next([home, new BreadcrumbItem('Global')]);
        break;
      case 'logic':
        this.breadcrumbs.next([home, new BreadcrumbItem('Logic')]);
        break;
      case 'db':
        this.breadcrumbs.next([home, new BreadcrumbItem('Logic', path+'logic'), new BreadcrumbItem('Databases')]);
          break;
      case 'schema':
        this.breadcrumbs.next([home, new BreadcrumbItem('Logic', path+'logic'), new BreadcrumbItem('Databases', path+'db/1'), new BreadcrumbItem('Schema')]);
        break;
      case 'table':
        this.breadcrumbs.next([home, new BreadcrumbItem('Logic', path+'logic'), new BreadcrumbItem('Databases', path+'db/1'), new BreadcrumbItem('Schema', path+'schema/1'), new BreadcrumbItem('Table')]);
        break;
      default:
        this.breadcrumbs.next([home]);
    }
    // this.breadcrumbs.complete();
  }
  
  getBreadcrumbs(){
    return this.breadcrumbs.asObservable();
  }

  hide() {
    this.breadcrumbs.next([]);
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
