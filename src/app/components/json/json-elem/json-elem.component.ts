import {ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, OnInit, Output, SimpleChanges,} from '@angular/core';
import {Info, Pair, Type} from '../json-editor.component';

@Component({
  selector: 'app-json-elem',
  templateUrl: './json-elem.component.html',
  styleUrls: ['./json-elem.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})

export class JsonElemComponent implements OnInit, OnChanges {
  static debounceDelay = 200;

  @Input() el: Pair;
  @Input() index: number;
  @Input() length: number;
  @Input() indent: number;
  show = false;
  @Input() type: Type;
  keys = [];


  @Output() changed = new EventEmitter();
  @Output() remove = new EventEmitter();
  @Output() add = new EventEmitter();
  @Output() up = new EventEmitter();
  @Output() down = new EventEmitter();
  @Output() inputChange = new EventEmitter;
  private debounce: any;
  valid = false;
  @Output() validChanged = new EventEmitter;
  @Input() errorMessage: string;
  @Input() isDuplicate: boolean;
  dupKeyError = 'Only unique keys allowed.';
  childDupStatus = [];

  ngOnChanges(changes: SimpleChanges) {
    console.log(changes);
  }

  ngOnInit(): void {
    this.updateChildren();
    this.inputChanged();
  }

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

  upColumn(i: string) {
    this.show = false;
    this.up.emit(i);
  }

  downColumn(i: string) {
    this.show = false;
    this.down.emit(i);
  }


  changeHappened() {
    this.updateChildren();
    this.changed.emit();
  }

  setMenuShow(doShow: boolean, instant = false) {
    if (instant) {
      this.show = doShow;
      return;
    }
    if (!doShow) {
      this.debounce = setTimeout(() => {
        this.show = false;
      }, JsonElemComponent.debounceDelay);
    } else {
      this.show = true;
    }
  }

  menuEnter() {
    if (this.show) {
      clearTimeout(this.debounce);
    }
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
    this.show = false;
    this.add.emit(new Info(index, type));
  }

  getType(el: any) {
    if (el.value instanceof Array) {
      if (el.value.some(e => e instanceof Pair)) {
        return Type.Object;
      } else {
        return Type.Array;
      }
    }
    return Type.Value;
  }

  isSelfValid() {
    const temp = this.el.key.trim() !== '';
    if (temp) {
      this.errorMessage = '';
    }
    return temp;
  }

  inputChanged() {
    this.valid = this.isSelfValid();

    if (!this.isValue()) {
      const temp = this.el.value instanceof Array && new Set(this.el.value.map(e => e.key)).size === this.el.value.length;
      if (!temp) {
        this.errorMessage = this.dupKeyError;
      }
      this.valid &&= temp && this.el.value instanceof Array && this.el.value.reduce<boolean>((c, next) => c && next.isValid(), true);
    }
    this.validChanged.emit();
  }

  showValid() {
    if (!this.isSelfValid()) {
      return false;
    }
    if (!this.isValue()) {
      const temp = this.el.value instanceof Array && new Set(this.el.value.map(e => e.key)).size === this.el.value.length;
      if (!temp) {
        this.errorMessage = this.dupKeyError;
      }
      return temp;
    }
    return true;
  }

  updateChildren() {
    if (this.isValue()) {
      return;
    }
    const keys = (this.el.value as Pair[]).map(e => e.key);
    console.log(keys);
    const temp = [];
    const copy = keys;

    const status = [];

    let count = 0;
    for (const key of keys) {
      if (temp.includes(key)) {
        status.push(true);
      } else {
        copy.splice(count);
        temp.push(key);
        status.push(copy.includes(key));
      }
      console.log(copy);
      console.log(temp);
      console.log(status);
      count++;
    }

    this.childDupStatus = status;
    console.log(this.childDupStatus);

  }

  getIsDuplicate(i: number) {
    const keys = (this.el.value as Pair[]).map(k => k.key);
    const name = keys[i];
    keys.splice(i);
    return keys.includes(name);
  }

  protected readonly Pair = Pair;

  asPair(el: string): Pair {
    return el as unknown as Pair;
  }
}


