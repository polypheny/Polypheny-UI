import {AfterViewInit, Component, computed, effect, ElementRef, Injector, Input, OnChanges, signal, SimpleChanges, ViewChild} from '@angular/core';
import {createEditor} from './alg-editor';
import {PlanNode} from '../models/polyalg-plan.model';
import {PolyAlgService} from '../polyalg.service';

@Component({
    selector: 'app-alg-viewer',
    templateUrl: './alg-viewer.component.html',
    styleUrl: './alg-viewer.component.scss'
})
export class AlgViewerComponent implements AfterViewInit, OnChanges {
    @Input() polyAlg: string;
    @Input() planObject: string;
    @Input() planType: 'LOGICAL' | 'ROUTED' | 'PHYSICAL';
    @Input() isReadOnly: boolean;
    @ViewChild('rete') container!: ElementRef;

    polyAlgPlan = signal<PlanNode>(null);
    generatedPolyAlg: string;

    editor: { layout: () => Promise<void>; destroy: () => void; toPolyAlg: () => Promise<string>; };
    showAlgEditor = computed(() => this._registry.registryLoaded());

    constructor(private injector: Injector, private _registry: PolyAlgService) {
        effect(() => {
            const el = this.container.nativeElement;

            if (this.showAlgEditor() && this.polyAlgPlan() != null && el) {
                createEditor(el, this.injector, _registry, this.polyAlgPlan(), this.isReadOnly)
                .then(editor => {
                    this.editor = editor;
                    this.generatePolyAlg();
                });
            }
        });
    }

    ngAfterViewInit(): void {
    }

    ngOnChanges(changes: SimpleChanges) {
        if (changes.planObject) {
            this.polyAlgPlan.set(JSON.parse(this.planObject) as PlanNode);
        }
    }

    generatePolyAlg() {
        this.getPolyAlgFromTree().then(str => {
            this.generatedPolyAlg = str || 'Cannot determine root of tree';
        });
    }

    getPolyAlgFromTree() {
        return this.editor?.toPolyAlg();
    }

    getPolyAlgFromText() {
        return this.generatedPolyAlg;
    }
}
