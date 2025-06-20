import {Component, Input, Output, EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {Node} from '../preview-selection.component';
import {FormsModule} from '@angular/forms';
import { AbstractNode } from '../../../components/data-view/models/result-set.model';

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
    @Output() columnToggle = new EventEmitter<{ fullKey: string, checked: boolean }>();
    @Output() autoSelectRemoved = new EventEmitter<Set<string>>();

    ngOnInit() {
        const removed = new Set<string>();
        this.collectRemoved(this.node, [], removed);
        console.log('removed →', removed);
        if (removed.size) {
            this.autoSelectRemoved.emit(removed);
        }
    }

    private collectRemoved(node: AbstractNode,
                           pathAcc: string[],
                           bucket: Set<string>): void {

        const nextPath = [...pathAcc, node.name];
        const isLeaf   = !node.children || node.children.length === 0;

        if (isLeaf && node.properties?.['diff'] === 'REMOVED') {
            bucket.add(nextPath.join('.'));
        }

        node.children?.forEach(child =>
            this.collectRemoved(child, nextPath, bucket));
    }



    toggleColumn(fullKey: string, checked: boolean) {
        this.columnToggle.emit({fullKey, checked});
    }

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
        switch (node.properties?.['diff']) {
            case 'ADDED': return 'node-added';
            case 'REMOVED': return 'node-removed';
            default: return '';
        }
    }



}
