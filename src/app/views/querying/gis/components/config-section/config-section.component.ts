import {Component, Injector, Input, OnInit} from '@angular/core';
import { Visualization } from '../../models/visualization.interface';
import {MapLayer} from '../../models/MapLayer.model';
import {MapLayerConfiguration} from '../../models/MapLayerConfiguration.interface';

@Component({
    selector: 'app-config-section',
    templateUrl: './config-section.component.html',
    styleUrl: './config-section.component.scss',
})
export class ConfigSectionComponent implements OnInit {

    constructor() {
    }
    @Input() config?: MapLayerConfiguration;
    @Input() layer?: MapLayer;
    @Input() title = '';

    injector?: Injector;

    isSectionBodyVisible = false;

    ngOnInit(): void {
        this.injector = Injector.create({
            providers: [{ provide: 'config', useValue: this.config }],
        });
    }

    // Needed?
    updateConfigInjector(): void {
        this.injector = Injector.create({
            providers: [{ provide: 'config', useValue: this.config }],
        });
    }

    toggleSectionBodyVisibility(): void {
        this.isSectionBodyVisible = !this.isSectionBodyVisible;
    }
}
