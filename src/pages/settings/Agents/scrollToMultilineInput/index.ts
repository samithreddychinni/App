import type {ScrollWithKeyboard} from '@hooks/useKeyboardDrivenScroll/types';

// This function is only needed on native platforms where keyboard-driven scroll keeps the multiline input and submit button visible above the keyboard.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function scrollToMultilineInput(scrollWithKeyboard: ScrollWithKeyboard, shouldScrollToMultilineInput: boolean, inputTopOffset: number) {}

export default scrollToMultilineInput;
