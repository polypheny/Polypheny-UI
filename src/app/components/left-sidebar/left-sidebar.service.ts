import {Injectable, OnDestroy} from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {BehaviorSubject} from 'rxjs';
import {InformationService} from '../../services/information.service';
import {ConfigService} from '../../services/config.service';
import * as $ from 'jquery';
import {CrudService, SchemaRequest} from '../../services/crud.service';
import {ToastService} from '../toast/toast.service';

@Injectable({
  providedIn: 'root'
})
export class LeftSidebarService {

  constructor(
    private _http:HttpClient,
    private _informationService:InformationService,
    private _configService:ConfigService,
    private _crud: CrudService,
    private _toast: ToastService
  ) {}

  nodes: BehaviorSubject<Object> = new BehaviorSubject<Object>([]);

  listConfigManagerPages () {
    return this._configService.getPageList().subscribe(
      res => {
        this.nodes.next(this.mapPages(res, 'config'));
      }, err => {
        this.nodes.next([]);
        console.log(err);
      }
    );
  }

  private mapPages ( res:Object, mode:string ) {
    const pages = <JavaPage[]> res;
    const nodes:SidebarNode[] = [];
    let routerLink = '';
    for( const p of pages ) {
      switch (mode) {
        case 'config':
          routerLink = '/views/config/'+p.id;
          break;
        case 'information':
          routerLink = '/home/monitoring/'+p.id;
          break;
        default:
          console.error('sidebarNode with unknown group');
      }
      nodes.push(new SidebarNode(p.id, p.name, p.icon, routerLink));
    }
    return nodes;
  }

  listInformationManagerPages () {
    return this._informationService.getPageList().subscribe(
      res => {
        this.nodes.next(this.mapPages(res, 'information'));
      }, err => {
        this.nodes.next([]);
        console.log(err);
      }
    );
  }

  getNodes () {
    return this.nodes;
  }

  setNodes ( n: SidebarNode[] ) {
    n = [].concat(n); // convert to array if it is not an array
    this.nodes.next( n );
  }

  open () {
    $('body').addClass('sidebar-lg-show');
  }

  close() {
    this.nodes.next( [] );
    $('body').removeClass('sidebar-lg-show');
  }

  /**
   * Retrieve a schemaTree using the _crud service and apply it to the left sidebar
   */
  setSchema ( schemaRequest: SchemaRequest ){
    this._crud.getSchema( schemaRequest ).subscribe(
      res => {
        const schema = <SidebarNode[]> res;
        this.setNodes( schema );
        if( !schemaRequest.views ){
          schema.forEach( (val, key) => {
            val.children[0].routerLink = schemaRequest.routerLinkRoot + val.id;
          });
        }
      }, err => {
        this._toast.toast( 'server error', 'Could not load database schema.', 0, 'bg-danger' );
        console.log(err);
      }
    );
    this.open();
  }

}

export class SidebarNode{
  id:any;
  name:string;
  icon:string;
  routerLink:string;
  children: SidebarNode[];
  constructor ( id, name, icon, routerLink ){
    this.id = id;
    this.name = name;
    this.icon = icon;
    this.routerLink = routerLink;
  }
  setChildren ( children: SidebarNode[] ) {
    this.children = children;
  }
}

interface JavaPage {
  id:any;
  name:string;
  icon:string;
}
