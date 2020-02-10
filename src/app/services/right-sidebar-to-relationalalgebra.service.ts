import { Injectable, Output, EventEmitter } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class RightSidebarToRelationalalgebraService {

  constructor() { }

  @Output() change: EventEmitter<boolean> = new EventEmitter();

  toggle() {
    this.change.emit(true);
  }

}
