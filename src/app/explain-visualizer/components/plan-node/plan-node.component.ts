import {Component, DoCheck, Input, OnInit, ViewEncapsulation} from '@angular/core';
import {IPlan} from '../../models/iplan';
import {EstimateDirection, HighlightType, ViewMode} from '../../models/enums';
import * as _ from 'lodash';
import {PlanService} from '../../services/plan.service';
import {SyntaxHighlightService} from '../../services/syntax-highlight.service';
import {HelpService} from '../../services/help.service';
import {ColorService} from '../../services/color.service';

@Component({
  selector: 'app-plan-node',
  templateUrl: './plan-node.component.html',
  styleUrls: ['./plan-node.component.scss'],
})
export class PlanNodeComponent implements OnInit, DoCheck {

  // consts
  NORMAL_WIDTH = 220;
  COMPACT_WIDTH = 140;
  DOT_WIDTH = 30;
  EXPANDED_WIDTH = 400;

  MIN_ESTIMATE_MISS = 100;
  COSTLY_TAG = 'costliest';
  MOST_CPU = 'most cpu';
  LARGE_TAG = 'largest';
  ESTIMATE_TAG = 'bad estimate';

  // inputs
  @Input() plan: IPlan;
  @Input() node: any;
  @Input() viewOptions: any;

  // UI flags
  showDetails: boolean;

  // calculated properties
  executionTimePercent: number;
  backgroundColor: string;
  highlightValue: number;
  barContainerWidth: number;
  barWidth: number;
  props: Array<any>;
  tags: Array<string>;
  plannerRowEstimateValue: number;
  plannerRowEstimateDirection: EstimateDirection;

  // required for custom change detection
  currentHighlightType: string;
  currentCompactView: boolean;
  currentExpandedView: boolean;

  // expose enum to view
  estimateDirections = EstimateDirection;
  highlightTypes = HighlightType;
  viewModes = ViewMode;

  showQuery = false; // todo check

  constructor(private _planService: PlanService,
              private _syntaxHighlightService: SyntaxHighlightService,
              private _helpService: HelpService,
              private _colorService: ColorService) { }

  ngOnInit() {
    this.currentHighlightType = this.viewOptions.highlightType;
    this.calculateBar();
    this.calculateProps();
    this.calculateDuration();
    this.calculateTags();

    this.plannerRowEstimateDirection = this.node[this._planService.PLANNER_ESIMATE_DIRECTION];
    this.plannerRowEstimateValue = _.round(this.node[this._planService.PLANNER_ESTIMATE_FACTOR], 1);
  }

  ngDoCheck() {
    if (this.currentHighlightType !== this.viewOptions.highlightType) {
      this.currentHighlightType = this.viewOptions.highlightType;
      this.calculateBar();
    }

    if (this.currentCompactView !== this.viewOptions.showCompactView) {
      this.currentCompactView = this.viewOptions.showCompactView;
      this.calculateBar();
    }

    if (this.currentExpandedView !== this.showDetails) {
      this.currentExpandedView = this.showDetails;
      this.calculateBar();
    }
  }

  getFormattedQuery() {
    const keyItems: Array<string> = [];

    // relation name will be highlighted for SCAN nodes
    const relationName: string = this.node[this._planService.RELATION_NAME_PROP];
    if (relationName) {
      keyItems.push(this.node[this._planService.SCHEMA_PROP] + '.' + relationName);
      keyItems.push(' ' + relationName);
      keyItems.push(' ' + this.node[this._planService.ALIAS_PROP] + ' ');
    }

    // group key will be highlighted for AGGREGATE nodes
    const groupKey: Array<string> = this.node[this._planService.GROUP_KEY_PROP];
    if (groupKey) {
      keyItems.push('GROUP BY ' + groupKey.join(','));
    }

    // hash condition will be highlighted for HASH JOIN nodes
    const hashCondition: string = this.node[this._planService.HASH_CONDITION_PROP];
    if (hashCondition) {
      keyItems.push(hashCondition.replace('(', '').replace(')', ''));
    }

    if (this.node[this._planService.NODE_TYPE_PROP].toUpperCase() === 'LIMIT') {
      keyItems.push('LIMIT');
    }
    return this._syntaxHighlightService.highlight(this.plan.query, keyItems);
  }

