import {Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {ModalDirective} from 'ngx-bootstrap/modal';

@Component({
  selector: 'app-dockerconfig',
  templateUrl: './dockerconfig.component.html',
  styleUrls: ['./dockerconfig.component.scss']
})
export class DockerconfigComponent implements OnInit, OnDestroy {

  instances: DockerInstance[];
  error: string = null;
  status: AutoDockerStatus = {available: false, connected: false, running: false, message: ''};
  autoConnectRunning = false;
  timeoutId: number = null;
  modalId: number = null;

  @ViewChild('dockerConfigModal', {static: false}) public dockerConfigModal: ModalDirective;
  @ViewChild('dockerSettingsModal', {static: false}) public dockerSettingsModal: ModalDirective;

  constructor(
      private _breadcrumb: BreadcrumbService,
      private _crud: CrudService,
      private _sidebar: LeftSidebarService,
      private _toast: ToasterService,
  ) {
    _sidebar.listConfigManagerPages();
  }

  ngOnInit(): void {
    this.updateList();
    this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Config', '/views/config/'),
      new BreadcrumbItem('Docker')]);
    this._breadcrumb.hideZoom();
    this._sidebar.open();
  }

  ngOnDestroy() {
    if (this.timeoutId !== null) {
      clearTimeout(this.timeoutId);
    }
    this._breadcrumb.hide();
    this._sidebar.close();
  }

  updateList() {
    this._crud.getDockerInstances().subscribe({
      next: res => {
        this.instances = <DockerInstance[]>res;
      },
      error: err => {
        console.log(err);
      },
    });
    this._crud.getAutoDockerStatus().subscribe({
      next: res => {
        this.status = <AutoDockerStatus>res;
      },
      error: err => {
        console.log(err);
      }
    });
  }

  autoDocker() {
    this.autoConnectRunning = true;
    this.status.message = 'Sending start command...';
    this._toast.info('Sending start command...');
    this.timeoutId = setTimeout(() => this.updateAutoDockerStatus(), 500);
    this._crud.doAutoHandshake().subscribe({
      next: res => {
        this.autoConnectRunning = false;
        if (this.timeoutId !== null) {
          clearTimeout(this.timeoutId);
          this.timeoutId = null;
        }
        const autoDockerResult = <AutoDockerResult>res;
        if (autoDockerResult.success) {
          this._toast.success('Connected to local docker instance');
        } else {
          this._toast.error('Failed to connect to local docker instance');
        }
        this.status = autoDockerResult.status;
        this.instances = autoDockerResult.instances;
      },
      error: err => {
        this.autoConnectRunning = false;
        console.log(err);
      }
    });
  }

  updateAutoDockerStatus() {
    if (this.timeoutId === null) {
      return;
    }

    this._crud.getAutoDockerStatus().subscribe({
      next: res => {
        if (this.timeoutId === null) {
          return;
        }
        const status = <AutoDockerStatus>res;
        if (this.status.message !== status.message) {
          this._toast.info(status.message);
        }
        this.status = status;
        this.timeoutId = setTimeout(() => this.updateAutoDockerStatus(), 500);
      },
      error: err => {
        console.log(err);
      }
    });
  }

  removeDockerInstance(instance: DockerInstance) {
    this._crud.removeDockerInstance(instance.id).subscribe({
      next: res => {
        const d = <DockerRemoveResponse>res;
        if (d.error === '') {
          this._toast.success('Deleted docker instance ' + instance.alias + '\'');
        } else {
          this._toast.error(d.error);
        }
        this.instances = d.instances;
        this.status = d.status;
      },
      error: err => {
        console.log(err);
      }
    });
  }

  showModal(id: number) {
    this.modalId = id;
    this.dockerConfigModal.show();
  }

  closeModal(newlist: DockerInstance[]) {
    if (newlist !== undefined) {
      this.instances = newlist;
      this._crud.getAutoDockerStatus().subscribe({
        next: (res: AutoDockerStatus) => {
          this.status = res;
        },
        error: err => {
          console.log(err);
        }
      });
    } else {
      this.updateList();
    }
    this.dockerConfigModal.hide();
    this.modalId = null;
  }

  showSettingsModal() {
    this.dockerSettingsModal.show();
  }

  closeSettingsModal() {
    this.dockerSettingsModal.hide();
    this.updateList();
  }
}

export interface AutoDockerStatus {
  available: boolean;
  connected: boolean;
  running: boolean;
  message: string;
}

export interface AutoDockerResult {
  success: boolean;
  status: AutoDockerStatus;
  instances: DockerInstance[];
}

export interface DockerRemoveResponse {
  error: string;
  instances: DockerInstance[];
  status: AutoDockerStatus;
}

export interface DockerInstance {
  id: number;
  host: string;
  alias: string;
  connected: boolean;
  numberOfContainers: number;
}
