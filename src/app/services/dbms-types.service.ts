import {EventEmitter, Injectable} from '@angular/core';
import {CrudService} from './crud.service';
import {PolyType} from '../components/data-table/models/result-set.model';
import {ToastService} from '../components/toast/toast.service';

@Injectable({
  providedIn: 'root'
})
export class DbmsTypesService {

  private numericArray = ['int2','int4','int8','integer','bigint','smallint','float','float4','float8','double'];
  private booleanArray = ['bool', 'boolean'];
  private dateTimeArray = ['date', 'time', 'timestamp'];
  private types = new EventEmitter();
  private _types: PolyType[];
  private foreignKeyActions = new EventEmitter();

  constructor(
    private _crud: CrudService,
    private _toast: ToastService
  ) {
    this.fetchTypes();
    this.fetchFkActions();
  }

  /**
   * Fetches all supported data types of the DBMS.
   */
  private fetchTypes() {
    this._crud.getTypeInfo().subscribe(
      res=> {
        const result = <PolyType[]> res;
        if( result == undefined ){
          this._toast.error('Could not retrieve DBMS types.');
          return;
        }
        result.sort((a: PolyType, b:PolyType) => {
          if( a.name.toLowerCase() < b.name.toLowerCase() ){
            return -1;
          }
          if( a.name.toLowerCase() > b.name.toLowerCase() ){
            return 1;
          }
          return 0;
        });
        this.types.next( result );
        this._types = result;
      }, err => {
        this._toast.error('Could not retrieve DBMS types.');
      }
    );

  }

  /**
   * Fetch available actions for foreign key constraints
   */
  private fetchFkActions(){
    this._crud.getFkActions().subscribe(
      res => {
        this.foreignKeyActions.next( res );
      }, err => {
        this._toast.error('Could not retrieve DBMS foreign key actions.');
    }
    );
  }

  /**
   * @return EventEmitter with the available foreign key actions
   */
  getFkActions(){
    return this.foreignKeyActions;
  }

  /**
   * @return EventEmitter with the available DBMS data types
   */
  getTypes() {
    this.fetchTypes();
    return this.types;
  }

  /**
   * for ngIf and ngSwitchCase
   * usage: _types.numericTypes().includes( val )
   */
  numericTypes () {
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

  /**
   * @param type dmbs type name
   * @return if the dbms type is numeric
   */
  isNumeric(type: string) {
    return this.numericArray.includes(type.toLowerCase());
  }

  /**
   * @param type dmbs type name
   * @return if the dbms type is of boolean type
   */
  isBoolean(type: string) {
    return this.booleanArray.includes(type.toLowerCase());
  }

  /**
   * @param type dmbs type name
   * @return if the dbms type is of date / time / timestamp type
   */
  isDateTime(type: string) {
    return this.dateTimeArray.includes(type.toLowerCase());
  }

  /**
   * @param type dmbs type name
   * @return if the dbms type supports precision
   */
  supportsPrecision(type:string):boolean {
    return this.getTypeSignature( type ) >= 3;
  }


  /**
   * @param type dmbs type name
   * @return if the dbms type supports scale
   */
  supportsScale(type:string):boolean {
    return this.getTypeSignature( type ) >= 7;
  }



  /**
   * Get the type signature from a string
   * 1 if NO_NO, 3 if YES_NO, 7 if YES_YES
   */
  private getTypeSignature( typeName: string ):number {
    if(this._types == null || typeName == null ) {
      return 0;
    }
    const type: PolyType = this._types.find((v:PolyType) => v.name === typeName);
    if( type == null ) {
      return 0;
    } else {
      return type.signatures;
    }
  }

}
