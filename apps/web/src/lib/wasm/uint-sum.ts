type AddExports = {
  add(a: number, b: number): number;
};

// A tiny precompiled wasm module that exports `add(i32, i32) -> i32`.
const WASM_BYTES = new Uint8Array([
  0x00, 0x61, 0x73, 0x6d,
  0x01, 0x00, 0x00, 0x00,
  0x01, 0x07, 0x01, 0x60, 0x02, 0x7f, 0x7f, 0x01, 0x7f,
  0x03, 0x02, 0x01, 0x00,
  0x07, 0x07, 0x01, 0x03, 0x61, 0x64, 0x64, 0x00, 0x00,
  0x0a, 0x09, 0x01, 0x07, 0x00, 0x20, 0x00, 0x20, 0x01, 0x6a, 0x0b,
]);

let exportsPromise: Promise<AddExports> | null = null;

async function loadAddExports(): Promise<AddExports> {
  if (!exportsPromise) {
    exportsPromise = WebAssembly.instantiate(WASM_BYTES).then(
      (instance) => instance.instance.exports as unknown as AddExports,
    );
  }
  return exportsPromise;
}

export async function createUint8Summer() {
  const wasm = await loadAddExports();
  return (values: Uint8Array): number => {
    let total = 0;
    for (const value of values) {
      total = wasm.add(total, value);
    }
    return total;
  };
}
