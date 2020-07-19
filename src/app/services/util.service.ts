import {Injectable} from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class UtilService {

  textareaHeight( val: string ){
    val = val || '';
    return Math.min( val.split('\n').length, 5 );
  }

  //see https://stackoverflow.com/questions/10420352/converting-file-size-in-bytes-to-human-readable-string/10420404
  humanFileSize( size: number ): string {
    if( size !== 0 && !size ){
      return;
    }
    const i = size == 0 ? 0 : Math.floor( Math.log(size) / Math.log(1000) );
    return +( size / Math.pow(1000, i) ).toFixed(2) + ' ' + ['B', 'kB', 'MB', 'GB', 'TB'][i];
  }

  limitedString ( str: string, maxLength = 120, postfix = '...' ) {
    if( str === undefined || str === null ) return;
    if( str.length <= maxLength ) return str;
    return str.slice( 0, maxLength) + postfix;
  }
}
