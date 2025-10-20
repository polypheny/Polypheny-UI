import {Component, inject, OnDestroy, OnInit} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {ToasterService} from '../../components/toast-exposer/toaster.service';
import {LeftSidebarService} from '../../components/left-sidebar/left-sidebar.service';
import {BreadcrumbService} from '../../components/breadcrumb/breadcrumb.service';
import {BreadcrumbItem} from '../../components/breadcrumb/breadcrumb-item';
import {AutoDockerStatus, DockerInstanceInfo, HandshakeInfo} from '../../models/docker.model';

@Component({
    selector: 'app-dockerconfig',
    templateUrl: './dockerconfig.component.html',
    styleUrls: ['./dockerconfig.component.scss'],
    standalone: false
})
export class DockerconfigComponent implements OnInit, OnDestroy {

    private readonly _breadcrumb = inject(BreadcrumbService);
    private readonly _crud = inject(CrudService);
    private readonly _sidebar = inject(LeftSidebarService);
    private readonly _toast = inject(ToasterService);

    instances: DockerInstanceInfo[];
    error: string = null;
    status: AutoDockerStatus = {available: false, connected: false, running: false, status: ''};
    handshakes: HandshakeInfo[] = [];
    autoConnectRunning = false;
    timeoutId: number = null;
    modalInstanceId: number = null;
    modalHandshake: HandshakeInfo = null;
    activeModal: null | 'add_edit' | 'settings' = null;

    constructor() {
        this._sidebar.listConfigManagerPages();
    }

    ngOnInit(): void {
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
        this._crud.getDockerInstances().subscribe({
            next: res => {
                this.instances = res;
            },
            error: err => {
                console.log(err);
            },
        });
        this._crud.getAutoDockerStatus().subscribe({
            next: res => {
                this.status = res;
            },
            error: err => {
                console.log(err);
            }
        });
        this._crud.getHandshakes().subscribe({
            next: res => {
                this.handshakes = res;
            },
            error: err => {
                console.log(err);
            }
        });
    }

    autoDocker() {
        this.autoConnectRunning = true;
        this.status.status = 'Sending start command...';
        this.timeoutId = setTimeout(() => this.updateAutoDockerStatus(), 500);
        this._crud.doAutoHandshake().subscribe({
            next: res => {
                this.autoConnectRunning = false;
                if (this.timeoutId !== null) {
                    clearTimeout(this.timeoutId);
                    this.timeoutId = null;
                }
                const autoDockerResult = res;
                this._toast.success('Connected to local docker instance');
                this.status = autoDockerResult.status;
                this.instances = autoDockerResult.instances;
            },
            error: err => {
                this.autoConnectRunning = false;
                if (this.timeoutId !== null) {
                    clearTimeout(this.timeoutId);
                    this.timeoutId = null;
                }
                // This makes the animation stop quickly while we do an update of everyting afterwards
                this.status.running = false;
                this._toast.error(err.error);
                console.log(err);
                this.updateList();
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
                if (this.status.status !== res.status) {
                    console.log(res);
                    console.log(res.status);
                    this._toast.info(res.status);
                }
                this.status = res;
                this.timeoutId = setTimeout(() => this.updateAutoDockerStatus(), 10);
            },
            error: err => {
                console.log(err);
            }
        });
    }

    removeDockerInstance(instance: DockerInstanceInfo) {
        this._crud.removeDockerInstance(instance.id).subscribe({
            next: res => {
                this._toast.success('Deleted Docker instance \'' + instance.host.alias + '\'');
                this.instances = res.instances;
                this.status = res.status;
            },
            error: err => {
                console.log(err);
                this._toast.error(err.error);
            }
        });
    }

    showModal(id: number) {
        this.modalInstanceId = id;
        this.activeModal = 'add_edit';
    }

    showHandshake(handshake: HandshakeInfo) {
        this.modalInstanceId = null;
        this.modalHandshake = handshake;
        this.activeModal = 'add_edit';
    }

    cancelHandshake(handshake: HandshakeInfo) {
        this._crud.cancelHandshake(handshake.id).subscribe({
            next: res => {
                this.updateList();
                this._toast.success(`Canceled handshake with ${handshake.host.alias}`);
            },
            error: err => {
                console.log(err);
                this._toast.error(err.error);
                this.updateList();
            },
        });
    }

    closeModal(newlist: DockerInstanceInfo[]) {
        if (newlist !== undefined) {
            this.instances = newlist;
            this._crud.getAutoDockerStatus().subscribe({
                next: res => {
                    this.status = res;
                },
                error: err => {
                    console.log(err);
                }
            });
        } else {
            this.updateList();
        }
        this.activeModal = null;
        this.modalInstanceId = null;
        this.modalHandshake = null;
    }

    showSettingsModal() {
        this.activeModal = 'settings';
    }

    closeSettingsModal() {
        this.activeModal = null;
        this.updateList();
    }

    onVisibleChange(visible: boolean) {
        if (!visible && this.activeModal !== null) {
            this.activeModal = null;
            this.updateList();
        }
    }
}
