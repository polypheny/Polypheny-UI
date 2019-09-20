import {KeyValue} from '@angular/common';

export class SqlHistory {
    query: string;
    time: Date;

    constructor ( query: string, time = null ) {
        this.query = query;
        if( time === null) {
            this.time = new Date();
        } else {
            this.time = new Date( time );
        }
    }

    static fromJson ( json: string, map: Map<string, SqlHistory> ): void {
        if( json === null ) return;
        const obj = JSON.parse( json );

        for ( const key in obj ) {
            if( obj.hasOwnProperty(key) ){
                map.set( obj[key].query, new SqlHistory( obj[key].query, obj[key].time) );
            }
        }
    }

    displayTime (){
        //padstart: from: https://stackoverflow.com/questions/8935414/getminutes-0-9-how-to-display-two-digit-numbers
        return String( this.time.getHours() ).padStart( 2, '0' ) + ':' +
        String( this.time.getMinutes() ).padStart( 2, '0' ) + ':' +
        String( this.time.getSeconds() ).padStart( 2, '0' );
    }

}
