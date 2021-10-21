import {Component, EventEmitter, Input, Output,} from '@angular/core';
import {Info, Pair, Type} from '../json-editor.component';

@Component({
    selector: 'app-json-elem',
    templateUrl: './json-elem.component.html',
    styleUrls: ['./json-elem.component.scss']
})

export class JsonElemComponent  {

    @Input() el: Pair;
    @Input() index: number;
    @Input() length: number;
    @Input() indent: number;
    show = false;
    @Input() type: Type;


    @Output() changed = new EventEmitter();
    @Output() remove = new EventEmitter();
    @Output() add = new EventEmitter();
    @Output() up = new EventEmitter();
    @Output() down = new EventEmitter();

    fakeArray(length: number): Array<any> {
        if (length >= 0) {
            return new Array(length);
        }
    }

    removeColumn(i: string) {
        this.show = false;
        this.remove.emit(i);
    }

    addColumn(i: Info) {
        this.show = false;
        this.add.emit(this.prefixInfo(i));
    }

    upColumn(i: string ){
        this.show = false;
        this.up.emit(i);
    }

    downColumn(i: string ){
        this.show = false;
        this.down.emit(i);
    }


    changeHappened() {
        this.changed.emit();
    }

    setMenuShow(doShow: boolean) {
        this.show = doShow;
    }

    isObject(value: string | number | {} | Pair[]) {
        return value instanceof Array;
    }

    asString(index: Number) {
        return String(index);
    }

    isValue() {
        return this.type === Type.Value;
    }

    prefixInfo(info: Info) {
        return new Info(this.index + '_' + info.index, info.type);
    }

    addInitialColumn(index: string, type: Type) {
        this.add.emit(new Info(index, type));
    }

    getType(el: any) {
        if ( el.value instanceof Array){
            if ( el.value.some(e => e instanceof Pair)){
                return Type.Object;
            }else {
                return Type.Array;
            }
        }
        return Type.Value;
    }
}


