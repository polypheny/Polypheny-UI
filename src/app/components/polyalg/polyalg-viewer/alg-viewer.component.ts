import {AfterViewInit, Component, computed, effect, ElementRef, Injector, Input, ViewChild} from '@angular/core';
import {createEditor} from './alg-editor';
import {PlanNode} from '../models/polyalg-plan.model';
import {PolyAlgService} from '../polyalg.service';

@Component({
    selector: 'app-alg-viewer',
    templateUrl: './alg-viewer.component.html',
    styleUrl: './alg-viewer.component.scss'
})
export class AlgViewerComponent implements AfterViewInit {
    @Input() polyAlg: string;
    @Input() planObject: string;
    @Input() planType: 'LOGICAL' | 'ROUTED' | 'PHYSICAL';
    @Input() isReadOnly: boolean;
    @ViewChild('rete') container!: ElementRef;

    generatedPolyAlg: string;

    editor: { layout: () => Promise<void>; destroy: () => void; toPolyAlg: () => Promise<string>; };
    showAlgEditor = computed(() => this._registry.registryLoaded());

    constructor(private injector: Injector, private _registry: PolyAlgService) {
        effect(() => {
            const el = this.container.nativeElement;

            if (this.showAlgEditor() && el) {
                createEditor(el, this.injector, _registry, JSON.parse(this.planObject) as PlanNode, this.isReadOnly)
                .then(editor => {
                    this.editor = editor;
                    this.generatePolyAlg();
                });
            }
        });
    }

    ngAfterViewInit(): void {
    }

    generatePolyAlg() {
        this.getPolyAlg().then(str => {
            this.generatedPolyAlg = str || 'Cannot determine root of tree';
        });
    }

    getPolyAlg() {
        return this.editor?.toPolyAlg();
    }
}
