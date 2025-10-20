import {Pipe, PipeTransform} from '@angular/core';

@Pipe({
    name: 'value',
    standalone: false
})
export class ValuePipe implements PipeTransform {
    transform(value: any): any {
        return Object.values(value);
    }
}

@Pipe({
    name: 'searchFilter',
    standalone: false
})
export class SearchFilterPipe implements PipeTransform {
    transform(map: Map<string, any>, searchText: string): Map<string, any> {
        if (!searchText) {
            return map;
        }
        searchText = searchText.toLocaleLowerCase();
        let filteredMap = new Map<string, any>();
        for (let key of Array.from(map.keys()).filter((query: string) => query.toLowerCase().indexOf(searchText) > -1)) {
            filteredMap.set(key, map.get(key));
        }
        return filteredMap;
    }
}

@Pipe({
    name: 'mapPolyListValues', pure: true,
    standalone: false
})
export class MapValuesPipe implements PipeTransform {
    transform(list: any[]): string {
        return list?.map(i => i.value).join(', ') ?? '';
    }
}
