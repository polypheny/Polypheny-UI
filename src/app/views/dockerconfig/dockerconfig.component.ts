import {Component, OnInit, OnDestroy, ViewChild} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {ToastService} from '../../components/toast/toast.service';
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
    autoConnectRunning: boolean = false;
    timeoutId: number = null;
    modalId: number = null;

    @ViewChild('dockerConfigModal', {static: false}) public dockerConfigModal: ModalDirective;

    constructor(
        private _breadcrumb: BreadcrumbService,
        private _crud: CrudService,
        private _sidebar: LeftSidebarService,
        private _toast: ToastService,
    ) {
        _sidebar.listConfigManagerPages();
    }

    ngOnInit(): void {
        this._crud.getAutoDockerStatus().subscribe(
            res => {
                this.status = <AutoDockerStatus>res;
            },
            err => {
                console.log(err);
            }
        );

        this.updateList();
        this._breadcrumb.setBreadcrumbs([new BreadcrumbItem('Config', '/views/config/'),
                                         new BreadcrumbItem('Docker')]);
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
        this._crud.getDockerInstances().subscribe(
            res => {
                this.instances = <DockerInstance[]>res;
            },
            err => {
                console.log(err);
            },
        );
        this._crud.getAutoDockerStatus().subscribe(
            res => {
                this.status = <AutoDockerStatus>res;
            },
            err => {
                console.log(err);
            }
        );
    }

    autoDocker() {
        this.autoConnectRunning = true;
        this.status.message = 'Sending start command...';
        this._toast.info('Sending start command...');
        this.timeoutId = setTimeout(() => this.updateAutoDockerStatus(), 500);
        this._crud.doAutoHandshake().subscribe(
            res => {
                this.autoConnectRunning = false;
                if (this.timeoutId !== null) {
                    clearTimeout(this.timeoutId);
                    this.timeoutId = null;
                }
                const autoDockerResult = <AutoDockerResult> res;
                if (autoDockerResult.success) {
                    this._toast.success('Connected to local docker instance');
                } else {
                    this._toast.error('Failed to connect to local docker instance');
                }
                this.status = autoDockerResult.status;
                this.instances = autoDockerResult.instances;
            },
            err => {
                this.autoConnectRunning = false;
                console.log(err);
            }
        );
    }

    updateAutoDockerStatus() {
        if (this.timeoutId === null) {
            return;
        }

        this._crud.getAutoDockerStatus().subscribe(
            res => {
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
            err => {
                console.log(err);
            }
        );
    }

    removeDockerInstance(instance: DockerInstance) {
        this._crud.removeDockerInstance(instance.id).subscribe(
            res => {
                const d = <DockerRemoveResponse>res;
                if (d.error === '') {
                    this._toast.success("Deleted docker instance '" + instance.alias + "'");
                } else {
                    this._toast.error(d.error);
                }
                this.instances = d.instances;
                this.status = d.status;
            },
            err => {
                console.log(err);
            }
        );
    }

    showModal(id: number) {
        this.modalId = id;
        this.dockerConfigModal.show();
    }

    closeModal() {
        this.updateList();
        this.dockerConfigModal.hide();
        this.modalId = null;
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
}
