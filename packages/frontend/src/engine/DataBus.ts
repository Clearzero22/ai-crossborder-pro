/** Data bus for passing data between workflow steps */

// 数据总线


export class DataBus {
  private outputs = new Map<string, Record<string, unknown>>();

  setOutput(nodeId: string, data: Record<string, unknown>): void {
    this.outputs.set(nodeId, data);
  }

  getOutput(nodeId: string): Record<string, unknown> | undefined {
    return this.outputs.get(nodeId);
  }

  /** Resolve {{nodeId.fieldName}} expressions in a template string */
  resolve(template: string): unknown {
    return template.replace(/\{\{([^.}]+)\.([^}]+)\}\}/g, (_match, nodeId, field) => {
      const output = this.outputs.get(nodeId);
      if (output && field in output) {
        return String(output[field]);
      }
      return _match;
    });
  }

  /** Resolve all outputs into a single flat record */
  getAllOutputs(): Record<string, Record<string, unknown>> {
    return Object.fromEntries(this.outputs);
  }

  clear(): void {
    this.outputs.clear();
  }
}
