import {Component, inject, Inject} from '@angular/core';
import {DatabaseInfo, TableInfo, SchemaInfo} from '../../models/databaseInfo.model';
import {FormsModule} from '@angular/forms';
import {NgForOf, NgIf} from '@angular/common';
import {CrudService} from '../../services/crud.service';
import {PreviewRequest} from '../../models/ui-request.model';

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

    data: DatabaseInfo[] = [];
    selectedMetadata: string[] = [];

    close(): void {
        window.close();
    }

    ngOnInit(): void {
        const metaRaw = localStorage.getItem('metaRoot');
        const previewRaw = localStorage.getItem('preview');
        console.log(metaRaw);
        console.log(previewRaw);

        if (!metaRaw || !previewRaw) {
            console.error('No meta or preview data found');
            return;
        }

        const rootNode = JSON.parse(metaRaw);
        const preview = previewRaw ? JSON.parse(previewRaw) : {};

        this.data = this.buildDatabaseInfo(rootNode, preview);
    }

    private buildDatabaseInfo(root: any, preview: any): DatabaseInfo[] {
        const db: DatabaseInfo = {name: root.name, schemas: []};
        for (const schemaNode of root.children ?? []) {

            const schema: SchemaInfo = {name: schemaNode.name, tables: []};

            for (const tableNode of schemaNode.children ?? []) {

                const tableKey = `${schemaNode.name}.${tableNode.name}`;
                const sampleRows = preview[tableKey] ?? [];

                const table: TableInfo = {name: tableNode.name, attributes: []};

                for (const colNode of tableNode.children ?? []) {
                    const colName = colNode.name;

                    table.attributes.push({
                        name: colName,
                        type: colNode.properties?.type ?? '',
                        selected: false,
                        sampleValues: sampleRows.slice(0, 5).map((r: any) => r[colName])
                    });
                }
                schema.tables.push(table);
            }
            db.schemas.push(schema);
        }
        this.data = [db];
        return [db];
    }

    getSelectedAttributeMetadata(): string[] {
        const selected: string[] = [];

        for (const db of this.data) {
            for (const schema of db.schemas) {
                for (const table of schema.tables) {
                    for (const attr of table.attributes) {
                        if (attr.selected) {
                            selected.push(
                                `${db.name}.${schema.name}.${table.name}.${attr.name} : ${attr.type}`
                            );
                        }
                    }
                }
            }
        }

        return selected;
    }

    showSelectedMetadata(): void {
        this.selectedMetadata = this.getSelectedAttributeMetadata();
    }

}

