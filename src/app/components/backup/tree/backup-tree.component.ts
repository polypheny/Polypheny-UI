import {Component, inject, Input, signal, WritableSignal} from "@angular/core";
import {BackupService} from "../../../services/backup.service";
import {ManifestModel} from "../../../models/backup.model";
import {NgForOf} from "@angular/common";
import {BackupItemComponent} from "../item/backup-item.component";

@Component({
    selector: 'app-backup-tree',
    templateUrl: './backup-tree.component.html',
    styleUrls: ['./backup-tree.component.scss'],
    imports: [
        NgForOf,
        BackupItemComponent
    ],
    standalone: true
})
export class BackupTreeComponent {

    _backup: BackupService = inject(BackupService)

    @Input()
    backup: ManifestModel;

    @Input()
    modifiable: boolean;

    doSchema: WritableSignal<boolean> = signal(true);

    doData: WritableSignal<boolean> = signal(true);

    doConfig: WritableSignal<boolean> = signal(true);

    @Input() set allSchema(allSchema: boolean) {
        console.log(allSchema)
        this.doSchema.set(allSchema);
    }

    @Input() set allData(allData: boolean) {
        this.doData.set(allData);
    }

    @Input() set allConfig(allConfig: boolean) {
        this.doConfig.set(allConfig);
    }


}