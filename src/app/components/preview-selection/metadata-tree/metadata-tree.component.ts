import {Component, Input, Output, EventEmitter} from '@angular/core';
import {CommonModule} from '@angular/common';
import {AbstractNode} from '../../data-view/models/result-set.model';

@Component({
    selector: 'app-metadata-tree',
    standalone: true,
    imports: [
        CommonModule
    ],
    templateUrl: './metadata-tree.component.html',
    styleUrl: './metadata-tree.component.scss'
})

export class MetadataTreeComponent {
    @Input() node!: AbstractNode;
    @Input() path = '';
    @Output() columnToggle = new EventEmitter<{ fullKey: string, checked: boolean }>();

    toggleColumn(fullKey: string, checked: boolean) {
        this.columnToggle.emit({fullKey, checked});
    }

}
