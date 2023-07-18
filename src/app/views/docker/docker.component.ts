import {Component, EventEmitter, OnInit, Input, Output} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {FormGroup} from '@angular/forms';
import {CrudService} from '../../services/crud.service';
import {ToastService} from '../../components/toast/toast.service';
import {UtilService} from '../../services/util.service';

@Component({
    selector: 'app-docker',
    templateUrl: './docker.component.html',
    styleUrls: ['./docker.component.scss']
})
export class DockerComponent implements OnInit {

    @Input() id: number;

    notfound: boolean = false;
    host: string;
    alias: string;
    connected: string | boolean;
    error: string;
    modified: boolean = false;
    aliasModified: boolean = false;
    dockerSetupResult: DockerSetupResponse = null;
    handshake: Handshake = null;
    timeoutId: number = null; // Not null if a handshake is running
    updateLock: boolean = false;

    constructor(
        private _crud: CrudService,
        private _router: Router,
        private _route: ActivatedRoute,
        private _toast: ToastService,
        private _util: UtilService,
    ) {
    }

    updateValues(instance: DockerInstance) {
        this.host = instance.host;
        this.alias = instance.alias;
        this.connected = instance.connected;
        this.modified = false;
    }

    ngOnInit(): void {
        let dockerId = this._route.snapshot.paramMap.get('id');
        if (dockerId === "new") {
            this.id = -1; // Invalid id for new elements
        } else {
            this.id = parseInt(dockerId);
        }
        if (this.id !== -1) {
            this._crud.getDockerInstance(this.id).subscribe(
                res => {
                    this.updateValues(<DockerInstance>res);
                },
                err => {
                    this.notfound = true;
                    console.log(err);
                }
            );
        }
    }

    ngOnDestroy(): void {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
        }
    }

    testConnection() {
        this.connected = "checking connection";
        this._crud.testDockerInstance(this.id).subscribe(
            res => {
                let dockerStatus = <DockerStatus>res;
                // TODO: check that instanceId matches
                this.connected = dockerStatus.successful;
                if (dockerStatus.errorMessage !== "") {
                    this.error = dockerStatus.errorMessage;
                }
            },
            err => {
                this.connected = false;
                console.log(err);
            }
        );
    }

    addDockerInstance() {
        this._crud.addDockerInstance(this.host, this.alias).subscribe(
            res => {
                this.dockerSetupResult = <DockerSetupResponse>res;
                if (this.dockerSetupResult.success) {
                    this.success();
                }

                if (this.dockerSetupResult.handshake.status !== undefined) {
                    this.handshake = this.dockerSetupResult.handshake;
                    this.timeoutId = setTimeout(() => this.updateHandshake(), 1000);
                }
            },
            err => {
                console.log(err);
            },
        );
    }

    updateDockerInstance() {
        if (this.updateLock) {
            return;
        }
        this.updateLock = true;
        this._crud.updateDockerInstance(this.id, this.host, this.alias).subscribe(
            res => {
                let r = <DockerUpdateResponse>res;
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

    reconnectToDockerInstance() {
        if (this.updateLock) {
            return;
        }
        this.updateLock = true;
        this._crud.reconnectToDockerInstance(this.id).subscribe(
            res => {
                let r = <DockerReconnectResponse>res;
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

    removeDockerInstance() {
        this._crud.removeDockerInstance(this.id).subscribe(
            res => {
                let d = <DockerRemoveResponse>res;
                if (d.error === '') {
                    this._toast.success("Deleted docker instance '" + this.alias + "'");
                } else {
                    this._toast.error(d.error);
                }
                this._router.navigate(['views/docker']);
            },
            err => {
                console.log(err);
            }
        );
    }

    startHandshake() {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
            this._crud.cancelHandshake(this.host).subscribe(
                res => {
                },
                err => {
                    console.log(err);
                }
            );
        }

        this.handshake = null;
        this.error = null;

        this._crud.startHandshake(this.host).subscribe(
            res => {
                this.handshake = <Handshake>res;
                this.timeoutId = setTimeout(() => this.updateHandshake(), 1000);
            },
            err => {
                console.log(err);
            }
        );
    }

    redoHandshake() {
        if (this.timeoutId !== null) {
            return;
        }

        this._crud.startHandshake(this.host).subscribe(
            res => {
                this.handshake = <Handshake>res;
                this.timeoutId = setTimeout(
                    () => this.updateHandshake(),
                    1000,
                );
            },
            err => {
                console.log(err);
            }
        );
    }

    updateHandshake() {
        if (this.timeoutId === null) {
            return;
        }

        this._crud.getHandshake(this.host).subscribe(
            res => {
                let r = <HandshakeAndInstance>res;

                this.handshake = r.handshake;
                this.updateValues(r.instance);

                if (this.handshake.status === 'RUNNING') {
                    if (this.timeoutId !== null) {
                        this.timeoutId = setTimeout(() => this.updateHandshake(), 1000);
                    }
                } else {
                    this.timeoutId = null;
                    if (this.handshake.status === 'SUCCESS') {
                        this.success();
                    }
                }
            },
            err => {
                console.log(err);
            }
        );
    }

    cancelHandshake() {
        if (this.handshake !== null) {
            this.handshake = null;
            if (this.timeoutId !== null) {
                clearTimeout(this.timeoutId);
                this.timeoutId = null;
            }
            this._crud.cancelHandshake(this.host).subscribe(
                res => {
                },
                err => {
                    console.log(err);
                }
            );
        }
    }

    hostInput() {
        if (!this.aliasModified) {
            this.alias = this.host;
        }
    }

    aliasInput() {
        this.aliasModified = true;
    }

    success() {
        if (this.id === -1) {
            this._toast.success("Successfully added docker instance '" + this.alias + "'");
            this._router.navigate(['views/docker']);
        } else {
            this.handshake = null;
            this._toast.success("Successfully updated docker instance '" + this.alias + "'");
        }
    }
}

export interface Handshake {
    lastErrorMessage: string,
    hostname: string,
    execCommand: string,
    containerExists: string,
    status: string,
    runCommand: string,
}

export interface DockerInstance {
    id: number,
    host: string,
    alias: string,
    connected: boolean,
}

export interface DockerStatus {
    successful: boolean,
    errorMessage: string,
    instanceId: number,
}

export interface DockerSetupResponse {
    error: string,
    success: boolean,
    handshake: Handshake,
}

export interface DockerUpdateResponse {
    error: string,
    instance: DockerInstance,
    handshake: Handshake,
}

export interface DockerReconnectResponse {
    error: string,
    handshake: Handshake,
}

export interface DockerRemoveResponse {
    error: string,
    instances: DockerInstance[],
}

export interface HandshakeAndInstance {
    handshake: Handshake,
    instance: DockerInstance,
}
