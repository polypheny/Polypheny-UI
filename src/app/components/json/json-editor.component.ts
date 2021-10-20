import {
    Component,
    EventEmitter,
    Input,
    OnChanges, OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';
import {isNumeric} from 'rxjs/internal-compatibility';

class Pair {
    constructor(key: string, value: string | number | {}) {
        this.key = key;
        this.value = value;
    }

    key: string;
    value: string | number | {};
}

@Component({
    selector: 'app-json-editor',
    templateUrl: './json-editor.component.html',
    styleUrls: ['./json-editor.component.scss']
})

//ace editor: see: https://medium.com/@ofir3322/create-an-online-ide-with-angular-6-nodejs-part-1-163a939a7929

export class JsonEditorComponent implements OnChanges, OnInit  {

    constructor() {
        this.data = [];
    }
    data: Pair[];
    @Input() empty: boolean;
    @Input() json: {};
    @Output() valueChange = new EventEmitter();


    private static tryParse(value: string | number | {}) {
        try {
            return JSON.parse(value.toString().replace('\"', '"').replace('"', '\"'));
        } catch (e) {
            return null;
        }
    }
    
    ngOnInit() {
        this.addInitialValues();
    }


    addColumn() {
        this.data.push(new Pair('', ''));
    }

    ngOnChanges(changes: SimpleChanges) {
        try {
            const data = JSON.parse(changes.json.currentValue.replace('"', '\"'));
            this.data = [];
            for (const [key, value] of Object.entries(data) ){
                let val = value;
                if ( value instanceof Object ){
                    val = JSON.stringify(value);
                }

                this.data.push(new Pair(key, val));
            }
        }catch (e) {
            console.log('could not translate');
        }
    }

    changeHappened() {
        const data = {};
        for( const entry of this.data ){
            const parsed = JsonEditorComponent.tryParse(entry.value);
            
            if( isNumeric(entry.value) ) {
                data[entry.key] = Number(entry.value);
            }else if ( parsed !== null ){
                data[entry.key] = parsed;
            }else {
                data[entry.key] = entry.value;
            }
        }
        const json = JSON.stringify(data);
        this.valueChange.emit(json);
    }

    removeColumn(i: number) {
        this.data.splice(i, 1);
        this.changeHappened();
    }

    normalize(value: string | number | {}) {
        if( value instanceof Object){
            return JSON.stringify(value);
        }else {
            return value;
        }
    }

    addInitialValues() {
        try {
            const data = JSON.parse(this.json.toString().replace('"', '\"'));
            this.data = [];
            for (const [key, value] of Object.entries(data) ){
                let val = value;
                if ( value instanceof Object ){
                    val = JSON.stringify(value);
                }
                this.data.push(new Pair(key, val));
            }

        }catch (e) {
            console.log('could not translate');
        }

        if ( this.empty && this.data.length === 0 ){
            this.addColumn();
        }
    }
}


