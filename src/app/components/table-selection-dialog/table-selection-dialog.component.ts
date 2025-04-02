import {Component, Inject} from '@angular/core';
import {DatabaseInfo, TableInfo} from '../../models/databaseInfo.model';
import {FormsModule} from '@angular/forms';
import {NgForOf} from '@angular/common';
import {MatButton} from '@angular/material/button';

@Component({
    selector: 'app-table-selection-dialog',
    imports: [
        FormsModule,
        NgForOf
    ],
    templateUrl: './table-selection-dialog.component.html',
    standalone: true,
    styleUrl: './table-selection-dialog.component.scss'
})
export class TableSelectionDialogComponent {
    constructor() {
    }

    data: DatabaseInfo[] = [];

    ngOnInit() {
        const raw = localStorage.getItem('databaseInfo');
        if (raw) {
            this.data = JSON.parse(raw);

        }
    }

    close(): void {
        window.close();
    }

    getSelectedTables(): string[] {
        const selected: string[] = [];
        for (const db of this.data) {
            for (const schema of db.schemas) {
                for (const table of schema.tables) {
                    if (table.selected) {
                        selected.push(`${db.name}.${schema.name}.${table.name}`);
                    }
                }
            }
        }
        return selected;
    }
}
