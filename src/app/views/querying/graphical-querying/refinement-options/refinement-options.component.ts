import { Component, OnInit } from '@angular/core';
import {StatisticSet} from '../../../../components/data-table/models/result-set.model';
import {StatisticRequest} from '../../../../models/ui-request.model';
import {CrudService} from '../../../../services/crud.service';
import {ToastService} from '../../../../components/toast/toast.service';

@Component({
  selector: 'app-refinement-options',
  templateUrl: './refinement-options.component.html',
  styleUrls: ['./refinement-options.component.scss']
})
export class RefinementOptionsComponent implements OnInit {

  statisticSet: StatisticSet;
  hasOptions = true;
  optionsOpen = false;

  constructor(
      private _crud: CrudService,
      private _toast: ToastService
  ) {}

  ngOnInit() {
    this.getStatistic();

  }

  getStatistic () {
    console.log("getStatistics");
    this._crud.allStatistics( new StatisticRequest()).subscribe(
        res => {
          console.log("response received");
          console.log(res);
          const statistics = <StatisticSet>res;
          this.statisticSet = statistics[0];
        }, err => {
          this._toast.toast('server error', 'Unknown error on the server.', 10, 'bg-danger');
        }
    );
    let dummyResult = [{
        "header": [
            {
                "name": "id",
                "min": 1,
                "max": 10
            },
            {
                "name": "length",
                "min": 11,
                "max": 3333
            }
        ],
    }];
    this.processStatistics(dummyResult);
  }

  processStatistics(res: object[]){
      this.statisticSet = new StatisticSet("err");
      console.log(this.statisticSet);
      for (const table of res){
          for (let [index, header] of table["header"].entries()){
              if (header["min"] && header["max"]) {
                  let value = (header["max"]-header["min"])/2;
                  this.statisticSet.type.push("range");
                  this.statisticSet.data.push({
                      "name": header["name"],
                      "min": header["min"],
                      "max": header["max"],
                      "value": value
                  })
              }
          }
      }
      console.log(this.statisticSet)
  }

    /**
     * Toggle visability of additonal refinement options
     */
    toggleOptions () {
        this.optionsOpen = !this.optionsOpen;
    }
}
