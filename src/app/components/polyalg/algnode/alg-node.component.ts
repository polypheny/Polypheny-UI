import {ChangeDetectorRef, Component, effect, HostBinding, Input, OnChanges, signal, Signal} from '@angular/core';
import {ClassicPreset} from 'rete';
import {KeyValue} from '@angular/common';
import {Declaration} from '../models/polyalg-registry';
import {PlanArgument} from '../models/polyalg-plan.model';
import {getControl} from '../controls/arg-control-utils';
import {ArgControl} from '../controls/arg-control';
import {Position} from 'rete-angular-plugin/17/types';
import {DataModel} from '../../../models/ui-request.model';
import {AlgNodeSocket} from '../custom-socket/custom-socket.component';
import {AlgMetadata} from './alg-metadata/alg-metadata.component';
import {getModelPrefix} from '../polyalg-viewer/alg-editor-utils';

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

        effect(() => this.data.recomputeSize());
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

    toggleCollapse() {
        this.data.isMetaVisible.update(b => !b);
    }
}

const BASE_WIDTH = 350;
const METADATA_WIDTH = 200;
const METADATA_COLLAPSE_WIDTH = 16;
const BASE_HEIGHT = 110;
const TAB_SIZE = 2; // the indentation width when generating PolyAlg

const SINGLE_SOCKET_PRESETS = {
    [DataModel.DOCUMENT]: new AlgNodeSocket(DataModel.DOCUMENT),
    [DataModel.RELATIONAL]: new AlgNodeSocket(DataModel.RELATIONAL),
    [DataModel.GRAPH]: new AlgNodeSocket(DataModel.GRAPH),
};
const MULTI_SOCKET_PRESETS = {
    [DataModel.DOCUMENT]: new AlgNodeSocket(DataModel.DOCUMENT, true),
    [DataModel.RELATIONAL]: new AlgNodeSocket(DataModel.RELATIONAL, true),
    [DataModel.GRAPH]: new AlgNodeSocket(DataModel.GRAPH, true),
};
const MODEL_COLORS = new Map([
    [DataModel.RELATIONAL, 'warning'],
    [DataModel.DOCUMENT, 'warning'],
    [DataModel.GRAPH, 'warning']
]);

export class AlgNode extends ClassicPreset.Node {
    width: number;
    height: number;
    isMetaVisible = signal(false);
    private readonly tabIndent = ' '.repeat(TAB_SIZE);
    private controlHeights: Signal<number>[] = [];
    readonly hasVariableInputs: boolean;
    readonly modelBadge: string;
    readonly modelColor: string;

    constructor(public decl: Declaration, args: { [key: string]: PlanArgument } | null, public readonly metadata: AlgMetadata | null,
                public isReadOnly: boolean, private updateArea: (a: AlgNode, delta: Position) => void) {
        super(decl.name.substring(decl.name.indexOf('_') + 1));
        this.modelBadge = getModelPrefix(decl.model);
        this.modelColor = MODEL_COLORS.get(decl.model);

        if (metadata) {
            this.isMetaVisible.set(true);
        }
        this.width = isReadOnly ? BASE_WIDTH + METADATA_WIDTH + METADATA_COLLAPSE_WIDTH : BASE_WIDTH;

        const output = new ClassicPreset.Output(SINGLE_SOCKET_PRESETS[decl.model]);
        output.multipleConnections = false;
        this.addOutput('out', output);

        for (const p of decl.posParams.concat(decl.kwParams)) {
            const arg = args?.[p.name] || null;
            const c = getControl(p, arg, isReadOnly, 0, decl.model);

            this.controlHeights.push(c.height);

            this.addControl(p.name, c);
        }

        this.hasVariableInputs = decl.numInputs === -1;

        if (this.hasVariableInputs) {
            const input = new ClassicPreset.Input(MULTI_SOCKET_PRESETS[decl.model]);
            input.multipleConnections = true;
            this.addInput('0', input);
        } else {
            for (let i = 0; i < decl.numInputs; i++) {
                this.addInput(i.toString(), new ClassicPreset.Input(SINGLE_SOCKET_PRESETS[decl.model]));
            }
        }
    }

    recomputeSize() {
        const oldWidth = this.width;
        this.width = BASE_WIDTH;
        if (this.isReadOnly) {
            this.width += METADATA_COLLAPSE_WIDTH;
        }
        if (this.isMetaVisible()) {
            this.width += METADATA_WIDTH;
        }
        const deltaX = this.width - oldWidth;

        const oldHeight = this.height;
        const sum = Object.values(this.controlHeights).reduce((total, value) => total + value() + 12, 0);
        this.height = BASE_HEIGHT + (this.isMetaVisible() ? Math.max(sum, this.metadata.height()) : sum);
        let deltaY = 0;
        if (oldHeight) {
            deltaY = this.height - oldHeight;
            deltaY += deltaY > 0 ? 1 : -1; // slight adjustment is required for smooth behavior
        }
        this.updateArea(this, {x: -deltaX / 2, y: -deltaY});
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

        let values;
        if (this.hasVariableInputs) {
            values = inputs['0'];
        } else {
            values = Object.keys(inputs)
            .sort((a, b) => parseInt(a, 10) - parseInt(b, 10)) // keys correspond to input socket key
            .map(key => inputs[key]);
        }
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
        return new AlgNode(this.decl, args, null, this.isReadOnly, this.updateArea);
    }

}
