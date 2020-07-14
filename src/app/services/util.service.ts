import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilService {

  textareaHeight( val: string ){
    val = val || '';
    return Math.min( val.split('\n').length, 5 );
  }

}
