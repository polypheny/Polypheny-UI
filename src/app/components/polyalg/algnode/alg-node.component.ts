import {ChangeDetectorRef, Component, HostBinding, Input, OnChanges} from '@angular/core';
import {ClassicPreset} from 'rete';
import {KeyValue} from '@angular/common';
import {SOCKET_PRESET} from '../polyalg-viewer/alg-editor';
import {Declaration} from '../models/polyalg-registry';
import {PlanArgument} from '../models/polyalg-plan.model';
import {getControl} from '../controls/arg-control-utils';

type SortValue<N extends ClassicPreset.Node> = (N['controls'] | N['inputs'] | N['outputs'])[string];

@Component({
    selector: 'app-alg-node',
    templateUrl: './alg-node.component.html',
    styleUrl: './alg-node.component.scss'
})
export class AlgNodeComponent implements OnChanges {
    @Input() data!: AlgNode;
    @Input() emit!: (data: any) => void;
    @Input() rendered!: () => void;

    seed = 0;

    @HostBinding('class.selected') get selected() {
        return this.data.selected;
    }

    constructor(private cdr: ChangeDetectorRef) {
        this.cdr.detach();
    }

    ngOnChanges(): void {
        this.cdr.detectChanges();
        requestAnimationFrame(() => this.rendered());
        this.seed++; // force render sockets
    }

    sortByIndex<N extends ClassicPreset.Node, I extends KeyValue<string, SortValue<N>>>(a: I, b: I) {
        const ai = a.value?.index || 0;
        const bi = b.value?.index || 0;

        return ai - bi;
    }
}

const BASE_WIDTH = 350;
const BASE_HEIGHT = 110;

export class AlgNode extends ClassicPreset.Node {
    width = BASE_WIDTH;
    height = BASE_HEIGHT;
    controlHeights: { [key: string]: number } = {};
    numOfInputs = 0;

    constructor(public decl: Declaration, args: { [key: string]: PlanArgument } | null, private isReadOnly: boolean, private updateArea: (a: AlgNode) => void) {
        super(decl.name);
        this.numOfInputs = decl.numInputs;


        this.addInput('top', new ClassicPreset.Input(SOCKET_PRESET));

        const heights = {};
        for (const p of decl.posParams.concat(decl.kwParams)) {
            const arg = args?.[p.name];
            const c = getControl(p, arg, isReadOnly, (height: number) => {
                this.updateControlHeight(p.name, height);
                updateArea(this);
            }, p.isMultiValued);
            heights[p.name] = c.getHeight();
            this.addControl(p.name, c);
        }
        this.updateControlHeights(heights);

        if (decl.numInputs > 0) {
            for (let i = 0; i < decl.numInputs; i++) {
                this.addOutput(i.toString(), new ClassicPreset.Output(SOCKET_PRESET));
            }
        } else if (decl.numInputs === -1) {
            // TODO: handle variable number of inputs
            this.addOutput('0', new ClassicPreset.Output(SOCKET_PRESET));
        }
    }

    updateControlHeights(heights: { [key: string]: number; }) {
        this.controlHeights = heights;
        this.recomputeHeight();
    }

    updateControlHeight(controlName: string, height: number) {
        this.controlHeights[controlName] = height;
        this.recomputeHeight();
    }

    private recomputeHeight() {
        const sum = Object.values(this.controlHeights).reduce((total, value) => total + value, 0);
        this.height = BASE_HEIGHT + this.numOfInputs * 40 + sum;
    }

    data(inputs: any = {}) {

        return {'0': {name: this.label, inputs: inputs}};
    }

    clone() {
        // TODO: infer args from controls of this node
        return new AlgNode(this.decl, null, this.isReadOnly, this.updateArea);
    }

}
