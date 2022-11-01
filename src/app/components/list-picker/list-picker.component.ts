import { CdkDragDrop, moveItemInArray } from '@angular/cdk/drag-drop';
import { Component, EventEmitter, forwardRef, HostBinding, Input, Output, ViewEncapsulation } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

/**
 * ListPickerComponent is used to select multiple values from a list of options.
 */
@Component({
  selector: 'app-list-picker',
  templateUrl: './list-picker.component.html',
  styleUrls: ['./list-picker.component.scss'],
  encapsulation: ViewEncapsulation.None,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ListPickerComponent),
      multi: true,
    },
  ],
})
export class ListPickerComponent<T> implements ControlValueAccessor {
  
  @HostBinding("class")
  classes = ["app-list-picker"]

  /**
   * Title of the source options
   */
  @Input()
  sourceTitle = "Source";

  /**
   * Title of the target options
   */
  @Input()
  targetTitle = "Target";

  /**
   * An array of objects to display as the available options.
   */
  @Input()
  sourceOptions: Array<T>

  /**
   * Name of the label field of an option.
   */
  @Input()
  labelProperty: keyof T | null;

  /**
   * Number of maximum options that can be selected.
   */
  @Input()
  selectionLimit = Infinity;

  /**
   * Disable drag and drop sorting
   */
  @Input()
  disableSort = false;

  /**
   * Callback to invoke when selection limit is reached.
   */
  @Output()
  selectionLimitReached = new EventEmitter<void>();

  _value: Array<T> | null;

  _disabled: boolean;

  _onChange: (value: Array<T>) => void

  _onTouched: () => void

  writeValue(value: Array<T>): void {
   this._value = value
  }

  registerOnChange(fn: (value: Array<T>) => void): void {
    this._onChange = fn
  }

  registerOnTouched(fn:  () => void): void {
    this._onTouched = fn
  }

  setDisabledState?(isDisabled: boolean): void {
   this._disabled = isDisabled;
  }

  _getSourceOptions = () => {
    return this.sourceOptions?.filter(option => !this._value?.includes(option));
  }

  _onAddOption = (option: T) => {
    this._onTouched();
    if((this._value?.length ?? 0) < this.selectionLimit) {
      this._value = [...this._value ?? [], option];
      this._onChange(this._value);
    } else {
      this.selectionLimitReached.emit()
    }
  }

  _onRemoveOption = (option: T) => {
    this._value?.splice( this._value?.indexOf(option), 1);
    this._onChange(this._value);
    this._onTouched();
  }


  _onMoveOption = (event: CdkDragDrop<T, any>) => {
    moveItemInArray(this._value, event.previousIndex, event.currentIndex);
  }
}
