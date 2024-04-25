import {AfterViewInit, Component, ElementRef, Injector, Input, ViewChild} from '@angular/core';
import {createEditor} from '../alg-editor';
import {PlanNode} from '../models/polyalg-plan.model';
import {CardBodyComponent, CardComponent} from '@coreui/angular';

@Component({
    selector: 'app-polyalg-viewer',
    standalone: true,
    imports: [
        CardComponent,
        CardBodyComponent
    ],
    templateUrl: './polyalg-viewer.component.html',
    styleUrl: './polyalg-viewer.component.scss'
})
export class PolyalgViewerComponent implements AfterViewInit{
    @Input() polyAlg: string;
    @Input() planObject: string;
    @Input() planType: 'LOGICAL' | 'ROUTED' | 'PHYSICAL';
    @ViewChild('rete') container!: ElementRef;

    constructor(private injector: Injector) {}

    initPlan() {
    }

    ngOnInit() {
        this.initPlan();
    }

    ngAfterViewInit(): void {
        const el = this.container.nativeElement;

        if (el) {
            createEditor(el, this.injector, JSON.parse(this.planObject) as PlanNode, true);
        }
    }
}
