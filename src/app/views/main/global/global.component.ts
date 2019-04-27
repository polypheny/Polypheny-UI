import {Component, OnDestroy, OnInit, ViewEncapsulation} from '@angular/core';
import { LogicService } from '../../../services/logic.service';
import {ActivatedRoute, Router} from '@angular/router';
import {RenderGroup, RenderItem, RenderObj} from '../models';
import {BreadcrumbService} from '../../../components/breadcrumb/breadcrumb.service';
import {LeftSidebarService} from '../../../components/left-sidebar/left-sidebar.service';
import {InformationService} from '../../../services/information.service';
import {KeyValue} from '@angular/common';
import {BreadcrumbItem} from '../../../components/breadcrumb/breadcrumb-item';

@Component({
  selector: 'app-global',
  templateUrl: './global.component.html',
  styleUrls: ['./global.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GlobalComponent implements OnInit, OnDestroy {

  mode;
  routerId;
  pageList;
  serverError;
  pageNotFound = false;

  data: RenderObj;

  constructor(
    private _logic:LogicService,
    private _information:InformationService,
    private _route: ActivatedRoute,
    private _router: Router,
    public _breadcrumb: BreadcrumbService,
    private _sidebar: LeftSidebarService
  ) {
    _sidebar.listInformationManagerPages();
  }

  ngOnInit() {
    // $('.collapse').collapse();
    this.mode = this._route.snapshot.paramMap.get('mode');
    this.routerId = this._route.snapshot.paramMap.get('id');
    this.getServiceData();

    this._route.params.subscribe(params => {
      this.mode = params['mode'];
      this.routerId = params['id'];
      this.getServiceData();
    });
    
    this._information.onSocketEvent().subscribe(
      update => {
        const info:RenderItem = <RenderItem> update;
        if(this.data && this.data.groups[update.informationGroup]){
          this.data.groups[update.informationGroup].list[update.id] = info;
        }
      }
    );

  }

  ngOnDestroy() {
    this._breadcrumb.hide();
  }

  getServiceData() {
    if(this.mode === 'global'){
      //this.data.groups = this._logic.getGlobalData();
      if(!this.routerId){
        this._information.getPageList().subscribe(
          res => {
            this.pageList = res;
            this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('informationManager')]);
            this.serverError = null;
          }, err => {
            this.serverError = err;
          }
        );
      }else {
        this._information.getPage(this.routerId).subscribe(
          res => {
            if(res == null){
              this.onPageNotFound();
              this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('informationManager')]);
            }else{
              this.data = <RenderObj>res;
              this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('informationManager', '/home/global/'), new BreadcrumbItem(this.data.name.toString())]);
              this.serverError = null;
            }
          }, err => {
          this.serverError = err;
        }
        );
      }
    } else if(this.mode === 'logic'){
      //this.data.groups = this._logic.getDatabases();
      this.data.groups = new Map<string, RenderGroup>();
    } else if(this.mode === 'db'){
      //this.data.groups = this._logic.getSchemas(this.routerId);
      this.data.groups = new Map<string, RenderGroup>();
    } else if(this.mode === 'schema'){
      //this.data.groups = this._logic.getTables(this.routerId);
      this.data.groups = new Map<string, RenderGroup>();
    } else if(this.mode === 'table'){
      //this.data.groups = this._logic.getColumns(this.routerId);
      this.data.groups = new Map<string, RenderGroup>();
    }
  }

  getCardClass(color) {
    let card = '';
    switch (color) {
      case 'BLUE':
          card = 'bg-primary';
          break;
      case 'LIGHTBLUE':
        card = 'bg-info';
        break;
      case 'YELLOW':
        card = 'bg-warning';
        break;
      case 'RED':
        card = 'bg-danger';
        break;
      case 'GREEN':
        card = 'bg-success';
        break;
    }
    card = card + ' card';
    return card;
  }

  /** order groups within a page, respectively information-elements within a group
   * items with lower order value are rendered first, then this with higher values, then thows where uiOrder is null ( -> 0)
   */
  private order ( a: KeyValue<string, any>, b: KeyValue<string, any>) {
    let out = 0;
    if ( a.value.uiOrder !== 0 && b.value.uiOrder === 0 ) out = -1;
    else if ( a.value.uiOrder === 0 && b.value.uiOrder !== 0 ) out = 1;
    else if ( a.value.uiOrder > b.value.uiOrder ) out = 1;
    else if ( a.value.uiOrder < b.value.uiOrder ) out = -1;
    return out;
  }


  private onPageNotFound(){
    this.pageNotFound = true;
    this.serverError = null;
    this._information.getPageList().subscribe(
      res => {this.pageList = res;},
      err => {this.serverError = err;}
    );
  }

}
