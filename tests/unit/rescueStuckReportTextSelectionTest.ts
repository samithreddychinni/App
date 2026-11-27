import CONST from '@src/CONST';

const installRescueStuckReportTextSelection = jest.requireActual<{default: () => () => void}>('@libs/rescueStuckReportTextSelection/index.ts').default;

describe('rescueStuckReportTextSelection', () => {
    let cleanup: (() => void) | undefined;
    let container: HTMLDivElement;
    let listElement: HTMLDivElement;
    let textNode: Text;

    beforeEach(() => {
        container = document.createElement('div');
        listElement = document.createElement('div');
        listElement.setAttribute('data-testid', CONST.TEST_ID.REPORT_ACTIONS_LIST);

        textNode = document.createTextNode('Hello world message');
        listElement.appendChild(textNode);
        container.appendChild(listElement);
        document.body.appendChild(container);

        cleanup = installRescueStuckReportTextSelection();
    });

    afterEach(() => {
        if (cleanup) {
            cleanup();
            cleanup = undefined;
        }
        document.body.innerHTML = '';
        delete (document as Record<string, unknown>).caretPositionFromPoint;
    });

    it('does not throw IndexSizeError when caretPositionFromPoint returns an Element with offset greater than child count', () => {
        const emptyDiv = document.createElement('div');
        listElement.appendChild(emptyDiv);

        // Simulate Chrome returning an Element node with child offset 13 (as seen in Sentry APP-PNP)
        (document as Record<string, unknown>).caretPositionFromPoint = jest.fn(() => ({
            offsetNode: emptyDiv,
            offset: 13,
        }));

        const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 100,
            clientY: 100,
        });
        listElement.dispatchEvent(mouseDownEvent);

        const mouseMoveEvent = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            buttons: 1,
            clientX: 120,
            clientY: 120,
        });

        expect(() => {
            document.dispatchEvent(mouseMoveEvent);
        }).not.toThrow();
    });

    it('safely clamps out-of-bounds offset when caretPositionFromPoint returns a Text node with offset exceeding length', () => {
        // Text node length is 19 ('Hello world message')
        (document as Record<string, unknown>).caretPositionFromPoint = jest.fn(() => ({
            offsetNode: textNode,
            offset: 100,
        }));

        const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 50,
            clientY: 50,
        });
        listElement.dispatchEvent(mouseDownEvent);

        const mouseMoveEvent = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            buttons: 1,
            clientX: 60,
            clientY: 60,
        });

        expect(() => {
            document.dispatchEvent(mouseMoveEvent);
        }).not.toThrow();
    });

    it('safely handles caretPositionFromPoint throwing an unexpected exception', () => {
        (document as Record<string, unknown>).caretPositionFromPoint = jest.fn(() => {
            throw new Error('Simulated DOMException');
        });

        const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 50,
            clientY: 50,
        });
        listElement.dispatchEvent(mouseDownEvent);

        const mouseMoveEvent = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            buttons: 1,
            clientX: 60,
            clientY: 60,
        });

        expect(() => {
            document.dispatchEvent(mouseMoveEvent);
        }).not.toThrow();
    });

    it('successfully handles valid text points within report text', () => {
        (document as Record<string, unknown>).caretPositionFromPoint = jest.fn(() => ({
            offsetNode: textNode,
            offset: 5,
        }));

        const mouseDownEvent = new MouseEvent('mousedown', {
            bubbles: true,
            cancelable: true,
            button: 0,
            clientX: 50,
            clientY: 50,
        });
        listElement.dispatchEvent(mouseDownEvent);

        const mouseMoveEvent = new MouseEvent('mousemove', {
            bubbles: true,
            cancelable: true,
            buttons: 1,
            clientX: 60,
            clientY: 60,
        });

        expect(() => {
            document.dispatchEvent(mouseMoveEvent);
        }).not.toThrow();
    });
});
