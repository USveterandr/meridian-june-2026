export class MockR2Object {
  constructor(
    public key: string,
    public value: Uint8Array,
    public contentType: string
  ) {}

  get body(): ReadableStream<Uint8Array> {
    const val = this.value;
    return new ReadableStream({
      start(controller) {
        controller.enqueue(val);
        controller.close();
      },
    });
  }

  get httpEtag(): string {
    return `"${this.key}"`;
  }

  writeHttpMetadata(headers: Headers) {
    if (this.contentType) {
      headers.set('Content-Type', this.contentType);
    }
  }
}

export class MockR2Bucket {
  private store = new Map<string, { value: Uint8Array; contentType: string }>();

  async put(key: string, body: any, options?: any): Promise<void> {
    let bytes: Uint8Array;
    
    if (body instanceof ReadableStream) {
      const reader = body.getReader();
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
      bytes = new Uint8Array(totalLen);
      let offset = 0;
      for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.length;
      }
    } else if (body instanceof ArrayBuffer) {
      bytes = new Uint8Array(body);
    } else if (body instanceof Uint8Array) {
      bytes = body;
    } else if (typeof body === 'string') {
      bytes = new TextEncoder().encode(body);
    } else if (body instanceof Blob) {
      bytes = new Uint8Array(await body.arrayBuffer());
    } else {
      bytes = new Uint8Array();
    }

    const contentType = options?.httpMetadata?.contentType || 'application/octet-stream';
    this.store.set(key, { value: bytes, contentType });
  }

  async get(key: string): Promise<MockR2Object | null> {
    const item = this.store.get(key);
    if (!item) return null;
    return new MockR2Object(key, item.value, item.contentType);
  }

  async delete(keys: string | string[]): Promise<void> {
    const keysArr = Array.isArray(keys) ? keys : [keys];
    for (const key of keysArr) {
      this.store.delete(key);
    }
  }
}
