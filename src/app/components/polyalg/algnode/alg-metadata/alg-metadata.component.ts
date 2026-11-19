import {Component, Input} from '@angular/core';
import {BadgeLevel, MetadataBadge, MetadataConnection, MetadataTableEntry, PlanMetadata} from '../../models/polyalg-plan.model';

@Component({
    selector: 'app-alg-metadata',
    templateUrl: './alg-metadata.component.html',
    styleUrl: './alg-metadata.component.scss'
})
export class AlgMetadataComponent {
    @Input() data: AlgMetadata;

    BADGE_COLORS = {
        [BadgeLevel.INFO]: 'info',
        [BadgeLevel.WARN]: 'warning',
        [BadgeLevel.DANGER]: 'danger'
    };
}

export class AlgMetadata {
    table: MetadataTableEntry[];
    badges: MetadataBadge[];
    isAuxiliary: boolean;
    outConnection?: MetadataConnection;

    displayTable: [string, string][] = [];

    constructor(meta: PlanMetadata) {
        this.table = meta.table || [];
        this.badges = meta.badges || [];
        this.isAuxiliary = meta.isAuxiliary;
        this.outConnection = meta.outConnection;

        for (const entry of this.table) {
            const name = entry.calculated ? entry.displayName + '*' : entry.displayName;
            const value = this.round(entry.value, 2).toString();
            this.displayTable.push([name, value]);
            if (entry.cumulativeValue && entry.cumulativeValue !== entry.value) {
                this.displayTable.push([name + ' (total)', this.round(entry.cumulativeValue, 2).toString()]);
            }
        }
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
}
