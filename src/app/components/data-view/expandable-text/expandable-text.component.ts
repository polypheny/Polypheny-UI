import {Component, Input, OnInit} from '@angular/core';

@Component({
    selector: 'app-expandable-text',
    templateUrl: './expandable-text.component.html',
    styleUrls: ['./expandable-text.component.scss'],
    standalone: false
})
export class ExpandableTextComponent implements OnInit {

    @Input() expand? = false;
    @Input() text?: string;
    @Input() sliceLength? = 1000;

    constructor() {
    }

    ngOnInit(): void {
    }

}
