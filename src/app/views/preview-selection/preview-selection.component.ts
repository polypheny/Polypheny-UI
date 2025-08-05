import {Component, inject} from '@angular/core';
import {ButtonCloseDirective, ButtonDirective, ColComponent, RowComponent} from '@coreui/angular';
import {Router, RouterLink} from '@angular/router';
import {AbstractNode, ChangeLogEntry, ChangeStatus} from '../../components/data-view/models/result-set.model';
import {CommonModule} from '@angular/common';
import {MetadataTreeComponent} from './metadata-tree/metadata-tree.component';
import {AdapterModel, AdapterType, PolyMap} from '../adapters/adapter.model';
import {DeployMode} from '../../models/catalog.model';
import {CrudService} from '../../services/crud.service';
import {PreviewNavigationService} from '../../services/preview-navigation.service';
import {DocCardComponent} from '../doc-card/doc-card.component';
import {MatCard, MatCardContent, MatCardHeader, MatCardTitle} from '@angular/material/card';
import {MatTab, MatTabGroup} from '@angular/material/tabs';
import {MatIcon} from '@angular/material/icon';
import {
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelDescription,
    MatExpansionPanelTitle
} from '@angular/material/expansion';

@Component({
    selector: 'app-preview-selection',
    standalone: true,
    imports: [
        ButtonDirective,
        RowComponent,
        ColComponent,
        CommonModule,
        MetadataTreeComponent,
        DocCardComponent,
        MatCard,
        MatCardHeader,
        MatCardTitle,
        MatCardContent,
        MatTabGroup,
        MatIcon,
        MatTab,
        MatAccordion,
        MatExpansionPanel,
        MatExpansionPanelTitle,
        MatExpansionPanelDescription
    ],
    templateUrl: './preview-selection.component.html',
    styleUrl: './preview-selection.component.scss'
})
export class PreviewSelectionComponent {

    private readonly _nav = inject(PreviewNavigationService);
    private readonly _crud = inject(CrudService);
    private readonly _router = inject(Router);

    private ctx = null;
    mode!: null;

    formData: FormData = new FormData();
    pendingFiles!: Map<string, File>;
    adapter: AdapterModel;


    metadata: AbstractNode = null;
    preview: Record<string, any[]> | any[] = {};
    adapterInfo: string = null;
    cards: AbstractNode[] = [];


    selected: Set<string> = new Set();

    added: Set<string> = new Set();
    removed: Set<string> = new Set();
    changeLog: ChangeLogEntry[] = [];
    readonly ChangeStatus = ChangeStatus;

    showSaveButton = false;
    showMetadata = true;
    showLogs = false;
    ready = false;

    ngOnInit() {
        this.ctx = this._nav.context;


        if (!this.ctx) {
            console.error('Preview-context not found !');
            return;
        }

        this.changeLog = this.ctx.changeLog ?? [];
        console.log(this.changeLog);
        this.mode = this.ctx.mode;
        console.log(this.mode);

        if (this.mode === 'deploy') {
            this.formData = this.ctx.formData;
            this.pendingFiles = this.ctx.files;
            this.metadata = this.ctx.metadata;
            this.preview = this.ctx.preview;
            this.adapter = this.ctx.adapter;
        } else {
            this.metadata = this.ctx.metadata;
            this.preview = this.ctx.preview;
            this.adapterInfo = this.ctx.adapterInfo.uniqueName;
            console.log(this.metadata);
        }

        this.collectSelected(this.metadata);


        if (this.isDocumentAdapter) {
            this.cards = [];
            this.cards = this.findCards(this.metadata);
        }

        /*const opener = (window.opener as any);
        this.formData = opener?.pendingFormData;
        this.pendingFiles = opener.pendingFiles as Map<string, File>;


        let metaRaw = localStorage.getItem('metaRoot');
        metaRaw = JSON.parse(metaRaw);
        this.metadata = this.deserializeNode(metaRaw);

        const previewRaw = localStorage.getItem('preview');
        this.preview = previewRaw ? JSON.parse(previewRaw) : {};

        console.log(this.metadata);


        const rawSettings = localStorage.getItem('adapterSettings');
        const settingsObj = rawSettings ? JSON.parse(rawSettings) as Record<string, string> : {};
        const adapterSettings = new PolyMap<string, string>();
        for (const [k, v] of Object.entries(settingsObj)) {
            adapterSettings.set(k, v as string);
        }


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
        );*/


        this.ready = true;

    }

