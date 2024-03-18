import {Component, EventEmitter, Input, OnInit, Output,} from '@angular/core';


@Component({
  selector: 'app-json-editor',
  templateUrl: './json-editor.component.html',
  styleUrls: ['./json-editor.component.scss']
})

export class JsonEditorComponent implements OnInit {
  @Output() valid: boolean;

  constructor() {
    this.data = [];
  }

  data: Pair[];
  @Input() empty: boolean;
  @Input() json: {};
  @Output() valueChange = new EventEmitter();
  @Output() validChange = new EventEmitter();
  show = false;
  private debounce: any;
  private debounceDelay = 200;
  showError: boolean;


  private static tryParse(value: string | number | {}) {
    try {
      return JSON.parse(value.toString().replace('\"', '"').replace('"', '\"'));
    } catch (e) {
      return null;
    }
  }

  private static getPair(data: any) {
    if (data instanceof Object) {
      const temp = [];
      for (const [key, value] of Object.entries(data)) {
        let val = value;
        if (value instanceof Object) {
          val = this.getPair(value);
        }

        temp.push(new Pair(key, val));
      }
      return temp;
    } else {
      return data;
    }
  }

  getType(el: Pair) {
    if (el.value instanceof Array) {
      if (el.value.some(e => e instanceof Pair)) {
        return Type.Object;
      } else {
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
    this.validChanged();
  }

  private generateJson(raw: any) {
    const data = {};
    for (const entry of raw) {
      const parsed = JsonEditorComponent.tryParse(entry.value);

      if (!isNaN(entry.value)) {
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
      if (j === splits.length - 1) {
        temp.splice(Number(splits[j]), 1);
      } else {
        temp = temp[Number(splits[j])].value as Pair[];
      }
    }
    this.changeHappened();
  }

  addMainColumn(type: Type) {
    this.executeAdd(this.data, type);
  }

  executeAdd(arr: Pair[], type: Type) {
    if (type === 0) {
      arr.push(new Pair('', ''));
    } else {
      arr.push(new Pair('', [new Pair('', '')]));
    }
  }

  addColumn($event: Info) {
    const splits = $event.index.split('_');
    let temp = this.data;
    for (let j = 0; j < splits.length; j++) {
      if (j === splits.length - 1) {
        temp = temp[Number(splits[j])].value as Pair[];
        this.executeAdd(temp, $event.type);
      } else {
        temp = temp[Number(splits[j])].value as Pair[];
      }
    }
    this.changeHappened();
  }

  normalize(value: string | number | {}) {
    if (value instanceof Object) {
      return JSON.stringify(value);
    } else {
      return value;
    }
  }

  addInitialValues() {
    try {
      const data = JSON.parse(this.json.toString().replace('"', '\"'));
      this.data = [];
      for (const [key, value] of Object.entries(data)) {
        const val = JsonEditorComponent.getPair(value);
        this.data.push(new Pair(key, val));
      }

    } catch (e) {
      console.log('could not translate');
    }

    if (this.empty && this.data.length === 0) {
      this.addMainColumn(0);
    }
  }

  changeOrder(index: string, dir: number) {
    const splits = index.split('_');
    let temp = this.data;
    for (let j = 0; j < splits.length; j++) {
      if (j === splits.length - 1) {
        this.changeColumnOrder(temp, Number(splits[j]), dir);
      } else {
        temp = temp[Number(splits[j])].value as Pair[];
      }
    }
  }

  changeColumnOrder(data: Pair[], index: number, direction: number) {
    if (index + direction < 0 || index + direction >= data.length) {
      return;
    }
    const temp = data[index];
    data.splice(index, 1);
    data.splice(index + direction, 0, temp);
    this.changeHappened();
  }

  setMenuShow(doShow: boolean, instant = false) {
    if (instant) {
      this.show = doShow;
      return;
    }
    if (!doShow) {
      this.debounce = setTimeout(() => {
        this.show = false;
      }, this.debounceDelay);
    } else {
      this.show = true;
    }
  }

  menuEnter() {
    if (this.show) {
      clearTimeout(this.debounce);
    }
  }

  isValid() {
    return this.data.reduce<boolean>((c, next) => c && next.isValid(), true);
  }

  validChanged() {
    const hasDuplicates = new Set(this.data.map(e => e.key)).size === this.data.length;
    this.valid = this.data.reduce<boolean>((c, next) => c && next.isValid(), true) && hasDuplicates;
    this.showError = !hasDuplicates;
    this.validChange.emit(this.valid);
  }

  getIsDuplicate(i: number) {
    const keys = this.data.map(k => k.key);
    const name = keys[i];
    keys.splice(i);
    return keys.includes(name);
  }

}

export class Pair {

  constructor(key: string, value: string | number | {} | Pair[]) {
    this.id = Pair.getAndIncrementId();
    this.key = key;
    this.value = value;
  }

  static idBuilder = 0;
  private id: number;
  key: string;
  value: string | number | {} | Pair[];

  static getAndIncrementId() {
    const id = Pair.idBuilder;
    Pair.idBuilder++;
    return id;
  }

  isValid() {
    let temp = this.key.trim() !== '';
    if (this.value instanceof Array && this.value[0] instanceof Pair) {
      temp &&= new Set(this.value.map(e => e.key)).size === this.value.length && this.value.map(p => p.isValid()).reduce((c, next) => c && next, true);
    }
    return temp;
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
  Value, Object, Array
}



