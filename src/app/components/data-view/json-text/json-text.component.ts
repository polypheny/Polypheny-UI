import {Component, Input, OnInit} from '@angular/core';

@Component({
    selector: 'app-json-text',
    templateUrl: './json-text.component.html',
    styleUrls: ['./json-text.component.scss']
})
export class JsonTextComponent implements OnInit {

    @Input() text?: string;

    constructor() {
    }

    ngOnInit(): void {
    }

    parse(text: string) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return text;
        }
    }
}
