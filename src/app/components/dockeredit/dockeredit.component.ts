import {Component, EventEmitter, Input, OnDestroy, OnInit, Output} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {DockerInstance, DockerReconnectResponse, DockerRemoveResponse, DockerStatus, DockerUpdateResponse, Handshake, HandshakeAndInstance} from '../../models/docker.model';
import {ToastService} from '../../components/toast/toast.service';

@Component({
    selector: 'app-dockeredit',
    templateUrl: './dockeredit.component.html',
    styleUrls: ['./dockeredit.component.scss']
})
export class DockereditComponent implements OnInit, OnDestroy {

    handshake: Handshake = null;
    lock = false;
    connected: boolean | string = false;
    updateLock = false;
    modified = false;
    alias: string;
    host: string;
    registry: string;
    communicationPort: number;
    handshakePort: number;
    proxyPort: number;
    error: string;
    timeoutId: number = null;

    @Input() id: number;
    @Output() done = new EventEmitter<DockerInstance[]>();

    constructor(
        private _crud: CrudService,
        private _toast: ToastService,
    ) { }

    ngOnInit(): void {
        this._crud.getDockerInstance(this.id).subscribe(
            res => {
                this.updateValues(<DockerInstance>res);
            },
            err => {
                console.log(err);
            }
        );
    }

    ngOnDestroy(): void {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
        }
    }

    updateValues(instance: DockerInstance) {
        this.host = instance.host;
        this.alias = instance.alias;
        this.registry = instance.registry;
        this.connected = instance.connected;
        this.communicationPort = instance.communicationPort;
        this.handshakePort = instance.handshakePort;
        this.proxyPort = instance.proxyPort;
        this.modified = false;
    }

    updateHandshake() {
        if (this.timeoutId === null) {
            return;
        }

        this._crud.getHandshake(this.host).subscribe(
            res => {
                const r = <HandshakeAndInstance>res;

                this.handshake = r.handshake;

                if ( r.instance.host !== undefined ) {
                    this.updateValues(r.instance);
                }

                if (this.handshake.status === 'RUNNING') {
                    if (this.timeoutId !== null) {
                        this.timeoutId = setTimeout(() => this.updateHandshake(), 1000);
                    }
                } else {
                    this.timeoutId = null;
                    if (this.handshake.status === 'SUCCESS') {
                        this.handshake = null;
                        this._toast.success("Successfully updated docker instance '" + this.alias + "'");
                    }
                }
            },
            err => {
                console.log(err);
            }
        );
    }

    reconnectToDockerInstance() {
        if (this.updateLock) {
            return;
        }
        this.updateLock = true;
        this._crud.reconnectToDockerInstance(this.id).subscribe(
            res => {
                const r = <DockerReconnectResponse>res;
                if (r.error !== '') {
                    this.error = r.error;
                    this.updateLock = false;
                    return;
                }
                this.handshake = r.handshake;
                this.timeoutId = setTimeout(
                    () => this.updateHandshake(),
                    1000,
                );
                this.updateLock = false;
            },
            err => {
                this.updateLock = false;
                console.log(err);
            }
        );
    }

    updateDockerInstance() {
        if (this.updateLock) {
            return;
        }
        this.updateLock = true;
        this._crud.updateDockerInstance(this.id, this.host, this.alias, this.registry).subscribe(
            res => {
                const r = <DockerUpdateResponse>res;
                if (r.error !== '') {
                    this.error = r.error;
                    this.updateLock = false;
                    return;
                }
                this.updateValues(r.instance);
                if (r.handshake.status !== undefined) {
                    this.handshake = r.handshake;
                    this.timeoutId = setTimeout(
                        () => this.updateHandshake(),
                        1000,
                    );
                } else {
                    this._toast.success("Successfully updated config for '" + this.alias + "'");
                }
                this.modified = false;
                this.updateLock = false;
            },
            err => {
                this.updateLock = false;
                console.log(err);
            }
        );
    }

    testConnection() {
        this.connected = 'checking connection';
        this._crud.testDockerInstance(this.id).subscribe(
            res => {
                const dockerStatus = <DockerStatus>res;
                // TODO: check that instanceId matches
                this.connected = dockerStatus.successful;
                if (dockerStatus.errorMessage !== '') {
                    this.error = dockerStatus.errorMessage;
                }
            },
            err => {
                this.connected = false;
                console.log(err);
            }
        );
    }

    removeDockerInstance() {
        this._crud.removeDockerInstance(this.id).subscribe(
            res => {
                const d = <DockerRemoveResponse>res;
                if (d.error === '') {
                    this._toast.success("Deleted docker instance '" + this.alias + "'");
                } else {
                    this._toast.error(d.error);
                }
                this.done.emit(d.instances);
            },
            err => {
                console.log(err);
            }
        );
    }

    emitDone() {
        if (this.handshake !== null) {
            this._crud.cancelHandshake(this.host).subscribe(
                res => {
                },
                err => {
                    console.log(err);
                }
            );
        }
        this.done.emit();
    }
}
