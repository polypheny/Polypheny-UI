import {Injectable, signal} from '@angular/core';
import {CrudService} from '../../services/crud.service';
import {Declaration, OperatorModel, OperatorTag, Parameter, PolyAlgRegistry} from './models/polyalg-registry';

@Injectable({
    providedIn: 'root'
})
export class PolyAlgService {

    registryLoaded = signal(false);

    private registry: PolyAlgRegistry;
    private declarations: Map<string, Declaration> = new Map();
    private sortedDeclarations: Declaration[] = [];
    private parameters: Map<Declaration, Map<string, Parameter>> = new Map();

    constructor(private _crud: CrudService) {
        _crud.getPolyAlgRegistry().subscribe({
            next: res => {
                this.registry = res;
                this.buildLookups();
                this.registryLoaded.set(true);
            },
            error: err => {
                console.log(err);
            }
        });
    }

    private buildLookups() {
        for (const opName in this.registry.declarations) {
            if (this.registry.declarations.hasOwnProperty(opName)) {
                const decl: Declaration = this.registry.declarations[opName];
                this.declarations.set(opName, decl);
                decl.aliases.forEach(a => this.declarations.set(a, decl));
                this.sortedDeclarations.push(decl);

                const params: Map<string, Parameter> = new Map();
                for (const p of decl.posParams.concat(decl.kwParams)) {
                    params.set(p.name, p);
                    p.aliases.forEach(a => params.set(a, p));
                }
                this.parameters.set(decl, params);
            }
        }
        this.sortedDeclarations.sort((a, b) => a.name.localeCompare(b.name));

    }

    getEnumValues(enumType: string) {
        return this.registry?.enums[enumType] || [];
    }

    getDeclaration(opName: string) {
        return this.declarations.get(opName);
    }

    getSortedDeclarations(model: OperatorModel = null): Declaration[] {
        if (model === null) {
            return this.sortedDeclarations;
        }
        return this.sortedDeclarations.filter(d => d.model === model);
    }

    getParameter(opNameOrDecl: string | Declaration, pName: string): any {
        const decl: Declaration = (typeof opNameOrDecl === 'string') ? this.getDeclaration(opNameOrDecl) : opNameOrDecl;
        return this.parameters.get(decl)?.get(pName);
    }

    isSimpleOperator(opName: string) {
        return !this.declarations.get(opName).tags.includes(OperatorTag.ADVANCED);
    }
}
