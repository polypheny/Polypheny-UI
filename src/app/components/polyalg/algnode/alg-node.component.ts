import {ChangeDetectorRef, Component, HostBinding, Input, OnChanges} from '@angular/core';
import {ClassicPreset} from "rete";
import {KeyValue} from "@angular/common";

type SortValue<N extends ClassicPreset.Node> = (N['controls'] | N['inputs'] | N['outputs'])[string]

@Component({
    selector: 'app-alg-node',
    templateUrl: './alg-node.component.html',
    styleUrl: './alg-node.component.scss'
})
export class AlgNodeComponent implements OnChanges {
    @Input() data!: AlgNode;
    @Input() emit!: (data: any) => void
    @Input() rendered!: () => void

    seed = 0

    @HostBinding('class.selected') get selected() {
        return this.data.selected
    }

    constructor(private cdr: ChangeDetectorRef) {
        this.cdr.detach()
    }

    ngOnChanges(): void {
        this.cdr.detectChanges()
        requestAnimationFrame(() => this.rendered())
        this.seed++ // force render sockets
    }

    sortByIndex<N extends ClassicPreset.Node, I extends KeyValue<string, SortValue<N>>>(a: I, b: I) {
        const ai = a.value?.index || 0
        const bi = b.value?.index || 0

        return ai - bi
    }
}

const BASE_WIDTH = 350;
const BASE_HEIGHT = 110;

export class AlgNode extends ClassicPreset.Node {
    width = BASE_WIDTH;
    height = BASE_HEIGHT;
    controlHeights: { [key: string]: number } = {};
    numOfInputs = 0;

    constructor(props, numberOfInputs: number) {
        super(props);
        this.numOfInputs = numberOfInputs;
        this.recomputeHeight();
    }

    updateControlHeights(heights: { [key: string]: number; }) {
        this.controlHeights = heights;
        this.recomputeHeight();
    }

    updateControlHeight(controlName: string, height: number) {
        this.controlHeights[controlName] = height;
        this.recomputeHeight();
    }

    recomputeHeight() {
        const sum = Object.values(this.controlHeights).reduce((total, value) => total + value, 0);
        this.height = BASE_HEIGHT + this.numOfInputs * 40 + sum;
    }

}
