import {Pipe, PipeTransform} from '@angular/core';

@Pipe({ name: 'value' })
export class ValuePipe implements PipeTransform {
  transform(value: any): any {
    return Object.values( value );
  }
}

@Pipe({ name: 'searchFilter' })
export class SearchFilterPipe implements PipeTransform {
  transform(history: Map<string,any>, searchText: string): Map<string,any> {
    if (!searchText) {
      return history;
    }
    searchText = searchText.toLocaleLowerCase();
    let filteredHistory = new Map<string, any>();
    for(let key of Array.from(history.keys()).filter((query: string) => query.toLowerCase().indexOf(searchText) > -1))
      filteredHistory.set(key,history.get(key));
    return filteredHistory
  }
}
