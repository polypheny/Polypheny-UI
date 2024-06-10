import {Component, EventEmitter, inject, OnInit, Output} from '@angular/core';
import {DockerSettings} from '../../../models/docker.model';
import {CrudService} from '../../../services/crud.service';

@Component({
    selector: 'app-dockersettings',
    templateUrl: './dockersettings.component.html',
    styleUrls: ['./dockersettings.component.scss']
})
export class DockersettingsComponent implements OnInit {

    private readonly _crud = inject(CrudService);

    defaultRegistry: string;
    modified = false;

    @Output() done = new EventEmitter<void>();

    constructor() {
    }

    loadValues(settings: DockerSettings) {
        this.defaultRegistry = settings.defaultRegistry;
        this.modified = false;
    }

    toDockerSettings(): DockerSettings {
        return {'defaultRegistry': this.defaultRegistry};
    }

    ngOnInit(): void {
        this._crud.getDockerSettings().subscribe({
                next: res => {
                    this.loadValues(res);
                },
                error: err => {
                    console.log(err);
                }
            }
        );
    }

    saveSettings() {
        this._crud.changeDockerSettings(this.toDockerSettings()).subscribe({
            next: res => {
                this.loadValues(res);
                this.close();
            },
            error: err => {
                console.log(err);
            }
        });
    }

    close() {
        this.done.emit();
    }
}
