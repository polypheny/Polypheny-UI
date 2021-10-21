import {
    Component,
    EventEmitter,
    Input,
    OnChanges, OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';
import {isNumeric} from 'rxjs/internal-compatibility';

export class Pair {
    static idBuilder = 0;
    private id: number;
    key: string;
    value: string | number | {} | Pair[];

    constructor(key: string, value: string | number | { } | Pair[]) {
        this.id = Pair.getAndIncrementId();
        this.key = key;
        this.value = value;
    }

    static getAndIncrementId() {
        const id = Pair.idBuilder;
        Pair.idBuilder++;
        return id;
    }
}

export class Info {
    index: string;
    type: Type;
    constructor(index: string, type: Type) {
        this.index = index;
        this.type = type;
    }
}

export enum Type {
    Value,Object, Array
}


@Component({
    selector: 'app-json-editor',
    templateUrl: './json-editor.component.html',
    styleUrls: ['./json-editor.component.scss']
})

//ace editor: see: https://medium.com/@ofir3322/create-an-online-ide-with-angular-6-nodejs-part-1-163a939a7929

export class JsonEditorComponent implements OnInit  {

    constructor() {
        this.data = [];
    }
    data: Pair[];
    @Input() empty: boolean;
    @Input() json: {};
    @Output() valueChange = new EventEmitter();
    show = false;


    private static tryParse(value: string | number | {}) {
        try {
            return JSON.parse(value.toString().replace('\"', '"').replace('"', '\"'));
        } catch (e) {
            return null;
        }
    }

    private static getPair(data: any) {
        if ( data instanceof Object ){
            const temp = [];
            for (const [key, value] of Object.entries(data) ){
                let val = value;
                if ( value instanceof Object ){
                    val = JSON.stringify(value);
                }

                temp.push(new Pair(key, val));
            }
            return temp;
        }else {
            return data;
        }
    }

    getType(el: Pair) {
        if ( el.value instanceof Array){
            if ( el.value.some(e => e instanceof Pair)){
                return Type.Object;
            }else {
                return Type.Array;
            }
        }
        return Type.Value;
    }
    
    ngOnInit() {
        this.addInitialValues();
    }

    changeHappened() {
        const json = this.generateJson(this.data);
        this.valueChange.emit(JSON.stringify(json));
    }

    private generateJson(raw: any) {
        const data = {};
        for (const entry of raw) {
            const parsed = JsonEditorComponent.tryParse(entry.value);

            if (isNumeric(entry.value)) {
                data[entry.key] = Number(entry.value);
            } else if (entry.value instanceof Array && entry.value.some(el => el instanceof Pair)) {
                data[entry.key] = this.generateJson(entry.value);
            } else if (parsed !== null) {
                data[entry.key] = parsed;
            } else {
                data[entry.key] = entry.value;
            }
        }
        return data;
    }

    removeColumn(i: String) {
        const splits = i.split('_');
        let temp = this.data;
        for (let j = 0; j < splits.length; j++) {
            if( j === splits.length - 1 ) {
                temp.splice(Number(splits[j]), 1);
            }else {
                temp = temp[Number(splits[j])].value as Pair[];
            }
        }
        this.changeHappened();
    }

    addMainColumn(type: Type) {
        this.executeAdd(this.data, type);
    }

    executeAdd(arr:Pair[], type: Type) {
        console.log(arr);
        if( type === 0 ){
            arr.push(new Pair('', ''));
        }else {
            arr.push(new Pair('', [new Pair('', '')]));
        }
    }

    addColumn($event: Info){
        const splits = $event.index.split('_');
        let temp = this.data;
        for (let j = 0; j < splits.length; j++) {
            if( j === splits.length - 1 ) {
                temp = temp[Number(splits[j])].value as Pair[];
                this.executeAdd(temp, $event.type);
            }else {
                temp = temp[Number(splits[j])].value as Pair[];
            }
        }
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
                const val = JsonEditorComponent.getPair(value);
                this.data.push(new Pair(key, val));
            }

        }catch (e) {
            console.log('could not translate');
        }

        if ( this.empty && this.data.length === 0 ){
            this.addMainColumn(0);
        }
    }

    changeOrder(index: string, dir: number) {
        const splits = index.split('_');
        let temp = this.data;
        for (let j = 0; j < splits.length; j++) {
            if( j === splits.length - 1 ) {
                this.changeColumnOrder(temp, Number(splits[j]), dir);
            }else {
                temp = temp[Number(splits[j])].value as Pair[];
            }
        }
    }

    changeColumnOrder(data: Pair[],index: number, direction: number) {
        if ( index + direction < 0 || index + direction >= data.length ){
            return;
        }
        const temp = data[index];
        data.splice(index, 1);
        data.splice(index + direction, 0, temp);
        this.changeHappened();
    }

    setMenuShow(b: boolean) {
        this.show = b;
    }
}


