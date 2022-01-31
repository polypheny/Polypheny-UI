import {Component, OnDestroy, OnInit} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {InformationService} from '../../services/information.service';
import {InformationObject, InformationPage} from '../../models/information-page.model';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {WebuiSettingsService} from '../../services/webui-settings.service';
import {Subscription} from 'rxjs';

@Component({
  selector: 'app-monitoring',
  templateUrl: './monitoring.component.html',
  styleUrls: ['./monitoring.component.scss']
})
export class MonitoringComponent implements OnInit, OnDestroy {

  data;
  routerId;
  pageList: InformationPage[];
  serverError;
  pageNotFound = false;
  private subscriptions = new Subscription();

  constructor(
    private _information: InformationService,
    private _router: Router,
    private _route: ActivatedRoute,
    public _breadcrumb: BreadcrumbService,
    private _sidebar: LeftSidebarService,
    private _settings: WebuiSettingsService
  ) { }

  ngOnInit() {
    this.routerId = this._route.snapshot.paramMap.get('id');
    //todo set node active if routerId is set
    this._route.params.subscribe(params => {
      this.routerId = params['id'];
      this.getServiceData();
    });

    this._sidebar.listInformationManagerPages();
    this._sidebar.open();

    this.initSocket();
    const sub = this._information.onReconnection().subscribe(
      b => {
        if(b) {
          this.getServiceData();
          this._sidebar.listInformationManagerPages();
        }
      }
    );
    this.subscriptions.add(sub);
  }

  initSocket(){
    //this.subscription = this._information.onSocketEvent().subscribe(
    const sub = this._information.onSocketEvent().subscribe(
      update => {
        const info: InformationObject = <InformationObject>update;
        if (this.data && this.data.groups[info.groupId] && this.data.groups[info.groupId].informationObjects[info.id]) {
          switch (info.type) {
            //case 'InformationGraph':
            case 'InformationProgress':
              // to enable the animation
              Object.keys(info).forEach(key => {
                this.data.groups[info.groupId].informationObjects[info.id][key] = info[key];
              });
              break;
            default:
              this.data.groups[info.groupId].informationObjects[info.id] = info;
          }
        }
      },
      err => {
        setTimeout( ()=>{
          this.initSocket();
        }, +this._settings.getSetting('reconnection.timeout'));
      }
    );
    this.subscriptions.add(sub);
  }

  ngOnDestroy() {
    this._breadcrumb.hide();
    this._sidebar.close();
    this.subscriptions.unsubscribe();
  }

  getServiceData() {
    if (!this.routerId) {
      this._information.getPageList().subscribe(
        res => {
          this.pageList = <InformationPage[]>res;
          this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Monitoring')]);
          this.serverError = null;
        }, err => {
          this.serverError = err;
        }
      );
    } else {
      this._information.getPage(this.routerId).subscribe(
        res => {
          if (res == null) {
            this.onPageNotFound();
            this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Monitoring')]);
          } else {
            this.pageNotFound = false;
            this.data = <InformationPage>res;
            this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Monitoring', '/views/monitoring/'), new BreadcrumbItem(this.data.name.toString())]);
            if(this.data.fullWidth) { this._breadcrumb.hideZoom(); }
            this.serverError = null;
          }
        }, err => {
          this.onPageNotFound();
          this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Monitoring')]);
          this.serverError = err;
        }
      );
    }
  }

  private onPageNotFound() {
    this.pageNotFound = true;
    this.data = null;
    this.serverError = null;
    this._information.getPageList().subscribe(
      res => {
        this.pageList = <InformationPage[]>res;
      },
      err => {
        this.serverError = err;
      }
    );
  }

}
