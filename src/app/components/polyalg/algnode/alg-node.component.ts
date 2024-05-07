import {ChangeDetectorRef, Component, effect, HostBinding, Input, OnChanges, Signal} from '@angular/core';
import {ClassicPreset} from 'rete';
import {KeyValue} from '@angular/common';
import {SOCKET_PRESET} from '../polyalg-viewer/alg-editor';
import {Declaration} from '../models/polyalg-registry';
import {PlanArgument} from '../models/polyalg-plan.model';
import {getControl} from '../controls/arg-control-utils';
import {ArgControl} from '../controls/arg-control';
import {Position} from 'rete-angular-plugin/17/types';

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

        effect(() => this.data.recomputeHeight());
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
const TAB_SIZE = 2; // the indentation width when generating PolyAlg

export class AlgNode extends ClassicPreset.Node {
    width = BASE_WIDTH;
    height: number;
    numOfInputs = 0;
    private readonly tabIndent = ' '.repeat(TAB_SIZE);
    private controlHeights: Signal<number>[] = [];

    constructor(public decl: Declaration, args: { [key: string]: PlanArgument } | null, private isReadOnly: boolean,
                private updateArea: (a: AlgNode, delta: Position) => void) {
        super(decl.name);
        this.numOfInputs = decl.numInputs;


        this.addOutput('out', new ClassicPreset.Output(SOCKET_PRESET));

        //const heights = {};
        for (const p of decl.posParams.concat(decl.kwParams)) {
            const arg = args?.[p.name] || null;
            const c = getControl(p, arg, isReadOnly, p.isMultiValued);

            this.controlHeights.push(c.height);

            this.addControl(p.name, c);
        }

        if (decl.numInputs > 0) {
            for (let i = 0; i < decl.numInputs; i++) {
                this.addInput(i.toString(), new ClassicPreset.Input(SOCKET_PRESET));
            }
        } else if (decl.numInputs === -1) {
            // TODO: handle variable number of inputs
            this.addInput('0', new ClassicPreset.Input(SOCKET_PRESET));
        }
    }

    recomputeHeight() {
        const oldHeight = this.height;
        const sum = Object.values(this.controlHeights).reduce((total, value) => total + value() + 12, 0);
        this.height = BASE_HEIGHT + sum;
        if (oldHeight) {
            let deltaY = this.height - oldHeight;
            deltaY += deltaY > 0 ? 1 : -1; // slight adjustment is required for smooth behavior
            this.updateArea(this, {x: 0, y: -deltaY});
        }
    }

    data(inputs: { [key: string]: string } = {}) {
        // https://retejs.org/docs/guides/processing/dataflow
        // build PolyAlg representation of this node

        const args = [];
        for (const p of this.decl.posParams) {
            const arg = this.controls[p.name] as ArgControl;
            args.push(arg.toPolyAlg());
        }
        for (const p of this.decl.kwParams) {
            const polyAlg = (this.controls[p.name] as ArgControl).toPolyAlg();
            if (polyAlg !== p.defaultPolyAlg) {
                args.push(`${p.name}=${polyAlg}`);
            }
        }

        const values = Object.keys(inputs)
        .sort((a, b) => parseInt(a, 10) - parseInt(b, 10)) // keys correspond to input socket key
        .map(key => inputs[key]);
        let children = '';
        if (values.length > 0) {
            const indented = values.join(',\n').replace(/^/gm, this.tabIndent);
            children = `(\n${indented}\n)`;
        }

        const polyAlg = `${this.decl.name}[${args.join(', ')}]${children}`;

        return {'out': polyAlg};
    }

    clone() {
        const args = {};
        for (const p of this.decl.posParams.concat(this.decl.kwParams)) {
            args[p.name] = (this.controls[p.name] as ArgControl).copyArg();
        }
        return new AlgNode(this.decl, args, this.isReadOnly, this.updateArea);
    }

}