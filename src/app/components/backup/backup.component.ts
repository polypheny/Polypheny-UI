import {Component, effect, inject, signal, untracked, WritableSignal} from "@angular/core";
import {BackupService} from "../../services/backup.service";
import {ElementModel, ManifestModel} from "../../models/backup.model";
import {BackupOverviewComponent} from "./overview/backup-overview.component";
import {
    ButtonCloseDirective,
    ButtonDirective,
    ModalBodyComponent,
    ModalComponent,
    ModalFooterComponent,
    ModalHeaderComponent,
    ModalTitleDirective
} from "@coreui/angular";
import {LeftSidebarService} from "../left-sidebar/left-sidebar.service";
import {NgForOf, NgIf} from "@angular/common";
import {ToasterService} from "../toast-exposer/toaster.service";
import {BackupTreeComponent} from "./tree/backup-tree.component";
import {BackupItemComponent} from "./item/backup-item.component";
import {FormsModule} from "@angular/forms";

@Component({
    selector: 'app-backup',
    templateUrl: './backup.component.html',
    styleUrls: ['./backup.component.scss'],
    imports: [
        BackupOverviewComponent,
        ButtonDirective,
        NgIf,
        ModalComponent,
        ModalHeaderComponent,
        ModalBodyComponent,
        ModalFooterComponent,
        ButtonCloseDirective,
        ModalTitleDirective,
        BackupTreeComponent,
        BackupItemComponent,
        NgForOf,
        FormsModule
    ],
    standalone: true
})
export class BackupComponent {
    _backup: BackupService = inject(BackupService);
    _sidebar: LeftSidebarService = inject(LeftSidebarService);
    _toast: ToasterService = inject(ToasterService);

    $isBackingUp: WritableSignal<boolean> = signal(false);
    $isRestoring: WritableSignal<boolean> = signal(false);

    currentRestore: ManifestModel = null;

    currentBackup: ElementModel[] = null;

    public allSchema: WritableSignal<boolean> = signal(true);
    public allData: WritableSignal<boolean> = signal(true);
    public allConfig: WritableSignal<boolean> = signal(true);

    constructor() {
        this._backup.updateAvailableBackups();

        this._sidebar.listConfigManagerPages();

        effect(() => {
            const restore = this._backup.$currentRestore();
            if (restore == null) {
                return;
            }
            this.currentRestore = restore;
            untracked(() => {
                this.$isRestoring.set(true);
            })
        })

        effect(() => {
            const backup = this._backup.$currentBackup();
            if (backup == null) {
                return;
            }
            this.currentBackup = backup;
            untracked(() => {
                this.$isBackingUp.set(true);
            })
        })

        effect(() => {
            const schema = this.allSchema();
            if (schema) {
                return;
            }
            untracked(() => {
                this.allData.set(false);
                this.allConfig.set(false);
            })
        })

        effect(() => {
            const data = this.allData();
            if (data) {
                return;
            }
            untracked(() => {
                this.allConfig.set(false);
            })
        })

    }

    createBackup() {
        this._backup.createBackup(this.currentBackup);
        this.currentBackup = null;
    }

    restoreBackup() {
        this._backup.restoreBackup(this.currentRestore);
        this.currentBackup = null;
    }

    startBackup() {
        this._backup.getCurrentStructure().subscribe({
            next: (res: ElementModel[]) => {
                console.log(res)
                this._backup.$currentBackup.set(res);
            },
            error: () => {
                this._toast.error("Error on retrieving current structure")
            }
        })
    }
}