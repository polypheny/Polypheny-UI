import {ChangeDetectorRef, Component, computed, effect, HostBinding, Input, OnChanges, signal, Signal, WritableSignal} from '@angular/core';
import {ClassicPreset} from 'rete';
import {KeyValue} from '@angular/common';
import {Declaration, OperatorModel, SimpleType} from '../models/polyalg-registry';
import {PlanArgument} from '../models/polyalg-plan.model';
import {getControl} from '../controls/arg-control-utils';
import {ArgControl} from '../controls/arg-control';
import {Position} from 'rete-angular-plugin/17/types';
import {AlgNodeSocket} from '../custom-socket/custom-socket.component';
import {AlgMetadata} from './alg-metadata/alg-metadata.component';
import {getModelPrefix} from '../polyalg-viewer/alg-editor-utils';
import {PlanType} from '../../../models/information-page.model';

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

    deactivateSimpleMode() {
        this.data.isSimpleMode.set(false);
    }
}

const BASE_WIDTH = 350;
const METADATA_WIDTH = 250;
const METADATA_COLLAPSE_WIDTH = 16;
const BASE_HEIGHT = 110;
const TAB_SIZE = 2; // the indentation width when generating PolyAlg

const SINGLE_SOCKET_PRESETS = {
    [OperatorModel.DOCUMENT]: new AlgNodeSocket(OperatorModel.DOCUMENT),
    [OperatorModel.RELATIONAL]: new AlgNodeSocket(OperatorModel.RELATIONAL),
    [OperatorModel.GRAPH]: new AlgNodeSocket(OperatorModel.GRAPH),
    [OperatorModel.COMMON]: new AlgNodeSocket(OperatorModel.COMMON),
};
const MULTI_SOCKET_PRESETS = {
    [OperatorModel.DOCUMENT]: new AlgNodeSocket(OperatorModel.DOCUMENT, true),
    [OperatorModel.RELATIONAL]: new AlgNodeSocket(OperatorModel.RELATIONAL, true),
    [OperatorModel.GRAPH]: new AlgNodeSocket(OperatorModel.GRAPH, true),
    [OperatorModel.COMMON]: new AlgNodeSocket(OperatorModel.COMMON, true),
};
const MODEL_COLORS = new Map([
    [OperatorModel.RELATIONAL, 'warning'],
    [OperatorModel.DOCUMENT, 'warning'],
    [OperatorModel.GRAPH, 'warning'],
    [OperatorModel.COMMON, 'warning']
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
    readonly isSimpleMode: WritableSignal<boolean>;
    readonly hasSimpleParams: boolean; // true if at least one parameter has a simple variant (even if it's hidden)
    readonly hasVisibleControls;
    multiConnIdx: number | null = null; // in the case that the output of this node is connected to a node that allows multiple connections, this indicates the order


    constructor(public readonly decl: Declaration, public readonly planType: PlanType,
                args: { [key: string]: PlanArgument } | null, public readonly metadata: AlgMetadata | null,
                isSimpleMode: boolean, public isReadOnly: boolean, private updateArea: (a: AlgNode, delta: Position) => void) {
        super(decl.convention? decl.name : decl.name.substring(decl.name.indexOf('_') + 1));
        this.modelBadge = getModelPrefix(decl.model);
        this.modelColor = MODEL_COLORS.get(decl.model);
        this.isSimpleMode = signal(isSimpleMode);

        if (metadata) {
            this.isMetaVisible.set(true);
        }
        this.width = isReadOnly ? BASE_WIDTH + METADATA_WIDTH + METADATA_COLLAPSE_WIDTH : BASE_WIDTH;

        const output = new ClassicPreset.Output(SINGLE_SOCKET_PRESETS[decl.model]);
        output.multipleConnections = false;
        this.addOutput('out', output);

        let hasSimpleParams = false;
        let hiddenSimpleParamsCount = 0;
        let paramsCount = 0;
        for (const p of decl.posParams.concat(decl.kwParams)) {
            paramsCount++;
            if (p.simpleType) {
                hasSimpleParams = true;
                if (p.simpleType === SimpleType.HIDDEN) {
                    hiddenSimpleParamsCount++;
                }
            }
            const arg = args?.[p.name] || null;
            const c = getControl(p, arg, isReadOnly, 0, decl.model, planType, this.isSimpleMode);

            this.controlHeights.push(c.visibleHeight);

            this.addControl(p.name, c);
        }
        this.hasSimpleParams = hasSimpleParams;

        this.hasVisibleControls = computed(() => this.isSimpleMode() ? paramsCount - hiddenSimpleParamsCount > 0 : paramsCount > 0);

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
            if (this.isMetaVisible()) {
                this.width += METADATA_WIDTH;
            }
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

    setMultiConnIdx(i: number) {
        this.multiConnIdx = i;
        this.updateArea(this, {x: 0, y: 0});
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
            values = inputs['0'] || [];
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
        return new AlgNode(this.decl, this.planType, args, null, this.isSimpleMode(), this.isReadOnly, this.updateArea);
    }

}