  calculateBar() {
    switch (this.viewOptions.viewMode) {
      case ViewMode.DOT:
        this.barContainerWidth = this.DOT_WIDTH;
        break;
      case ViewMode.COMPACT:
        this.barContainerWidth = this.COMPACT_WIDTH;
        break;
      default:
        this.barContainerWidth = this.NORMAL_WIDTH;
        break;
    }

    // expanded view width trumps others
    if (this.currentExpandedView) {
      this.barContainerWidth = this.EXPANDED_WIDTH;
    }


    switch (this.currentHighlightType) {
      case HighlightType.CPU:
        this.highlightValue = (this.node[this._planService.ACTUAL_CPU_PROP]);
        if ( this.plan.planStats.maxCpu === 0 ) {
          this.barWidth = 0;
        } else {
          // this.barWidth = Math.round((this.highlightValue / this.plan.planStats.maxDuration) * this.barContainerWidth);
          this.barWidth = Math.round((this.highlightValue / this.plan.planStats.maxCpu) * 100);
        }
        break;
      case HighlightType.ROWS:
        this.highlightValue = (this.node[this._planService.ACTUAL_ROWS_PROP]);
        if ( this.plan.planStats.maxRows === 0 ) {
          this.barWidth = 0;
        } else {
          // this.barWidth = Math.round((this.highlightValue / this.plan.planStats.maxRows) * this.barContainerWidth);
          this.barWidth = Math.round((this.highlightValue / this.plan.planStats.maxRows) * 100);
        }
        break;
      case HighlightType.COST:
        this.highlightValue = (this.node[this._planService.ACTUAL_COST_PROP]);
        if ( this.plan.planStats.maxCost === 0 ) {
          this.barWidth = 0;
        } else {
          // this.barWidth = Math.round((this.highlightValue / this.plan.planStats.maxCost) * this.barContainerWidth);
          this.barWidth = Math.round((this.highlightValue / this.plan.planStats.maxCost) * 100);
        }
        break;
    }

    if (this.barWidth < 0) {
      this.barWidth = 0;
    }

    this.backgroundColor = this._colorService.numberToColorHsl(1 - this.barWidth / this.barContainerWidth);
  }

  calculateDuration() {
    this.executionTimePercent = (_.round((this.node[this._planService.ACTUAL_DURATION_PROP] / this.plan.planStats.executionTime) * 100));
  }

  // create an array of node propeties so that they can be displayed in the view
  calculateProps() {
    this.props = _.chain(this.node)
        .omit(this._planService.PLANS_PROP)
        .map((value, key) => {
          return { key: key, value: value };
        })
        .value();
  }

  calculateTags() {
    this.tags = [];
    if (this.node[this._planService.MOST_CPU_NODE_PROP]) {
      this.tags.push(this.MOST_CPU);
    }
    if (this.node[this._planService.COSTLIEST_NODE_PROP]) {
      this.tags.push(this.COSTLY_TAG);
    }
    if (this.node[this._planService.LARGEST_NODE_PROP]) {
      this.tags.push(this.LARGE_TAG);
    }
    if (this.node[this._planService.PLANNER_ESTIMATE_FACTOR] >= this.MIN_ESTIMATE_MISS) {
      this.tags.push(this.ESTIMATE_TAG);
    }
  }

  getNodeTypeDescription() {
    return this._helpService.getNodeTypeDescription(this.node[this._planService.NODE_TYPE_PROP]);
  }

  getNodeName() {
    if (this.viewOptions.viewMode === ViewMode.DOT && !this.showDetails) {
      // return this.node[this._planService.NODE_TYPE_PROP].replace(/[^A-Z]/g, '').toUpperCase();
      return this.node[this._planService.NODE_TYPE_PROP].replace(/[^A-Z]/g, '');
    }

    // return (this.node[this._planService.NODE_TYPE_PROP]).toUpperCase();
    return (this.node[this._planService.NODE_TYPE_PROP]);
  }

  getTagName(tagName: String) {
    if (this.viewOptions.viewMode === ViewMode.DOT && !this.showDetails) {
      return tagName.charAt(0);
    }
    return tagName;
  }

  shouldShowPlannerEstimate() {
    if (this.viewOptions.showPlannerEstimate && this.showDetails) {
      return true;
    }

    if (this.viewOptions.viewMode === ViewMode.DOT) {
      return false;
    }

    return this.viewOptions.showPlannerEstimate;
  }

  shouldShowNodeBarLabel() {
    if (this.showDetails) {
      return true;
    }

    if (this.viewOptions.viewMode === ViewMode.DOT) {
      return false;
    }

    return true;
  }

}
