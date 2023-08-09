import {Component, EventEmitter, OnInit, Output} from '@angular/core';
import {DockerSettings} from '../../models/docker.model';
import {CrudService} from '../../services/crud.service';

@Component({
    selector: 'app-dockersettings',
    templateUrl: './dockersettings.component.html',
    styleUrls: ['./dockersettings.component.scss']
})
export class DockersettingsComponent implements OnInit {

    registry: string;
    modified: boolean = false;

    @Output() done = new EventEmitter<void>();

    constructor(
        private _crud: CrudService,
    ) { }

    loadValues(settings: DockerSettings) {
        this.registry = settings.registry;
        this.modified = false;
    }

    toDockerSettings(): DockerSettings {
        return {'registry': this.registry}
    }

    ngOnInit(): void {
        this._crud.getDockerSettings().subscribe(
            res => {
                this.loadValues(<DockerSettings> res);
            },
            err => {
                console.log(err);
            }
        );
    }

    saveSettings() {
        this._crud.changeDockerSettings(this.toDockerSettings()).subscribe(
            res => {
                this.loadValues(<DockerSettings> res);
                this.close();
            },
            err => {
                console.log(err);
            }
        );
    }

    close() {
        this.done.emit();
    }
}
