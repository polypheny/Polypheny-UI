import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {BehaviorSubject} from 'rxjs';
import {InformationService} from '../../services/information.service';
import {ConfigService} from '../../services/config.service';

@Injectable({
  providedIn: 'root'
})
export class LeftSidebarService {

  constructor( private _http:HttpClient, private _informationService:InformationService, private _configService:ConfigService ) {}

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
    this.nodes.next( n );
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
