import {Injectable} from '@angular/core';
import {IPlan} from '../models/iplan';
import * as moment from 'moment';
import * as _ from 'lodash';
import {EstimateDirection} from '../models/enums';

@Injectable({
    providedIn: 'root'
})
export class PlanService {
    // Polpyheny properties
    EXPRESSIONS = 'exprs';
    AGGREGATIONS = 'aggs';
    FIELDS = 'fields';
    CONDITION = 'condition';
    TRANSFORMATION = 'transformation';
    TABLE = 'table';
    CPU_COST = 'cpu cost';
    ROW_COUNT = 'rowcount';
    MODEL = 'model';

    // plan property keys
    NODE_TYPE_PROP = 'relOp';
    ACTUAL_ROWS_PROP = 'rows cost';
    PLAN_ROWS_PROP = 'Plan Rows';
    ACTUAL_TOTAL_TIME_PROP = 'Actual Total Time';
    ACTUAL_LOOPS_PROP = 'Actual Loops';
    TOTAL_COST_PROP = 'io cost';
    PLANS_PROP = 'inputs';
    RELATION_NAME_PROP = 'Relation Name';
    SCHEMA_PROP = 'Schema';
    ALIAS_PROP = 'Alias';
    GROUP_KEY_PROP = 'group';
    SORT_KEY_PROP = 'Sort Key';
    JOIN_TYPE_PROP = 'joinType';
    INDEX_NAME_PROP = 'Index Name';
    HASH_CONDITION_PROP = 'Hash Cond';

    // computed by pev
    COMPUTED_TAGS_PROP = '*Tags';

    COSTLIEST_NODE_PROP = '*Costiest Node (by cost)';
    LARGEST_NODE_PROP = '*Largest Node (by rows)';
    SLOWEST_NODE_PROP = '*Slowest Node (by duration)';
    MOST_CPU_NODE_PROP = '*Most Cpu Prop';

    MAXIMUM_COSTS_PROP = '*Most Expensive Node (cost)';
    MAXIMUM_ROWS_PROP = '*Largest Node (rows)';
    MAXIMUM_DURATION_PROP = '*Slowest Node (time)';
    MAXIMUM_CPU_PROP = '*Most Cpu Node';
    ACTUAL_DURATION_PROP = '*Actual Duration';
    ACTUAL_COST_PROP = '*Actual Cost';
    ACTUAL_CPU_PROP = 'Actual Cpu';
    PLANNER_ESTIMATE_FACTOR = '*Planner Row Estimate Factor';
    PLANNER_ESIMATE_DIRECTION = '*Planner Row Estimate Direction';

    CTE_SCAN_PROP = 'CTE Scan';
    CTE_NAME_PROP = 'CTE Name';

    ARRAY_INDEX_KEY = 'arrayIndex';

    PEV_PLAN_TAG = 'plan_';

    private _maxRows = 0;
    private _maxCost = 0;
    private _maxDuration = 0;
    private _maxCpu = 0;

    getPlans(): Array<IPlan> {
        const plans: Array<IPlan> = [];

        for (const i in localStorage) {
            if (_.startsWith(i, this.PEV_PLAN_TAG)) {
                plans.push(JSON.parse(localStorage[i]));
            }
        }

        return _.chain(plans)
            .sortBy('createdOn')
            .reverse()
            .value();
    }

    getPlan(id: string): IPlan {
        return JSON.parse(localStorage.getItem(id));
    }

    createPlan(planName: string, planContent: any, planQuery): IPlan {
        const plan: IPlan = {
            id: this.PEV_PLAN_TAG + new Date().getTime().toString(),
            name: planName || 'plan created on ' + moment().format('LLL'),
            createdOn: new Date(),
            content: planContent,
            query: planQuery,
            planStats: planContent,
            formattedQuery: planQuery
        };
        this.analyzePlan(plan);
        return plan;
    }

    isJsonString(str) {
        try {
            JSON.parse(str);
        } catch (e) {
            return false;
        }
        return true;
    }

    analyzePlan(plan: IPlan) {
        this.processNode(plan.content.Plan);
        plan.content[this.MAXIMUM_ROWS_PROP] = this._maxRows;
        plan.content[this.MAXIMUM_COSTS_PROP] = this._maxCost;
        plan.content[this.MAXIMUM_DURATION_PROP] = this._maxDuration;
        plan.content[this.MAXIMUM_CPU_PROP] = this._maxCpu;

        this.findOutlierNodes(plan.content.Plan);

    }

