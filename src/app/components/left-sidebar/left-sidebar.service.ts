import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {BehaviorSubject} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class LeftSidebarService {

  constructor( private _http:HttpClient ) {}

  nodes: BehaviorSubject<Object> = new BehaviorSubject<Object>([]);
  informationManagerUrl = 'http://localhost:8082';
  configManagerUrl = 'http://localhost:8081';
  httpOptions = { headers: new HttpHeaders({'Content-Type': 'application/json'})};

  listConfigManagerPages () {
    return this._http.get(`${this.configManagerUrl}/getPageList`, this.httpOptions).subscribe(
      res => {
        this.nodes.next(this.mapPages(res, 'config'));
      }, err => {
        console.log(err);
      }
    );
  }

  private mapPages ( res:Object, mode:string ) {
    const pages = <JavaPage[]> res;
    const nodes:SidebarNode[] = [];
    for( const p of pages ) {
      nodes.push(new SidebarNode(p.id, p.name, p.icon, mode));
    }
    return nodes;
  }

  listInformationManagerPages () {
    return this._http.get(`${this.informationManagerUrl}/getPageList`, this.httpOptions).subscribe(
      res => {
        this.nodes.next(this.mapPages(res, 'information'));
      }, err => {
        console.log(err);
      }
    );
  }

  getNodes () {
    return this.nodes;
  }

}

class SidebarNode{
  id:any;
  name:string;
  icon:string;
  routerLink:string;
  constructor ( id, name, icon, group ){
    this.id = id;
    this.name = name;
    this.icon = icon;
    switch (group) {
      case 'config':
        this.routerLink = '/form-generator/'+id;
        break;
      case 'information':
        this.routerLink = '/home/global/'+id;
        break;
      default:
        console.error('sidebarNode with unknown group');
    }
  }
}
interface JavaPage {
  id:any;
  name:string;
  icon:string;
}
