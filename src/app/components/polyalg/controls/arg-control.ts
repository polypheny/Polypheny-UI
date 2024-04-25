import {ClassicPreset} from 'rete';
import {Type} from '@angular/core';

export abstract class ArgControl extends ClassicPreset.Control {
    protected constructor(public name: string, public readonly: boolean) {
        super();
    }

    abstract getHeight(): number;

    abstract getArgComponent(): Type<any>;
}
