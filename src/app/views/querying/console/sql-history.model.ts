import * as moment from 'moment';


export class SqlHistory {
    query: string;
    time: Date;
    lang: string;

    constructor ( query: string, time = null, lang = 'sql' ) {
        this.query = query;
        this.lang = lang;
        if( time === null) {
            this.time = new Date();
        } else {
            this.time = new Date( time );
        }
    }

    static fromJson ( json: string, map: Map<string, SqlHistory> ): void {
        if( json === null ) {
            return;
        }
        const obj = JSON.parse( json );

        for ( const key in obj ) {
            if( obj.hasOwnProperty(key) ){
                map.set( obj[key].query, new SqlHistory( obj[key].query, obj[key].time, obj[key].lang) );
            }
        }
    }

    displayTime (){
        //padstart: from: https://stackoverflow.com/questions/8935414/getminutes-0-9-how-to-display-two-digit-numbers
        return String( this.time.getHours() ).padStart( 2, '0' ) + ':' +
        String( this.time.getMinutes() ).padStart( 2, '0' ) + ':' +
        String( this.time.getSeconds() ).padStart( 2, '0' );
    }

    displayDate () {
      return String( this.time.getDate()).padStart( 2, '0' ) + '.' +
      String( this.time.getMonth()).padStart( 2, '0' ) + '.' +
      String( this.time.getFullYear());
    }

    fromNow(){
      //see https://stackoverflow.com/questions/35441820/moment-js-tomorrow-today-and-yesterday
      const self = this;
      return moment( this.time ).calendar( null, {
        lastMonth: 'in mmmm',
        lastWeek: '[on] ddd',
        lastDay:  '[yesterday]',
        sameDay:  '[today]',
        //in all other cases
        sameElse: function () {
          return self.displayDate();
        }
      });
    }

}