    close(): void {
        this.showSaveButton = false;
        this._router.navigate(['/views/adapters']);
    }

    deserializeNode(obj: any): Node {
        const node = new Node(obj.type, obj.name);

        if (obj.properties) {
            for (const [key, value] of Object.entries(obj.properties)) {
                node.addProperty(key, value);
            }
        }

        if (obj.children && Array.isArray(obj.children)) {
            for (const child of obj.children) {
                node.addChild(this.deserializeNode(child));
            }
        }


        return node;
    }

    collectSelected(node: AbstractNode, path: string[] = []) {
        const fullPath = [...path, node.name];
        if (node.isSelected) {
            this.selected.add(fullPath.join('.'));
        }
        node.children?.forEach(c => this.collectSelected(c, fullPath));
    }

    getPreviewKeys(): string[] {
        return Object.keys(this.preview);
    }

    getPreviewColumns(tableName: string): string[] {
        const rows = this.preview[tableName];
        return rows && rows.length ? Object.keys(rows[0]) : [];
    }

    onColumnToggle(e: ColumnToggleEvent) {
        this.makeSaveButtonVisible();
        console.log(e.diff);
        if (e.diff === 'ADDED') {
            e.checked ? this.added.add(e.fullKey) : this.added.delete(e.fullKey);
            console.log(this.added);
        } else {
            e.checked ? this.selected.add(e.fullKey) : this.selected.delete(e.fullKey);
            console.log(this.selected);
        }
    }

    onAutoSelect(paths: string[]): void {
        paths.forEach(p => this.removed.add(p));
        console.log(this.removed);
    }

    private collectCards(n: AbstractNode) {
        console.log(n);
        if (n.cardCandidate === true) {
            this.cards.push(n);
        }
        n.children?.forEach(c => this.collectCards(c));
    }


    /*sendMetadata() {
        (this.adapter as any).metadata = Array.from(this.selected);


        this._crud.createAdapter(this.adapter, this.formData).subscribe({
            next: (res) => {
                console.log('Adapter + Metadaten erfolgreich gesendet', res);
                alert('Daten erfolgreich gesendet.');
            },
            error: (err) => {
                console.error(err);
                alert('Fehler beim Senden!');
            }
        });
    }*/

    sendAck(): void {
        const addedPaths: string[] = Array.from(this.added);
        const removedPaths: string[] = Array.from(this.removed);


        const payload = {
            uniqueName: this.adapterInfo,
            addedPaths: Array.from(addedPaths),
            removedPaths: Array.from(removedPaths)
        };
        console.log(payload.addedPaths);
        console.log(payload.removedPaths);


        this._crud.metadataAck(payload).subscribe(
            {
                next: () => {
                    alert('Acknowledgement was sent.');
                    this.close();
                },
                error: err => {
                    alert('Acknowledgement was sent.');
                    this.close();
                }
            }
        );
    }

    sendConfigChange(): void {
        const selected: string[] = Array.from(this.selected);

        const payload = {
            uniqueName: this.adapterInfo,
            selected: selected
        };


        console.log(selected);
        this._crud.setMetaConfiguration(payload).subscribe({
            next: () => {
                alert('Config changed successfully!');
                this.close();
            },
            error: err => {
                alert('Config changed failed!');
                this.close();
            }
        });
    }

    makeSaveButtonVisible(): void {
        if (this.showSaveButton === false) {
            this.showSaveButton = true;
        }
    }

    get isDocumentAdapter(): boolean {
        return this.adapter?.adapterName.toLowerCase() === 'json';
    }

