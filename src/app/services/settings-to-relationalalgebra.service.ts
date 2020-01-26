import { Injectable, Output, EventEmitter } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class SettingsToRelationalalgebraService {

  constructor() { }

  @Output() change: EventEmitter<boolean> = new EventEmitter();

  toggle() {
    this.change.emit(true);
  }

}
;