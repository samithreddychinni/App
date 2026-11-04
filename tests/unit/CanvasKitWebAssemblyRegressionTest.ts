import isSkiaWebSupported from '@components/Charts/SkiaWebChart/isSkiaWebSupported';

describe('CanvasKitWebAssemblyRegressionTest (Issue #105709)', () => {
    let originalWebAssembly: PropertyDescriptor | undefined;
    let originalWebGL2: PropertyDescriptor | undefined;
    let originalDocument: PropertyDescriptor | undefined;

    beforeEach(() => {
        originalWebAssembly = Object.getOwnPropertyDescriptor(globalThis, 'WebAssembly');
        originalWebGL2 = Object.getOwnPropertyDescriptor(globalThis, 'WebGL2RenderingContext');
        originalDocument = Object.getOwnPropertyDescriptor(globalThis, 'document');

        // Emulate a standard WebGL2 environment
        Object.defineProperty(globalThis, 'WebGL2RenderingContext', {
            value: class {},
            configurable: true,
            writable: true,
        });

        // Mock canvas context
        const VALID_FORMAT = {rangeMin: 127, rangeMax: 127, precision: 23};
        const mockGl = {
            FRAGMENT_SHADER: 0x8b30,
            HIGH_FLOAT: 0x8df2,
            getShaderPrecisionFormat: () => VALID_FORMAT,
            getExtension: () => ({loseContext: () => {}}),
            isContextLost: () => false,
        };

        const mockCanvas = {
            getContext: (contextId: string) => (contextId === 'webgl2' ? mockGl : null),
        };

        Object.defineProperty(globalThis, 'document', {
            value: {
                createElement: (tag: string) => (tag === 'canvas' ? mockCanvas : {}),
            },
            configurable: true,
            writable: true,
        });
    });

    afterEach(() => {
        if (originalWebAssembly) {
            Object.defineProperty(globalThis, 'WebAssembly', originalWebAssembly);
        } else {
            Reflect.deleteProperty(globalThis, 'WebAssembly');
        }

        if (originalWebGL2) {
            Object.defineProperty(globalThis, 'WebGL2RenderingContext', originalWebGL2);
        } else {
            Reflect.deleteProperty(globalThis, 'WebGL2RenderingContext');
        }

        if (originalDocument) {
            Object.defineProperty(globalThis, 'document', originalDocument);
        } else {
            Reflect.deleteProperty(globalThis, 'document');
        }
    });

    it('returns false when WebAssembly is undefined (Edge enhanced security mode strict / APP-HWF)', () => {
        // Given WebAssembly is undefined in the environment
        Reflect.deleteProperty(globalThis, 'WebAssembly');

        // When probing Skia support
        const supported = isSkiaWebSupported();

        // Then Skia is reported as unsupported so WithSkiaWeb is never mounted
        expect(supported).toBe(false);
    });

    it('returns false when WebAssembly.instantiate is not a function', () => {
        // Given WebAssembly is present but instantiate is not a function
        Object.defineProperty(globalThis, 'WebAssembly', {
            value: {},
            configurable: true,
            writable: true,
        });

        // When probing Skia support
        const supported = isSkiaWebSupported();

        // Then Skia is reported as unsupported
        expect(supported).toBe(false);
    });

    it('returns true when WebAssembly and WebGL2 are both operational', () => {
        // Given WebAssembly is fully supported
        Object.defineProperty(globalThis, 'WebAssembly', {
            value: {
                instantiate: () => Promise.resolve({}),
            },
            configurable: true,
            writable: true,
        });

        // When probing Skia support
        const supported = isSkiaWebSupported();

        // Then Skia is supported
        expect(supported).toBe(true);
    });

    it('verifies Sentry ignoreErrors regex matches CanvasKit wasm fetch failure and missing WebAssembly', () => {
        const wasmFetchPattern = /both async and sync fetching of the wasm failed/;
        const wasmMissingPattern = /WebAssembly is not defined/;

        const abortMsg = 'RuntimeError: Aborted(both async and sync fetching of the wasm failed)';
        const refErrorMsg = 'ReferenceError: WebAssembly is not defined';

        expect(wasmFetchPattern.test(abortMsg)).toBe(true);
        expect(wasmMissingPattern.test(refErrorMsg)).toBe(true);
    });
});
