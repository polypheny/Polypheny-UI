import {Component, inject} from '@angular/core';
import {DatabaseInfo, SchemaInfo, TableInfo} from '../../models/databaseInfo.model';
import {FormsModule} from '@angular/forms';
import {NgForOf, NgIf} from '@angular/common';
import {CrudService} from '../../services/crud.service';
import {AdapterModel, AdapterType, PolyMap} from '../../views/adapters/adapter.model';
import {DeployMode} from '../../models/catalog.model';

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

    private readonly _crud = inject(CrudService);

    data: DatabaseInfo[] = [];
    selectedMetadata: string[] = [];
    adapter: AdapterModel;

    close(): void {
        window.close();
    }

    ngOnInit(): void {
        const rawSettings = localStorage.getItem('adapterSettings');
        const metaRaw = localStorage.getItem('metaRoot');
        const previewRaw = localStorage.getItem('preview');
        console.log(metaRaw);
        console.log(previewRaw);

        const settingsObj = rawSettings ? JSON.parse(rawSettings) as Record<string, string> : {};
        const adapterSettings = new PolyMap<string, string>();
        for (const [k, v] of Object.entries(settingsObj)) {
            adapterSettings.set(k, v as string);
        }

        if (!metaRaw || !previewRaw) {
            console.error('No meta or preview data found');
            return;
        }

        let rootNode: any = JSON.parse(metaRaw);
        if (typeof rootNode === 'string') {
            rootNode = JSON.parse(rootNode);
        }

        let preview: any = JSON.parse(previewRaw);
        if (typeof preview === 'string') {
            preview = JSON.parse(preview);
        }


        this.data = this.buildDatabaseInfo(rootNode, preview);

        const infoRaw = localStorage.getItem('adapterInfo');
        const info = infoRaw ? JSON.parse(infoRaw) as Partial<{
            uniqueName: string;
            adapterName: string;
            type: AdapterType;
            mode: DeployMode;
            persistent: boolean;
        }> : {};

        this.adapter = new AdapterModel(
            info.uniqueName ?? adapterSettings.get('uniqueName') ?? 'adapter_' + Date.now(),
            info.adapterName ?? 'UNKNOWN',
            adapterSettings,
            info.persistent ?? true,
            info.type ?? AdapterType.SOURCE,
            info.mode ?? DeployMode.REMOTE
        );
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

    sendMetadataInfos(): void {


        (this.adapter as any).metadata = this.selectedMetadata;

        const formdata = new FormData();
        formdata.set('body', JSON.stringify(this.adapter));

        formdata.forEach((value, key) => {
            console.log(`${key}: ${value}`);
        });

        this._crud.createAdapter(this.adapter, formdata).subscribe({
            next: (res) => {
                console.log('Adapter + Metadaten erfolgreich gesendet', res);
                alert('Daten erfolgreich gesendet.');
            },
            error: (err) => {
                console.error(err);
                alert('Fehler beim Senden!');
            }
        });
    }


}

