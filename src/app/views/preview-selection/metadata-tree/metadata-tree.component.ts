import {Component, Input, Output, EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Node} from '../preview-selection.component';
import {FormsModule} from '@angular/forms';
import {AbstractNode} from '../../../components/data-view/models/result-set.model';

@Component({
    selector: 'app-metadata-tree',
    standalone: true,
    imports: [
        CommonModule,
        FormsModule
    ],
    templateUrl: './metadata-tree.component.html',
    styleUrl: './metadata-tree.component.scss'
})

export class MetadataTreeComponent {
    @Input() node!: Node;
    @Input() path = '';
    @Output() columnToggle = new EventEmitter<{ fullKey: string, checked: boolean, diff?, type? }>();
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
        const isLeaf = !n.children || n.children.length === 0;
        const isGhost = n.type === 'ghost';

        if (isGhost) {
            out.add(next.join('.'));
        }

        n.children?.forEach(c => this.collectRemoved(c, next, out));
    }


    toggleColumn(fullKey: string, checked: boolean, diff, type) {
        this.columnToggle.emit({fullKey, checked, diff, type});
    }

    // TODO Aliase may be shown with the physical name.
    getAlias(node: AbstractNode): string {
        return (node.properties && typeof node.properties === 'object')
            ? (node.properties['alias'] ?? '')
            : '';
    }

    setAlias(node: AbstractNode, value: string): void {
        const trimmed = value.trim();

        if (!trimmed) {
            if (node.properties) {
                delete node.properties['alias'];
            }
            return;
        }

        if (!node.properties || typeof node.properties !== 'object') {
            node.properties = {};
        }

        node.properties['alias'] = trimmed;
    }

    getNodeClass(node: AbstractNode): string {
        if (node.properties?.['diff'] === 'ADDED') {
            return 'node-added';
        } else if (node.properties?.['diff'] === 'REMOVED' || node.type === 'ghost') {
            return 'node-removed';
        } else {
            return '';
        }

    }


}
