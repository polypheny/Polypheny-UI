import {Component, Injector, Input, OnInit} from '@angular/core';
import { ButtonDirective, CollapseDirective } from '@coreui/angular';
import { Visualization } from '../../models/visualization.interface';
import { NgComponentOutlet, NgIf } from '@angular/common';

@Component({
    selector: 'app-config-section',
    standalone: true,
    imports: [ButtonDirective, CollapseDirective, NgComponentOutlet, NgIf],
    templateUrl: './config-section.component.html',
    styleUrl: './config-section.component.scss',
})
export class ConfigSectionComponent implements OnInit {
    @Input() config?: Visualization;
    @Input() title: string = '';

    injector?: Injector;

    constructor() {
    }

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

    isSectionBodyVisible = false;

    toggleSectionBodyVisibility(): void {
        this.isSectionBodyVisible = !this.isSectionBodyVisible;
    }
}
