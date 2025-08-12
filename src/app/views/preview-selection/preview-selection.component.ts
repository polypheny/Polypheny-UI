import {Component, inject} from '@angular/core';
import {ButtonCloseDirective, ButtonDirective, ColComponent, RowComponent} from '@coreui/angular';
import {Router, RouterLink} from '@angular/router';
import {AbstractNode, ChangeLogView, ChangeStatus} from './models/metadataTree.model';
import {ColumnToggleEvent} from './models/metadataTree.model';
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
    MatExpansionPanelDescription, MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from '@angular/material/expansion';
import {ToasterService} from '../../components/toast-exposer/toaster.service';

@Component({
    selector: 'app-preview-selection',
    standalone: true,
    imports: [
        ButtonDirective,
        CommonModule,
        MetadataTreeComponent,
        MatCard,
        MatCardHeader,
        MatCardTitle,
        MatCardContent,
        MatAccordion,
        MatExpansionPanel,
        MatExpansionPanelTitle,
        MatExpansionPanelDescription,
        MatExpansionPanelHeader
    ],
    templateUrl: './preview-selection.component.html',
    styleUrl: './preview-selection.component.scss'
})
export class PreviewSelectionComponent {

    private readonly _nav = inject(PreviewNavigationService);
    private readonly _crud = inject(CrudService);
    private readonly _router = inject(Router);
    private readonly _toast = inject(ToasterService);

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
    changeLog: ChangeLogView[] = [];
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


        this.ready = true;

    }

    close(): void {
        this.showSaveButton = false;
        this._router.navigate(['/views/adapters']);
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
                    this._toast.success('Successfully acknowledged!');
                    this.close();
                },
                error: err => {
                    this._toast.error('Error during acknowledgement!');
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
                this._toast.success('Config changed successfully!');
                this.close();
            },
            error: err => {
                this._toast.error('Config changed failed!');
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
            if ((n as any).cardCandidate) {
                out.push(n as AbstractNode);
                return;
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
                this._toast.success('Adapter deployed!');
                this.close();
            },
            error: err => {
                console.error(err);
                this._toast.error('Failed to deploy adapter!');
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
            case ChangeStatus.CRITICAL:
                return 'log-critical';
            case ChangeStatus.WARNING:
                return 'log-warning';
            default:
                return 'log-ok';
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


export function reviveTree(raw: any): AbstractNode {
    if (raw.children) {
        raw.children = raw.children.map(reviveTree);
    }
    return raw as AbstractNode;
}


