import {Component, Input, signal} from '@angular/core';
import {PlanMetadata} from '../../models/polyalg-plan.model';
import {GlobalStats} from '../../polyalg-viewer/alg-editor-utils';

@Component({
    selector: 'app-alg-metadata',
    templateUrl: './alg-metadata.component.html',
    styleUrl: './alg-metadata.component.scss'
})
export class AlgMetadataComponent {
    @Input() data: AlgMetadata;

}

export class AlgMetadata {
    height = signal(0);
    rows = new Map<string, number | null>();
    isAuxiliary = false;
    isHighestIoCost: boolean;
    isHighestRowsCost: boolean;
    isHighestCpuCost: boolean;

    constructor(meta: PlanMetadata, globalStats: GlobalStats) {
        this.computeStats(meta, globalStats);
        this.recomputeHeight();
    }

    private computeStats(meta: PlanMetadata, stats: GlobalStats) {
        this.isAuxiliary = meta.isAuxiliary;
        this.rows.set('Row Count', this.round(meta.rowCount, 2));
        this.rows.set('Rows Cost', this.round(meta.rowsCost, 2));
        this.rows.set('CPU Cost', this.round(meta.cpuCost, 2));
        this.rows.set('IO Cost', this.round(meta.ioCost, 2));

        this.isHighestIoCost = stats.maxIo > 0 && stats.maxIo === meta.ioCost;
        this.isHighestRowsCost = stats.maxRows > 0 && stats.maxRows === meta.rowsCost;
        this.isHighestCpuCost = stats.maxCpu > 0 && stats.maxCpu === meta.cpuCost;
    }

    private round(number: number, d: number) {
        if (number == null) {
            return null;
        }
        if (Number.isInteger(number)) {
            return number;
        }
        const factor = Math.pow(10, d);
        return Math.round(number * factor) / factor;
    }

    private recomputeHeight() {
        let height = 2 * 8; // padding
        if (this.isHighestIoCost || this.isHighestRowsCost || this.isHighestCpuCost) {
            height += 20;
        }
        height += this.rows.size * 33;
        this.height.set(height);
    }
}
