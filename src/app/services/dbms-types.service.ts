import {EventEmitter, Injectable} from '@angular/core';
import {CrudService} from './crud.service';
import {PolyType} from '../components/data-view/models/result-set.model';
import {ToasterService} from '../components/toast-exposer/toaster.service';
import {from} from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class DbmsTypesService {

  constructor(
      private _crud: CrudService,
      private _toast: ToasterService
  ) {
    this.fetchTypes();
    this.fetchFkActions();
  }

  private numericArray = ['int2', 'int4', 'int8', 'integer', 'bigint', 'smallint', 'float', 'float4', 'float8', 'double'];
  private booleanArray = ['bool', 'boolean'];
  private dateTimeArray = ['date', 'time', 'timestamp'];
  private multimediaArray = ['file', 'image', 'video', 'audio'];
  private types = new EventEmitter();
  private _types: PolyType[];
  private foreignKeyActions = new EventEmitter();
  private fetchedFkActions;

  private static removeNull(input: string) {
    return input.replace(' NOT NULL', '');
  }

  /**
   * Fetches all supported data types of the DBMS.
   */
  private fetchTypes() {
    this._crud.getTypeInfo().subscribe({
      next: (result: PolyType[]) => {
        if (!result) {
          this._toast.error('Could not retrieve DBMS types.');
          return;
        }
        result.sort((a: PolyType, b: PolyType) => {
          if (a.name.toLowerCase() < b.name.toLowerCase()) {
            return -1;
          }
          if (a.name.toLowerCase() > b.name.toLowerCase()) {
            return 1;
          }
          return 0;
        });
        this.types.next(result);
        this._types = result;
      }, error: err => {
        this._toast.error('Could not retrieve DBMS types.');
      }
    });

  }

  /**
   * Fetch available actions for foreign key constraints
   */
  private fetchFkActions() {
    this._crud.getFkActions().subscribe(
        res => {
          this.foreignKeyActions.next(res);
          this.fetchedFkActions = res;
        }, err => {
          this._toast.error('Could not retrieve DBMS foreign key actions.');
        }
    );
  }

  /**
   * @return EventEmitter with the available foreign key actions
   */
  getFkActions() {
    if (this.fetchedFkActions) {
      return from([this.fetchedFkActions]);
    } else {
      return this.foreignKeyActions;
    }
  }

  /**
   * @return EventEmitter with the available DBMS data types
   */
  getTypes() {
    this.fetchTypes(); //this was not even finished for the return
    return this.types;
  }

  /**
   * for ngIf and ngSwitchCase
   * usage: _types.numericTypes().includes( val )
   */
  numericTypes() {
    return this.numericArray;
  }

  /**
   * for ngIf and ngSwitchCase
   * usage: _types.booleanTypes().includes( val )
   */
  booleanTypes() {
    return this.booleanArray;
  }

  /**
   * for ngIf and ngSwitchCase
   * usage: _types.dateTimeTypes().includes( val )
   */
  dateTimeTypes() {
    return this.dateTimeArray;
  }

  multimediaTypes() {
    return this.multimediaArray;
  }

  /**
   * @param type dmbs type name
   * @return if the dbms type is numeric
   */
  isNumeric(type: string) {
    return this.numericArray.includes(DbmsTypesService.removeNull(type).toLowerCase());
  }

  /**
   * @param type dmbs type name
   * @return if the dbms type is of boolean type
   */
  isBoolean(type: string) {
    return this.booleanArray.includes(DbmsTypesService.removeNull(type).toLowerCase());
  }

  /**
   * @param type dmbs type name
   * @return if the dbms type is of date / time / timestamp type
   */
  isDateTime(type: string) {
    return this.dateTimeArray.includes(DbmsTypesService.removeNull(type).toLowerCase());
  }

  /**
   * @param type PolyType
   * @return Return true if the type is of the multimedia family
   */
  isMultimedia(type: string) {
    return this.multimediaArray.includes(DbmsTypesService.removeNull(type).toLowerCase());
  }

  /**
   * @param type dmbs type name
   * @return if the dbms type supports precision
   */
  supportsPrecision(type: string): boolean {
    return this.getTypeSignature(type) >= 3;
  }


  /**
   * @param type dmbs type name
   * @return if the dbms type supports scale
   */
  supportsScale(type: string): boolean {
    return this.getTypeSignature(type) >= 7;
  }


  /**
   * Check if the labels and placeholders for the precision value should be displayed as "length" or as "precision"
   */
  precisionPlaceholder(type: string): string {
    switch (DbmsTypesService.removeNull(type).toLowerCase()) {
      case 'varchar':
        return 'length';
      default:
        return 'precision';
    }
  }


  /**
   * Get the type signature from a string
   * 1 if NO_NO, 3 if YES_NO, 7 if YES_YES
   */
  private getTypeSignature(typeName: string): number {
    if (this._types == null || typeName == null) {
      return 0;
    }
    const type: PolyType = this._types.find((v: PolyType) => v.name === typeName);
    if (type == null) {
      return 0;
    } else {
      return type.signatures;
    }
  }

  isDocument(namespaceType: string) {
    return namespaceType.toLowerCase() === 'document';
  }

  isGraph(namespaceType: string) {
    return namespaceType.toLowerCase() === 'graph';
  }
}
