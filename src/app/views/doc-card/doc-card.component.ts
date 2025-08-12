import {Component, EventEmitter, Input, Output} from '@angular/core';
import {MatCheckbox, MatCheckboxModule} from '@angular/material/checkbox';
import {FormsModule} from '@angular/forms';
import {MatCard, MatCardContent, MatCardModule, MatCardTitle} from '@angular/material/card';
import {AbstractNode} from '../preview-selection/models/metadataTree.model';
import {NgIf, NgForOf} from '@angular/common';


@Component({
    selector: 'app-doc-card',
    standalone: true,
    imports: [
        MatCheckbox,
        FormsModule,
        MatCardContent,
        MatCardTitle,
        MatCard,
        NgIf,
        NgForOf,
        MatCardModule,
        MatCheckboxModule
    ],
    templateUrl: './doc-card.component.html',
    styleUrl: './doc-card.component.scss'
})
export class DocCardComponent {
    @Input() node!: AbstractNode;
    @Input() nested = false;
    @Output() toggle = new EventEmitter<AbstractNode>();


    get kvRows(): { k: string; v: any; type: string }[] {
        if (!this.node.children?.length) {
            return [];
        }

        return this.node.children.map(c => ({
            k: c.name,
            v: c.properties?.sample,
            type: c.type
        }));
    }


    get subNodes(): AbstractNode[] {
        return this.node.children?.filter(c => c.children?.length) ?? [];
    }

    prettifyKey(k: string): string {
        return k.replace(/^idx\d+:?/, '').replace(/_/g, ' ');
    }
}

