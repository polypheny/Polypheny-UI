
import {CellStreamOutput,CellDisplayDataOutput,CellExecuteResultOutput,CellErrorOutput} from "./notebook.model"
import { SafeHtml} from '@angular/platform-browser';
import {  SafeResourceUrl } from '@angular/platform-browser';

// interface for persentation slides
export interface  Slides {
    source:string[] | string;
    fragments:{text: string[]| string, type:string,language?:string, videoUrl?:{ url: SafeResourceUrl; width: number ; height: number}[],
    imageUrl?:{ url: SafeResourceUrl; width: number ; height: number}[]}[];
    children: Slides[];
    type:string;
    isTrusted:boolean;
    errorHtml: SafeHtml;
    streamHtml: SafeHtml;
    outputs?:(CellStreamOutput | CellDisplayDataOutput | CellExecuteResultOutput | CellErrorOutput)[];
    language?:string; // lang of the code
    showOutput?:boolean; 
    videoUrl?:{ url: SafeResourceUrl; width: number ; height: number}[];
    imageUrl?:{ url: SafeResourceUrl; width: number ; height: number}[];

  }