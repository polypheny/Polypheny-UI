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

  registry: string;
  modified = false;

  @Output() done = new EventEmitter<void>();

  constructor() {
  }

  loadValues(settings: DockerSettings) {
    this.registry = settings.registry;
    this.modified = false;
  }

  toDockerSettings(): DockerSettings {
    return {'registry': this.registry};
  }

  ngOnInit(): void {
    this._crud.getDockerSettings().subscribe({
          next: res => {
            this.loadValues(<DockerSettings>res);
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
        this.loadValues(<DockerSettings>res);
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
