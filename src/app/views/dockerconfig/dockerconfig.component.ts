import { Component, OnInit } from '@angular/core';
import { CrudService } from '../../services/crud.service';
import { ToastService } from '../../components/toast/toast.service';

@Component({
    selector: 'app-dockerconfig',
    templateUrl: './dockerconfig.component.html',
    styleUrls: ['./dockerconfig.component.scss']
})
export class DockerconfigComponent implements OnInit {

    instances: number[];
    error: string = null;
    status: AutoDockerStatus = {available: false, connected: false, running: false, message: ''};
    autoConnectRunning: boolean = false;
    timeoutId: number = null;

    constructor(
        private _crud: CrudService,
        private _toast: ToastService,
    ) { }

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
    }

    ngOnDestroy() {
        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
        }
    }

    updateList() {
        this._crud.getDockerInstances().subscribe(
            res => {
                this.instances = <number[]>res;
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
    };

    autoDocker() {
        this.autoConnectRunning = true;
        this.status.message = "Sending start command...";
        this._toast.info("Sending start command...");
        this.timeoutId = setTimeout(() => this.updateAutoDockerStatus(), 500);
        this._crud.doAutoHandshake().subscribe(
            res => {
                this.autoConnectRunning = false;
                if (this.timeoutId !== null) {
                    clearTimeout(this.timeoutId);
                    this.timeoutId = null;
                }
                let autoDockerResult = <AutoDockerResult> res;
                if (autoDockerResult.success) {
                    this._toast.success("Connected to local docker instance");
                } else {
                    this._toast.error("Failed to connect to local docker instance");
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
                let status = <AutoDockerStatus>res;
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
}

export interface AutoDockerStatus {
    available: boolean,
    connected: boolean,
    running: boolean,
    message: string,
}

export interface AutoDockerResult {
    success: boolean,
    status: AutoDockerStatus,
    instances: number[],
}
