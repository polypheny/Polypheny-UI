import {Injectable} from '@angular/core';
import {CombinedResult} from '../components/data-view/data-view.model';

@Injectable({
    providedIn: 'root'
})
export class EntityResultCacheService {

    private readonly cachedTableResults = new Map<number, CombinedResult>();
    private readonly visitedEntityIds = new Set<number>();

    get(entityId: number): CombinedResult | null {
        if (entityId == null) {
            return null;
        }
        return this.cachedTableResults.get(entityId) ?? null;
    }

    set(entityId: number, result: CombinedResult) {
        if (entityId == null || !result) {
            return;
        }
        this.cachedTableResults.set(entityId, result);
    }

    has(entityId: number): boolean {
        if (entityId == null) {
            return false;
        }
        return this.cachedTableResults.has(entityId);
    }

    markVisited(entityId: number) {
        if (entityId == null) {
            return;
        }
        this.visitedEntityIds.add(entityId);
    }

    hasVisited(entityId: number): boolean {
        if (entityId == null) {
            return false;
        }
        return this.visitedEntityIds.has(entityId);
    }
}
