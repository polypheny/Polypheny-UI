import {Component, EventEmitter, Input, OnInit, OnDestroy, Output} from '@angular/core';
import {DockerInstance, DockerSetupResponse, Handshake, HandshakeAndInstance} from '../../models/docker.model';
import {CrudService} from '../../services/crud.service';
import {ToastService} from '../../components/toast/toast.service';

@Component({
    selector: 'app-dockernew',
    templateUrl: './dockernew.component.html',
    styleUrls: ['./dockernew.component.scss']
})
export class DockernewComponent implements OnInit, OnDestroy {

    host: string;
    alias: string;
    registry: string = "";
    communicationPort: number;
    handshakePort: number;
    proxyPort: number;
    aliasModified = false;
    dockerSetupResult: DockerSetupResponse = null;
    handshake: Handshake = null;
    timeoutId: number = null;

    @Output() done = new EventEmitter<DockerInstance[]>();

    constructor(
        private _crud: CrudService,
        private _toast: ToastService,
    ) { }

    ngOnInit(): void {
    }

    ngOnDestroy(): void {
        if (this.timeoutId != null) {
            clearTimeout(this.timeoutId);
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

    addDockerInstance() {
        this._crud.addDockerInstance(this.host, this.alias, this.registry, this.communicationPort, this.handshakePort, this.proxyPort).subscribe(
            res => {
                this.dockerSetupResult = <DockerSetupResponse>res;
                if (this.dockerSetupResult.success) {
                    this.success(this.dockerSetupResult.instances);
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

    updateHandshake() {
        if (this.timeoutId === null) {
            return;
        }

        this._crud.getHandshake(this.host).subscribe(
            res => {
                const r = <HandshakeAndInstance>res;

                this.handshake = r.handshake;

                if (this.handshake.status === 'RUNNING') {
                    if (this.timeoutId !== null) {
                        this.timeoutId = setTimeout(() => this.updateHandshake(), 1000);
                    }
                } else {
                    this.timeoutId = null;
                    if (this.handshake.status === 'SUCCESS') {
                        this.success(undefined);
                    }
                }
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

    success(instances: DockerInstance[]) {
        console.log(instances);
        this._toast.success("Successfully added docker instance '" + this.alias + "'");
        this.done.emit(instances);
    }

    cancel() {
        this.cancelHandshake();
        this.done.emit();
    }
}
