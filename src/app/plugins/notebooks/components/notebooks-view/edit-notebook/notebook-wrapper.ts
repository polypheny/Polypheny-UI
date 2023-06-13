import {KernelSpec, NotebookContent} from '../../../models/notebooks-response.model';
import {
    CellDisplayDataOutput,
    CellErrorOutput,
    CellExecuteResultOutput,
    CellStreamOutput,
    Notebook,
    NotebookCell
} from '../../../models/notebook.model';
import * as uuid from 'uuid';
import {NotebooksWebSocket} from '../../../services/notebooks-webSocket';
import {
    KernelDisplayData,
    KernelErrorMsg,
    KernelExecuteInput,
    KernelExecuteReply,
    KernelExecuteResult,
    KernelInterruptReply,
    KernelMsg,
    KernelShutdownReply,
    KernelStatus,
    KernelStream,
    KernelUpdateDisplayData
} from '../../../models/kernel-response.model';

export class NotebookWrapper {
    private nb: Notebook;
    private codeOrigin: Map<string, string> = new Map<string, string>();
    kernelStatus: 'unknown' | 'idle' | 'busy' | 'starting' = 'unknown';
    lastModifiedWhenLoaded: string;

    constructor(private content: NotebookContent,
                private busyCellIds: Set<string>,
                private socket: NotebooksWebSocket,
                private onExecuteMdCell:  (id: string) => void,
                private onReceivedErrorOutput: (id: string, output: CellErrorOutput) => void) {
        this.nb = content.content;
        this.lastModifiedWhenLoaded = content.last_modified;
        this.nb.cells.map(cell => {
            if (!cell.id) {
                console.log('setting id for', cell.source);
                cell.id = uuid.v4();
            }
        });
        this.busyCellIds.clear();
        this.socket.onMessage().subscribe(msg => this.handleKernelMsg(msg),
            err => {
                console.log('received error: ' + err);
            }, () => {
                this.socket = null;
            });
        this.socket.requestExecutionState();
    }

    cell(i: number) {
        return this.nb.cells[i];
    }

    insertCellByIdx(i: number, below: boolean = true): NotebookCell {
        const newCell = this.getEmptyCell();
        this.nb.cells.splice(i + +below, 0, newCell);
        return newCell;
    }

    insertCell(id: string, below: boolean = true): NotebookCell {
        const i = this.getCellIndex(id);
        if (i !== -1) {
            const newCell = this.getEmptyCell();
            this.nb.cells.splice(i + +below, 0, newCell);
            return newCell;
        }
        return null;
    }

    deleteCell(id: string) {
        const i = this.getCellIndex(id);
        if (i !== -1) {
            this.nb.cells.splice(i, 1);
        }
    }

    /**
     * Returns the index of the cell with the given id.
     * -1 if no cell was found.
     */
    getCellIndex(id: string) {
        return this.nb.cells.findIndex(cell => cell.id === id);
    }

    getCell(id: string) {
        return this.nb.cells.find(cell => cell.id === id);
    }

    cellAbove(id: string) {
        const idx = this.getCellIndex(id);
        return idx < 1 ? null : this.cells[idx - 1];
    }

    cellBelow(id: string) {
        const idx = this.getCellIndex(id);
        return idx === this.cells.length - 1 ? null : this.cells[idx + 1];
    }

    executeAll() {
        for (const cell of this.nb.cells) {
            this.executeCell(cell);
        }
    }

    executeCells(reference: NotebookCell, above: boolean, refAndBelow: boolean) {
        const idx = this.nb.cells.indexOf(reference);
        if (idx < 0) {
            return;
        }
        if (above) {
            for (const cell of this.nb.cells.slice(0, idx)) {
                this.executeCell(cell);
            }
        }
        if (refAndBelow) {
            for (const cell of this.nb.cells.slice(idx)) {
                this.executeCell(cell);
            }
        }
    }

    executeCell(cell: NotebookCell | string) {
        if (typeof cell === 'string') {
            cell = this.getCell(cell);
        }
        if (!cell) {
            return;
        }
        switch (cell.cell_type) {
            case 'code':
                cell.outputs = [];
                const id = this.socket.sendCode(cell.source);
                this.codeOrigin.set(id, cell.id);
                this.busyCellIds.add(cell.id);
                break;
            case 'markdown':
                console.log('executing md');
                this.onExecuteMdCell(cell.id);
                break;
            default:
        }
    }

    executeMdCells() {
        for (const cell of this.nb.cells) {
            if (cell.cell_type === 'markdown') {
                console.log('executing', cell);
                this.executeCell(cell);
            }
        }
    }

    setKernelSpec(kernel: KernelSpec) {
        this.nb.metadata.kernelspec = {
            display_name: kernel.spec.display_name,
            language: kernel.spec.language,
            name: kernel.name
        };
    }

    changeCellType(cell: NotebookCell, type: CellType) {
        const oldType = this.getCellType(cell);
        if (oldType === type) {
            return;
        }
        switch (oldType) {
            case 'code':
                delete cell.outputs;
                delete cell.execution_count;
                break;
            case 'markdown':
                break;
            case 'raw':
                break;
            case 'poly':
                break;
        }
        switch (type) {
            case 'code':
                cell.outputs = [];
                cell.execution_count = null;
                cell.metadata = {};
                break;
            case 'markdown':
                cell.metadata = {};
                break;
            case 'raw':
                cell.metadata = {};
                break;
            case 'poly':
                break;
            default:
                return;
        }
        this.setCellType(cell, type);
    }