    deletePlan(plan: IPlan) {
        localStorage.removeItem(plan.id);
    }

    deleteAllPlans() {
        localStorage.clear();
    }

    // recursively walk down the plan to compute various metrics
    processNode(node) {
        this.calculatePlannerEstimate(node);
        this.calculateActuals(node);

        _.each(node, (value, key) => {
            this.calculateMaximums(node, key, value);

            if (key === this.PLANS_PROP) {
                _.each(value, (val) => {
                    this.processNode(val);
                });
            }
        });
    }

    calculateMaximums(node, key, value) {
        if (key === this.ACTUAL_ROWS_PROP && this._maxRows < value) {
            this._maxRows = value;
        }
        if (key === this.ACTUAL_COST_PROP && this._maxCost < value) {
            this._maxCost = value;
        }
        if (key === this.ACTUAL_DURATION_PROP && this._maxDuration < value) {
            this._maxDuration = value;
        }
        if (key === this.ACTUAL_CPU_PROP && this._maxCpu < value) {
            this._maxCpu = value;
        }
    }

    findOutlierNodes(node) {
        node[this.SLOWEST_NODE_PROP] = false;
        node[this.LARGEST_NODE_PROP] = false;
        node[this.COSTLIEST_NODE_PROP] = false;

        if (node[this.ACTUAL_COST_PROP] === this._maxCost && this._maxCost > 0) {
            node[this.COSTLIEST_NODE_PROP] = true;
        }
        if (node[this.ACTUAL_ROWS_PROP] === this._maxRows && this._maxRows > 0) {
            node[this.LARGEST_NODE_PROP] = true;
        }
        if (node[this.ACTUAL_DURATION_PROP] === this._maxDuration && this._maxDuration > 0) {
            node[this.SLOWEST_NODE_PROP] = true;
        }
        if (node[this.ACTUAL_CPU_PROP] === this._maxCpu && this._maxCpu > 0) {
            node[this.MOST_CPU_NODE_PROP] = true;
        }

        _.each(node, (value, key) => {
            if (key === this.PLANS_PROP) {
                _.each(value, (val) => {
                    this.findOutlierNodes(val);
                });
            }
        });
    }

    // actual duration and actual cost are calculated by subtracting child values from the total
    calculateActuals(node) {
        node[this.ACTUAL_DURATION_PROP] = node[this.ACTUAL_TOTAL_TIME_PROP];
        node[this.ACTUAL_COST_PROP] = node[this.TOTAL_COST_PROP];
        node[this.ACTUAL_CPU_PROP] = node[this.CPU_COST];

        // console.log (node);
        _.each(node.Plans, subPlan => {
            // console.log('processing chldren', subPlan);
            // since CTE scan duration is already included in its subnodes, it should be be
            // subtracted from the duration of this node
            if (subPlan[this.NODE_TYPE_PROP] !== this.CTE_SCAN_PROP) {
                node[this.ACTUAL_DURATION_PROP] = node[this.ACTUAL_DURATION_PROP] - subPlan[this.ACTUAL_TOTAL_TIME_PROP];
                node[this.ACTUAL_COST_PROP] = node[this.ACTUAL_COST_PROP] - subPlan[this.TOTAL_COST_PROP];
            }
        });

        if (node[this.ACTUAL_COST_PROP] < 0) {
            node[this.ACTUAL_COST_PROP] = 0;
        }

        // since time is reported for an invidual loop, actual duration must be adjusted by number of loops
        // node[this.ACTUAL_DURATION_PROP] = node[this.ACTUAL_DURATION_PROP] * node[this.ACTUAL_LOOPS_PROP];
    }

    // figure out order of magnitude by which the planner mis-estimated how many rows would be
    // invloved in this node
    calculatePlannerEstimate(node) {
        node[this.PLANNER_ESTIMATE_FACTOR] = node[this.ROW_COUNT] / node[this.ACTUAL_ROWS_PROP];
        node[this.PLANNER_ESIMATE_DIRECTION] = EstimateDirection.under;
        if (node[this.ROW_COUNT] === node[this.ACTUAL_ROWS_PROP]) {
            node[this.PLANNER_ESIMATE_DIRECTION] = EstimateDirection.equal;
        }

        if (node[this.PLANNER_ESTIMATE_FACTOR] < 1) {
            node[this.PLANNER_ESIMATE_DIRECTION] = EstimateDirection.over;
            node[this.PLANNER_ESTIMATE_FACTOR] = node[this.ACTUAL_ROWS_PROP] / node[this.ROW_COUNT];
        }
    }
}
