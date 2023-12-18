import {Component, effect, inject, Input, signal, untracked, WritableSignal} from '@angular/core';
import {BackupService} from '../../../services/backup.service';
import {ElementModel} from '../../../models/backup.model';
import {NgForOf, NgIf, NgStyle} from '@angular/common';
import {FormCheckComponent, FormCheckInputDirective} from '@coreui/angular';
import {IconDirective} from '@coreui/icons-angular';
import {FormsModule} from '@angular/forms';

@Component({
    selector: 'app-backup-item',
    templateUrl: './backup-item.component.html',
    styleUrls: ['./backup-item.component.scss'],
    imports: [
        NgStyle,
        NgForOf,
        FormCheckComponent,
        NgIf,
        IconDirective,
        FormCheckInputDirective,
        FormsModule
    ],
    standalone: true
})
export class BackupItemComponent {

    _backup: BackupService = inject(BackupService);

    $open: WritableSignal<boolean> = signal(false);

    @Input()
    parent: ElementModel;

    @Input()
    element: ElementModel;

    @Input()
    indention: number;

    @Input()
    modifiable: boolean;

    @Input() set allSchema(allSchema: boolean) {
        this.doSchema.set(allSchema);
    }

    @Input() set allData(allData: boolean) {
        this.doData.set(allData);
    }

    @Input() set allConfig(allConfig: boolean) {
        this.doConfig.set(allConfig);
    }

    doSchema: WritableSignal<boolean> = signal(true);

    doData: WritableSignal<boolean> = signal(true);

    doConfig: WritableSignal<boolean> = signal(true);

    isSelected: WritableSignal<boolean> = signal(true);


    constructor() {
        effect(() => {
            const doSchema = this.doSchema();
            if (doSchema) {
                untracked(() => {
                    this.isSelected.set(true);
                });
                return;
            }
            untracked(() => {
                this.isSelected.set(false);
                this.doData.set(false);
                this.doConfig.set(false);
            });
        });

        effect(() => {
            const doData = this.doData();
            if (doData) {
                return;
            }
            untracked(() => {
                this.doConfig.set(false);
            });
        });

        effect(() => {
            const isSelected = this.isSelected();
            if (isSelected) {
                return;
            }
            untracked(() => {
                this.doSchema.set(false);
                this.doData.set(false);
                this.doConfig.set(false);
            });
        });

        effect(() => {
            if (!this.element) {
                return;
            }

            this.element.backupType = this.doConfig() ? 'STORAGE_CONFIGURATION' : this.doData() ? 'DATA' : 'SCHEMA';

            if (this.isSelected()) {
                if (!this.parent.children.includes(this.element)) {
                    this.parent.children.push(this.element);
                }
            } else {
                if (this.parent.children.includes(this.element)) {
                    this.parent.children = this.parent.children.filter(e => e !== this.element);
                }
            }
        });

    }

    toggle() {
        this.$open.set(!this.$open());
    }

    setBox($signal: WritableSignal<boolean>, $event: boolean) {
        $signal.set($event);
    }
}