    clearAllOutputs() {
        for (const cell of this.cells) {
            if (cell.cell_type === 'code') {
                cell.outputs = [];
            }
        }
    }

    private handleKernelMsg(msg: KernelMsg) {
        console.log('received message:', msg);
        const cellId = this.codeOrigin.get(msg?.parent_header?.msg_id);
        if (!cellId && msg.msg_type !== 'status') {
            return; // we ignore messages from other users in the same session, except for status updates
        }
        if (msg.msg_type === 'status') {
            this.handleStatusMsg(<KernelStatus>msg);
            return;
        }
        const cell = this.getCell(cellId);
        if (!cell) {
            return;
        }

        switch (msg.msg_type) {
            case 'execute_input':
                this.handleInputMsg(<KernelExecuteInput>msg, cell);
                break;
            case 'execute_reply':
                this.handleReplyMsg(<KernelExecuteReply>msg, cell);
                break;
            case 'stream':
                this.handleStreamMsg(<KernelStream>msg, cell);
                break;
            case 'execute_result':
                this.handleResultMsg(<KernelExecuteResult>msg, cell);
                break;
            case 'error':
                this.handleErrorMsg(<KernelErrorMsg>msg, cell);
                break;
            case 'interrupt_reply':
                this.handleInterruptMsg(<KernelInterruptReply>msg, cell);
                break;
            case 'shutdown_reply':
                this.handleShutdownMsg(<KernelShutdownReply>msg, cell);
                break;
            case 'display_data':
                this.handleDisplayMsg(<KernelDisplayData>msg, cell);
                break;
            case 'update_display_data':
                this.handleUpdateDisplayMsg(<KernelUpdateDisplayData>msg, cell);
                break;
            default:
                console.error('received unknown message type:', msg.msg_type);
        }
    }

    private handleStatusMsg(msg: KernelStatus) {
        this.kernelStatus = msg.content.execution_state;

    }

    private handleInputMsg(msg: KernelExecuteInput, cell: NotebookCell) {
        this.busyCellIds.add(cell.id);
        cell.execution_count = msg.content.execution_count;
    }

    private handleReplyMsg(msg: KernelExecuteReply, cell: NotebookCell) {
        this.busyCellIds.delete(cell.id);
        if (msg.content.status === 'ok') {
            cell.execution_count = msg.content.execution_count;
        }
    }

    private handleStreamMsg(msg: KernelStream, cell: NotebookCell) {
        let lastOutput = cell.outputs[cell.outputs.length - 1];
        if (lastOutput && lastOutput.output_type === 'stream') {
            lastOutput = <CellStreamOutput>lastOutput;
            if (lastOutput.name === msg.content.name) {
                this.addTextToOutputStream(lastOutput, msg.content.text);
                return;
            }

        }
        const output: CellStreamOutput = {
            output_type: 'stream',
            name: msg.content.name,
            text: [msg.content.text]
        };
        cell.outputs.push(output);

    }

    private handleResultMsg(msg: KernelExecuteResult, cell: NotebookCell) {
        const output = msg.content as CellExecuteResultOutput;
        output.output_type = msg.msg_type;
        cell.outputs.push(output);
    }

    private handleErrorMsg(msg: KernelErrorMsg, cell: NotebookCell) {
        const output = msg.content as CellErrorOutput;
        output.output_type = msg.msg_type;
        cell.outputs.push(output);
        this.busyCellIds.delete(cell.id);
        this.onReceivedErrorOutput(cell.id, output);
    }

    private handleInterruptMsg(msg: KernelInterruptReply, cell: NotebookCell) {
        this.busyCellIds.clear();

    }

    private handleShutdownMsg(msg: KernelShutdownReply, cell: NotebookCell) {
        this.busyCellIds.clear();

    }

    private handleDisplayMsg(msg: KernelDisplayData, cell: NotebookCell) {
        const output = msg.content as CellDisplayDataOutput;
        output.output_type = msg.msg_type;
        cell.outputs.push(output);
    }

    private handleUpdateDisplayMsg(msg: KernelUpdateDisplayData, cell: NotebookCell) {
        this.handleDisplayMsg(msg, cell); // not correctly handled
    }

    private getCellType(cell: NotebookCell): CellType {
        // TODO: handle 'poly'
        return cell.cell_type;
    }

    private setCellType(cell: NotebookCell, type: CellType) {
        if (type === 'poly') {
            // TODO: handle 'poly'
            return;
        }
        cell.cell_type = type;
    }

    private addTextToOutputStream(lastOutput: CellStreamOutput, newText: string) {
        let text = lastOutput.text;
        if (Array.isArray(text)) {
            text = text.join('');
        } else if (!text) {
            text = '';
        }
        text += newText;
        lastOutput.text = text;
    }

    private getEmptyCell(): NotebookCell {
        return {
            cell_type: 'code',
            id: uuid.v4(),
            metadata: {},
            source: [],
            execution_count: null,
            outputs: []
        };
    }

    get cells() {
        return this.nb.cells;
    }

    get notebook() {
        return this.nb;
    }


}

export type CellType = 'code' | 'markdown' | 'raw' | 'poly';
