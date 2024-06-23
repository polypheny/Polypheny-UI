
import {CellStreamOutput,CellDisplayDataOutput,CellExecuteResultOutput,CellErrorOutput} from "./notebook.model"
import { SafeHtml} from '@angular/platform-browser';

export interface  Slides {
    source:string[] | string;
    fragments:{text: string[]| string, type:string,language?:string}[];
    children: Slides[];
    type:string;
    isTrusted:boolean;
    errorHtml: SafeHtml;
    streamHtml: SafeHtml;
    outputs?:(CellStreamOutput | CellDisplayDataOutput | CellExecuteResultOutput | CellErrorOutput)[];
    language?:string;
    showOutput?:boolean;
  }