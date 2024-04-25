import {Injectable} from '@angular/core';
import {CrudService} from '../../services/crud.service';

@Injectable({
    providedIn: 'root'
})
export class PolyAlgService {

    constructor(private _crud: CrudService) { }

}
