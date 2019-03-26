import {AfterContentInit, AfterViewInit, Component, OnInit, ViewEncapsulation} from '@angular/core';
import * as $ from 'jquery';
import 'jquery-ui/ui/widget';
import 'jquery-ui/ui/widgets/sortable';
// import 'jquery-ui/ui/widgets/draggable';
import {ActivatedRoute} from '@angular/router';


@Component({
  selector: 'app-graphical-querying',
  templateUrl: './graphical-querying.component.html',
  styleUrls: ['./graphical-querying.component.scss'],
  encapsulation: ViewEncapsulation.None // new elements in sortable should have margin as well
})
export class GraphicalQueryingComponent implements OnInit, AfterViewInit {

  tables = [];
  generatedSQL;
  dbId;

  constructor(private _route: ActivatedRoute) { }

  ngOnInit() {
    const self = this;

    this.dbId = +this._route.snapshot.paramMap.get('id');

    this.generateSQL();

    $('#selectBox').sortable({
      // placeholder: 'sortablePlaceholder',
      receive: function (e, ui) {
        const name = ui.item[0].innerHTML;
        $(ui.helper).replaceWith('<div class="btn btn-primary dbCol">' + name + ' <span class="del">&times;</span></div>');
      },
      // todo triggers only after clicking out of the div
      stop: function (e, ui) {
        self.generateSQL();
      }
    });

    $('#selectBox').on('click', 'div span.del', function() {
      $(this).parent().remove();
    });

    $('#fromBox').sortable({
      axis: 'x',
      stop: function (e, ui) {
        self.generateSQL();
      }
    });

    $('#sqlInput').keyup(function () {
      self.generateSQL();
    });

  }

  ngAfterViewInit() { }

  generateSQL() {
    let sql = 'SELECT ';
    const cols = [];
    $('#selectBox .dbCol').each(function () {
      // https://stackoverflow.com/questions/3442394/using-text-to-retrieve-only-text-not-nested-in-child-tags
      cols.push($(this).clone().children().remove().end().text());
    });
    sql = sql + cols.join(', ');
    sql = sql + ' FROM ';
    const from = [];
    $('#fromBox .dbTable').each(function () {
      from.push($(this).text());
    });
    sql = sql + from.join(',');
    sql = sql + ' ' + $('#sqlInput').val();
    this.generatedSQL = sql;
  }

  onTreeDrop($event){
    const treeElement = $event.element.data;
    $('#selectBox').append('<div class="btn btn-primary dbCol">' + treeElement.name + ' <span class="del">&times;</span></div>');
    $('#selectBox').sortable('refresh');
  }

}
