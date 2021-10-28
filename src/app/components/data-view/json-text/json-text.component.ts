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
        const regex = new RegExp('/ObjectId(\d{1,24})/g');
        if( regex.test(this.text) ){
            return;
        }
        this.testing = this.parse(this.text);
    }

    parse(text: string) {
        try {
            return JSON.parse(text);
        } catch (e) {
            return text;
        }
    }
}
