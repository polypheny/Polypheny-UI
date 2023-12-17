import {Component, computed, inject, OnInit, signal, Signal, WritableSignal} from "@angular/core";
import {BackupService} from "../../../services/backup.service";
import {NgForOf, NgIf} from "@angular/common";
import {Code, ManifestModel, StatusModel} from "../../../models/backup.model";
import {
    ButtonDirective,
    ButtonGroupComponent,
    CardComponent,
    FormCheckComponent,
    InputGroupComponent,
    ListGroupDirective,
    ListGroupItemDirective,
    TooltipDirective
} from "@coreui/angular";
import {ToasterService} from "../../toast-exposer/toaster.service";
import {BackupTreeComponent} from "../tree/backup-tree.component";

@Component({
    selector: 'app-backup-overview',
    templateUrl: './backup-overview.component.html',
    styleUrls: ['./backup-overview.component.scss'],
    imports: [
        NgForOf,
        ListGroupDirective,
        ListGroupItemDirective,
        CardComponent,
        FormCheckComponent,
        InputGroupComponent,
        ButtonDirective,
        ButtonGroupComponent,
        TooltipDirective,
        NgIf,
        BackupTreeComponent
    ],
    standalone: true
})
export class BackupOverviewComponent implements OnInit {

    readonly _backup: BackupService = inject(BackupService);
    readonly _toast: ToasterService = inject(ToasterService);

    readonly $backups: Signal<ManifestModel[]>;

    readonly current: WritableSignal<ManifestModel> = signal(null);


    constructor() {
        this.$backups = computed(() => {
            console.log(this._backup.$backups())
            return this._backup.$backups();
        })
    }

    ngOnInit(): void {
        this._backup.updateAvailableBackups();
    }

    restoreBackup(backup: ManifestModel) {
        this._backup.$currentRestore.set(backup)
    }

    deleteBackup(backup: ManifestModel) {
        this._backup.deleteBackup(backup.id).subscribe({
            next: (res: StatusModel) => {
                if (res.code == Code.SUCCESS) {
                    this._toast.success('Successfully deleting backup.');
                } else {
                    this._toast.error('Error on deleting backup: ' + res.message);
                }

            }, error: (err) => {
                this._toast.error('Error on deleting backup')
            }
        })
    }
}