import {Component, Input, OnInit} from '@angular/core';
import {FormGroup} from '@angular/forms';
import {DockerStatus} from '../form-generator.model';
import {ConfigService} from '../../../../services/config.service';
import {ToastService} from '../../../../components/toast/toast.service';

@Component({
    selector: 'app-docker-config',
    templateUrl: './docker-config.component.html',
    styleUrls: ['./docker-config.component.scss']
})
export class DockerConfigComponent implements OnInit {

    @Input() form: FormGroup;

    @Input() config: any;

    @Input() onSubmit: (form, e) => void;

    @Input() submitted: boolean;

    @Input() removeElement: (list, key, index) => void;

    @Input() addElement: (list, key, template) => void;

    constructor(
        private _config: ConfigService,
        private _toast: ToastService
    ) {
    }

    ngOnInit(): void {
    }


    inputValidation(key) {
        if (this.submitted && this.form.controls[key].valid && this.form.controls[key].dirty) {
            return {'is-valid': true};
        } else if (this.submitted && !this.form.controls[key].valid) {
            return {'is-invalid': true};
        }
    }

    testConnection(e: Event, value, key: string) {
        e.preventDefault();
        value.isTesting = true;
        this._config.testConnection(value.id).subscribe(async (res) => {
            value.isTesting = false;

            const status: DockerStatus = <DockerStatus><unknown>res;

            if (value.dockerRunning !== status.successful) {
                value.dockerRunning = status.successful;
                this.markElement(key);
                this.onSubmit(this.form.value, null);

                if (status.successful) {
                    this._toast.success('The entered docker instance is correctly configured.', null, 'Docker Reachable');
                } else if (status.errorMessage.trim() !== '') {
                    this._toast.error(status.errorMessage, 'Docker not reachable');
                } else {
                    this._toast.error('Failed connecting to the Docker instance. Make sure, that the entered parameters are correct and Docker is reachable.', 'Docker not reachable');
                }

            } else if (!status.successful) {
                if (status.errorMessage.trim() !== '') {
                    this._toast.error(status.errorMessage, 'Docker not reachable');
                } else {
                    this._toast.error('Failed connecting to the Docker instance. Make sure, that the entered parameters are correct and Docker is reachable.', 'Docker not reachable');
                }
            }

        });

    }

    markElement(key: string) {
        this.form.controls[key].markAsDirty();
    }

    markElementReset(key: string, value: any) {
        this.markElement(key);
        value.dockerRunning = false;
    }

    setProtocolAndMarkElement(el: any, e: Event, key: string, value: any) {
        e.preventDefault();
        el.protocol = e.target['value'];

        this.markElementReset(key, value);
    }


    setInsecureAndMark(usingInsecure: boolean, key: string, el: any) {
        if (usingInsecure) {
            el.port = 2375.0;
        }
        this.markElementReset(key, el);
    }

}
