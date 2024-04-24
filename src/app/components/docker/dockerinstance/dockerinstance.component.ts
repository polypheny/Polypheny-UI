import {Component, ElementRef, EventEmitter, Input, OnChanges, OnDestroy, Output, SimpleChanges, ViewChild} from '@angular/core';
import {DockerHost, DockerInstanceInfo, HandshakeInfo} from '../../../models/docker.model';
import {CrudService} from '../../../services/crud.service';
import {ToasterService} from '../../toast-exposer/toaster.service';

@Component({
    selector: 'app-dockerinstance',
    templateUrl: './dockerinstance.component.html',
    styleUrls: ['./dockerinstance.component.scss']
})
export class DockerInstanceComponent implements OnChanges, OnDestroy {
    hostname: string;
    alias: string;
    registry = '';
    communicationPort: number;
    handshakePort: number;
    proxyPort: number;

    timeoutId: number = null;
    aliasModified = false;
    lock = false;
    connected: boolean | string = 'checking...';
    modified = false;
    visibleState: 'yes' | 'no' = 'no';

    @Input() id: number;
    @Input() handshake: HandshakeInfo = null;
    @Input() visible: boolean;
    @Output() done = new EventEmitter<DockerInstanceInfo[]>();
    @ViewChild('advanced') advanced: ElementRef;

    constructor(
        private _crud: CrudService,
        private _toast: ToasterService,
    ) {
    }

    updateFromHost(h: DockerHost): void {
        this.hostname = h.hostname;
        this.alias = h.alias;
        this.registry = h.registry;
        this.communicationPort = h.communicationPort;
        this.handshakePort = h.handshakePort;
        this.proxyPort = h.proxyPort;
    }

    updateFromInstance(instance: DockerInstanceInfo): void {
        this.connected = instance.connected;
        this.updateFromHost(instance.host);
    }

    realInit(): void {
        this.hostname = null;
        this.alias = null;
        this.registry = '';
        this.communicationPort = null;
        this.handshakePort = null;
        this.proxyPort = null;

        this.aliasModified = false;
        this.lock = false;
        this.connected = 'checking...';
        this.modified = false;

        this.advanced.nativeElement.open = false;

        if (this.handshake !== null) {
            this.newHandshake(this.handshake);
        } else if (!this.isNew()) {
            this.refreshInstance();
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.visible === undefined || changes.visible.previousValue === changes.visible.currentValue) {
            return;
        }
        if (this.visibleState === 'no' && this.visible) {
            this.visibleState = 'yes';
            this.realInit();
        }
        if (this.visibleState === 'yes' && !this.visible) {
            this.visibleState = 'no';
            this.ngOnDestroy();
        }
    }

    ngOnDestroy(): void {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
        }
        this.handshake = null;
    }

    isNew(): boolean {
        return this.id === null;
    }

    aliasInput(): void {
        this.modified = true;
        this.aliasModified = true;
    }

    hostInput(): void {
        this.modified = true;
        if (this.isNew() && this.aliasModified === false) {
            this.alias = this.hostname;
        }
    }

    success(instances: DockerInstanceInfo[]) {
        this._toast.success('Added Docker instance \'' + this.alias + '\'');
        this.done.emit(instances);
    }

    close(): void {
        this.done.emit();
    }

    newHandshake(handshake: HandshakeInfo): void {
        this.lock = true;
        this.handshake = handshake;
        this.updateFromHost(this.handshake.host);
        this.timeoutId = setTimeout(() => this.updateHandshake(), 1000);
    }

    updateHandshake(): void {
        if (this.timeoutId === null) {
            return;
        }
        this._crud.getHandshake(this.handshake.id).subscribe({
            next: res => {
                this.handshake = res;

                if (this.handshake.status === 'RUNNING' && this.timeoutId !== null) {
                    this.timeoutId = setTimeout(() => this.updateHandshake(), 1000);
                } else {
                    this.lock = false;
                    this.timeoutId = null;
                    if (this.handshake.status === 'SUCCESS') {
                        this.success(undefined);
                    }
                }
            },
            error: err => {
                this.lock = false;
                console.log(err);
                this._toast.error(err.error);
            }
        });
    }

    restartHandshake(): void {
        if (this.handshake === null) {
            return;
        }
        this.lock = true;
        this._crud.restartHandshake(this.handshake.id).subscribe({
            next: res => {
                this.newHandshake(res);
            },
            error: err => {
                this.lock = false;
                console.log(err);
                this._toast.error(err.error);
            },
        });

    }

    cancelHandshake(): void {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }

        this._crud.cancelHandshake(this.handshake.id).subscribe({
            next: _ => {
                this.handshake = null;
                this.lock = false;
            },
            error: err => {
                console.log(err);
                this._toast.error(err.error);
                this.handshake = null;
                this.lock = false;
            },
        });
    }

    refreshInstance(): void {
        if (this.lock) {
            return;
        }
        this.lock = true;
        this.connected = 'checking...';
        this._crud.getDockerInstance(this.id).subscribe({
            next: res => {
                this.updateFromInstance(res);
                this.lock = false;
            },
            error: err => {
                console.log(err);
                this._toast.error(err.error);
                this.lock = false;
            },
        });
    }

    pingInstance(): void {
        if (this.lock) {
            return;
        }
        this.lock = true;
        this.connected = 'checking...';
        this._crud.pingDockerInstance(this.id).subscribe({
            next: res => {
                this.connected = true;
                this.lock = false;
            },
            error: err => {
                this.connected = false;
                this.lock = false;
            }
        });
    }

    addDockerInstance(): void {
        if (this.lock) {
            return;
        }
        this.lock = true;
        this._crud.createDockerInstance(this.hostname, this.alias, this.registry, this.communicationPort, this.handshakePort, this.proxyPort).subscribe({
            next: res => {
                if (res.handshake === null) {
                    this.success(res.instances);
                    this.lock = false;
                } else {
                    this.newHandshake(res.handshake);
                }
            },
            error: err => {
                console.log(err);
                this._toast.error(err.error);
                this.lock = false;
            },
        });
    }

    updateDockerInstance(): void {
        if (this.lock) {
            return;
        }
        this.lock = true;
        this._crud.updateDockerInstance(this.id, this.hostname, this.alias, this.registry).subscribe({
            next: res => {
                this.modified = false;
                this.updateFromInstance(res.instance);
                if (res.handshake === null) {
                    this._toast.success(`Successfully updated config for '${this.alias}'`);
                    this.lock = false;
                } else {
                    this.newHandshake(res.handshake);
                }
            },
            error: err => {
                console.log(err);
                this._toast.error(err.error);
                this.lock = false;
            }
        });
    }

    reconnectToDockerInstance(): void {
        if (this.lock) {
            return;
        }
        this.lock = true;
        this._crud.reconnectToDockerInstance(this.id).subscribe({
            next: res => {
                if (res !== null) {
                    this.newHandshake(res);
                } else {
                    this._toast.success(`Successfully reconnected to '${this.alias}'`);
                    this.lock = false;
                }
            },
            error: err => {
                console.log(err);
                this._toast.error(err.error);
                this.lock = false;
            },
        });
    }
}
