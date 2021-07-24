import {Component, Input, OnInit} from '@angular/core';

@Component({
    selector: 'app-json-text',
    templateUrl: './json-text.component.html',
    styleUrls: ['./json-text.component.scss']
})
export class JsonTextComponent implements OnInit {

    @Input() text?: string;
    testing;

    constructor() {
    }

    ngOnInit(): void {
        this.testing = this.parse(this.text);
    }

    parse(text: string) {
        try {
            console.log('error');
            return JSON.parse(text);
        } catch (e) {
            return text;
        }
    }
}
