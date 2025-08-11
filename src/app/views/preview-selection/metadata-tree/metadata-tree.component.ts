import {Component, Input, Output, EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Node} from '../preview-selection.component';
import {FormsModule} from '@angular/forms';
import {AbstractNode} from '../../../components/data-view/models/result-set.model';

@Component({
    selector: 'app-metadata-tree',
    standalone: true,
    imports: [CommonModule, FormsModule],
    templateUrl: './metadata-tree.component.html',
    styleUrl: './metadata-tree.component.scss'
})
export class MetadataTreeComponent {
    @Input() node!: AbstractNode;
    @Input() path = '';
    @Output() columnToggle = new EventEmitter<{ fullKey: string; checked: boolean; diff?; type? }>();
    @Output() autoSelectRemoved = new EventEmitter<string[]>();

    ngOnInit(): void {
        const removed = new Set<string>();
        this.collectRemoved(this.node, [], removed);
        if (removed.size) {
            this.autoSelectRemoved.emit([...removed]);
        }
    }

    private collectRemoved(n: AbstractNode, path: string[], out: Set<string>): void {
        const next = [...path, n.name];
        if ((n as any).type === 'ghost') {
            out.add(next.join('.'));
        }
        n.children?.forEach(c => this.collectRemoved(c, next, out));
    }

    toggleColumn(fullKey: string, checked: boolean, diff?: any, type?: any) {
        this.columnToggle.emit({fullKey, checked, diff, type});
    }

    onNodeToggle(checked: boolean): void {
        const parts = this.path ? this.path.split('.') : [];
        this.toggleRecursive(this.node, parts, checked);
    }

    private toggleRecursive(n: AbstractNode, pathParts: string[], checked: boolean): void {
        (n as any).isSelected = checked;

        const next = [...pathParts, n.name];
        const isLeaf = !n.children || n.children.length === 0;

        if (isLeaf && (n as any).type === 'column') {
            const fullKey = next.join('.');
            const diff = (n as any).properties?.['diff'];
            this.columnToggle.emit({fullKey, checked, diff, type: 'column'});
            return;
        }
        n.children?.forEach(c => this.toggleRecursive(c, next, checked));
    }

    getAlias(node: AbstractNode): string {
        return (node as any).properties?.['alias'] ?? '';
    }

    setAlias(node: AbstractNode, value: string): void {
        const trimmed = (value ?? '').trim();
        if (!trimmed) {
            if ((node as any).properties) {
                delete (node as any).properties['alias'];
            }
            return;
        }
        (node as any).properties = (node as any).properties ?? {};
        (node as any).properties['alias'] = trimmed;
    }

    getNodeClass(node: AbstractNode): string {
        const props = (node as any).properties || {};
        if (props['diff'] === 'ADDED') {
            return 'node-added';
        }
        if (props['diff'] === 'REMOVED' || (node as any).type === 'ghost') {
            return 'node-removed';
        }
        return '';
    }
}