    onCardToggle(node: Node) {
        (node as any).isSelected = !(node as any).isSelected;
        console.log('Card toggled:', node.name, 'selected?', (node as any).isSelected);
        if ((node as any).isSelected) {
            this.selected.add(node.name);
        } else {
            this.selected.delete(node.name);
        }
        console.log(this.selected);
    }

    private findCards(root: AbstractNode): AbstractNode[] {
        const out: AbstractNode[] = [];

        function walk(n: AbstractNode) {
            if ((n as any).cardCandidate) {               // Ebene-0-Objekt
                out.push(n as AbstractNode);
                return;                                     // nicht tiefer bohren
            }
            n.children?.forEach(walk);
        }

        walk(root);
        return out;
    }


    sendMetadata(): void {

        const aliases: Map<string, string> = new Map();
        const newFormData = new FormData();
        const files: Map<string, File> = this.ctx.files;


        for (const [field, file] of this.pendingFiles) {
            if (!newFormData.has(field)) {
                newFormData.append(field, file);
            }
        }


        (this.adapter as any).metadata = Array.from(this.selected);

        this.collectAliases(this.metadata, aliases);
        (this.adapter as any).columnAliases = aliases;

        const firstFileName = files.keys().next().value as string;

        if (this.adapter.settings.has('directory')) {
            const fileNames = [firstFileName];
            this.adapter.settings.set('directory', JSON.stringify(fileNames));
        }


        newFormData.forEach((value, key) => {
            console.log(`${key}: ${value}`);
        });

        this._crud.createAdapter(this.adapter, newFormData).subscribe({
            next: res => {
                alert('Adapter + Metadata sent successfully.');
                this.close();
            },
            error: err => {
                console.error(err);
                alert('Fail to send metadata!');
            }
        });

    }

    private collectAliases(node: AbstractNode, out: Map<string, string>, path: string = '') {
        const currentPath = path ? `${path}.${node.name}` : node.name;

        if (node.type === 'column') {
            const alias = node.properties?.['alias'];
            if (alias) {
                out[currentPath] = alias;
            }
        }
        node.children?.forEach(c => this.collectAliases(c, out, currentPath));
    }

    getSeverityClass(sev: ChangeStatus): string {
        switch (sev) {
            case ChangeStatus.CRITICAL: return 'log-critical';
            case ChangeStatus.WARNING:  return 'log-warning';
            default:                    return 'log-ok';
        }
    }

}

export class Node implements AbstractNode {
    type: string;
    name: string;
    children: AbstractNode[] = [];
    properties: { [key: string]: any } = {};
    isSelected?: boolean;

    jsonPath?: string;
    cardCandidate?: boolean;
    valueType?: string;


    constructor(type: string, name: string) {
        this.type = type;
        this.name = name;
    }

    addChild(node: AbstractNode): void {
        this.children.push(node);
    }

    addProperty(key: string, value: any): void {
        this.properties[key] = value;
    }

    getProperty(key: string): string {
        return this.properties[key];
    }
}

/*export class DocumentObjectNode extends Node implements AbstractNode {
    readonly jsonPath!: string;
    readonly cardCandidate!: boolean;
}

export class DocumentArrayNode extends Node implements AbstractNode {
    readonly jsonPath!: string;
}

export class DocumentValueNode extends Node implements AbstractNode {
    readonly jsonPath!: string;
    readonly valueType!: string;
    readonly sample!: any;
}

export function nodeFactory(raw: any): Node {
    switch (raw.type) {
        case 'object':
            return Object.assign(new DocumentObjectNode(raw.type, raw.name), raw);
        case 'array':
            return Object.assign(new DocumentArrayNode(raw.type, raw.name), raw);
        case 'value':
            return Object.assign(new DocumentValueNode(raw.type, raw.name), raw);
        default:
            return Object.assign(new Node(raw.type, raw.name), raw);
    }
}*/

export function reviveTree(raw: any): AbstractNode {
    if (raw.children) {
        raw.children = raw.children.map(reviveTree);
    }
    return raw as AbstractNode;
}

interface ColumnToggleEvent {
    fullKey: string;
    checked: boolean;
    diff?: 'ADDED' | 'REMOVED';
    type?: 'ghost' | 'table' | 'column';
}


