import {AfterViewInit, Component, ElementRef, Injector, Input, ViewChild} from '@angular/core';
import {createEditor} from "../editor";
import {PlanNode} from "../models/polyalg-plan.model";

@Component({
    selector: 'app-polyalg-viewer',
    standalone: true,
    imports: [],
    templateUrl: './polyalg-viewer.component.html',
    styleUrl: './polyalg-viewer.component.scss'
})
export class PolyalgViewerComponent implements AfterViewInit{
    @Input() planObject: string;
    @Input() planType: "LOGICAL" | "ROUTED" | "PHYSICAL";
    @ViewChild("rete") container!: ElementRef;

    constructor(private injector: Injector) {}

    initPlan() {
        console.log("hi!");
    }

    ngOnInit() {
        this.initPlan();
    }

    ngAfterViewInit(): void {
        const el = this.container.nativeElement;

        if (el) {
            createEditor(el, this.injector, JSON.parse(this.planObject) as PlanNode);
        }
    }
}
