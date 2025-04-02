import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogActions, MatDialogContent, MatDialogRef} from '@angular/material/dialog';
import {DatabaseInfo, TableInfo} from '../../models/databaseInfo.model';
import {FormsModule} from '@angular/forms';
import {NgForOf} from '@angular/common';
import {MatButton} from '@angular/material/button';

@Component({
  selector: 'app-table-selection-dialog',
  imports: [
    MatDialogContent,
    FormsModule,
    MatDialogActions,
    NgForOf,
    MatButton,
    MatButton
  ],
  templateUrl: './table-selection-dialog.component.html',
  standalone: true,
  styleUrl: './table-selection-dialog.component.scss'
})
export class TableSelectionDialogComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: DatabaseInfo[],
    private dialogRef: MatDialogRef<TableSelectionDialogComponent>
  ) {}

  close(): void {
    this.dialogRef.close();
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
