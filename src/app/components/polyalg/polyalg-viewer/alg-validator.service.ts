import {Injectable} from '@angular/core';
import {CrudService} from '../../../services/crud.service';
import {tap} from 'rxjs/operators';
import {PlanNode} from '../models/polyalg-plan.model';
import {of} from 'rxjs';
import {PlanType} from '../../../models/information-page.model';


@Injectable({
    providedIn: 'root'
})
export class AlgValidatorService {
    private validPlans = new Map<string, string>();
    private readonly maxSize = 1000; // FIFO cache

    constructor(private _crud: CrudService) {
    }

    setValid(str: string, plan: PlanNode) {
        if (this.validPlans.size > this.maxSize) {
            const oldestKey = this.validPlans.keys().next().value;
            this.validPlans.delete(oldestKey);
        }
        this.validPlans.set(trimLines(str), JSON.stringify(plan));
    }

    removeValid(str: string) {
        this.validPlans.delete(trimLines(str));
    }

    /**
     * Might result in false positives if the schema has changed.
     * @param str the polyAlg to validate
     */
    isConfirmedValid(str: string) {
        return this.validPlans.has(trimLines(str));
    }

    /**
     * Sufficient, but not necessary condition for a polyAlg to be invalid.
     * @param str the polyAlg to check
     */
    isInvalid(str: string) {
        return !this.areParenthesesBalanced(str);
    }

    getCachedPlan(str: string): PlanNode {
        const serialized = this.validPlans.get(trimLines(str));
        return serialized ? JSON.parse(serialized) : undefined;
    }

    /**
     * Returns a plan for the given polyAlg string by either using the cached plan or
     * calling the backend.
     * If successful, the plan is added to the cache of valid plans.
     */
    buildPlan(str: string, planType: PlanType) {
        const cachedPlan = this.getCachedPlan(str);
        if (cachedPlan) {
            return of(cachedPlan);
        }
        if (str.trim().length === 0) {
            return of(null);
        }
        return this._crud.buildTreeFromPolyAlg(str, planType).pipe(
            tap({
                next: (plan) => this.setValid(str, plan),
                error: () => this.removeValid(str)
            })
        );
    }

    areParenthesesBalanced(str: string) {
        const stack: string[] = [];

        let inSingleQuotes = false;
        let inDoubleQuotes = false;

        for (let i = 0; i < str.length; i++) {
            const char = str[i];
            if (char === '\\') {
                i++;
                continue; // Skip the next character if it's escaped
            }

            if (char === '\'' && !inDoubleQuotes) {
                inSingleQuotes = !inSingleQuotes;
            } else if (char === '"' && !inSingleQuotes) {
                inDoubleQuotes = !inDoubleQuotes;
            } else if (!inSingleQuotes && !inDoubleQuotes) {
                if (char === '(' || char === '[') {
                    stack.push(char);
                } else if (char === ')') {
                    const lastOpen = stack.pop();
                    if (!lastOpen || lastOpen !== '(') {
                        return false;
                    }
                } else if (char === ']') {
                    const lastOpen = stack.pop();
                    if (!lastOpen || lastOpen !== '[') {
                        return false;
                    }
                }
            }
        }

        return stack.length === 0;
    }

}

/**
 * Splits the string into lines, trims each line, and then joins them back together.
 * Useful for reducing the number of unnecessary recomputations of the plan.
 * @param str
 */
export function trimLines(str: string): string {
    // Split the string into lines, trim each line, and then join them back together
    return str.split('\n').map(line => line.trim()).join('\n');
}
