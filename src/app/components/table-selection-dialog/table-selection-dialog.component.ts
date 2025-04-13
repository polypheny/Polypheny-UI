import {Component, Inject} from '@angular/core';
import {DatabaseInfo, TableInfo} from '../../models/databaseInfo.model';
import {FormsModule} from '@angular/forms';
import {NgForOf, NgIf} from '@angular/common';

@Component({
    selector: 'app-table-selection-dialog',
    imports: [
        FormsModule,
        NgForOf,
        NgIf
    ],
    templateUrl: './table-selection-dialog.component.html',
    standalone: true,
    styleUrl: './table-selection-dialog.component.scss'
})
export class TableSelectionDialogComponent {
    constructor() {
    }

    data: DatabaseInfo[] = [];


    close(): void {
        window.close();
    }

    ngOnInit(): void {
        const raw: string = localStorage.getItem('databaseInfo');
        if (raw) {
            this.data = JSON.parse(raw);

            // 🔁 sampleValues → values mappen
            for (const db of this.data) {
                for (const schema of db.schemas) {
                    for (const table of schema.tables) {
                        for (const attr of table.attributes) {
                            if (attr.sampleValues) {
                                attr.sampleValues = attr.sampleValues;
                            }
                        }
                    }
                }
            }
        }
    }


    getSelectedAttributes(): string[] {
        const selected: string[] = [];

        for (const db of this.data) {
            for (const schema of db.schemas) {
                for (const table of schema.tables) {
                    for (const attr of table.attributes) {
                        if (attr.selected) {
                            selected.push(`${db.name}.${schema.name}.${table.name}.${attr.name}`);
                        }
                    }
                }
            }
        }

        return selected;
    }

}
