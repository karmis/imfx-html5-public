import {
    Directive,
    ElementRef,
    HostListener,
    Input,
    OnChanges,
    SimpleChanges,
} from '@angular/core';

/**
https://github.com/changhuixu/ngx-digit-only/tree/master/projects/uiowa/digit-only
 */

@Directive({
    selector: '[digitOnly]',
})
export class DigitOnlyDirective implements OnChanges {
    private hasDecimalPoint = false;
    private navigationKeys = [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'Home',
        'End',
        'ArrowLeft',
        'ArrowRight',
        'Clear',
        'Copy',
        'Paste',
    ];

    @Input() decimal = false;
    @Input() decimalSeparator = '.';
    @Input() min = -Infinity;
    @Input() max = Infinity;
    @Input() pattern?: string | RegExp;
    private regex: RegExp;
    inputElement: HTMLInputElement;

    constructor(public el: ElementRef) {
        this.inputElement = el.nativeElement;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.pattern) {
            this.regex = this.pattern ? RegExp(this.pattern) : null;
        }

        if (changes.min) {
            const maybeMin = Number(this.min);
            if (this.min === null || this.min === undefined || (this.min as any) === '' || isNaN(maybeMin)) {
                this.min = -Infinity;
            } else {
                this.min = maybeMin;
            }
        }

        if (changes.max) {
            const maybeMax = Number(this.max);
            if (this.max === null || this.max === undefined || (this.max as any) === '' || isNaN(maybeMax)) {
                this.max = Infinity;
            } else {
                this.max = maybeMax;
            }
        }
    }

    @HostListener('keydown', ['$event'])
    onKeyDown(e: KeyboardEvent): any {
        if (
            this.navigationKeys.indexOf(e.key) > -1 || // Allow: navigation keys: backspace, delete, arrows etc.
            ((e.key === 'a' || e.code === 'KeyA') && e.ctrlKey === true) || // Allow: Ctrl+A
            ((e.key === 'c' || e.code === 'KeyC') && e.ctrlKey === true) || // Allow: Ctrl+C
            ((e.key === 'v' || e.code === 'KeyV') && e.ctrlKey === true) || // Allow: Ctrl+V
            ((e.key === 'x' || e.code === 'KeyX') && e.ctrlKey === true) || // Allow: Ctrl+X
            ((e.key === 'a' || e.code === 'KeyA') && e.metaKey === true) || // Allow: Cmd+A (Mac)
            ((e.key === 'c' || e.code === 'KeyC') && e.metaKey === true) || // Allow: Cmd+C (Mac)
            ((e.key === 'v' || e.code === 'KeyV') && e.metaKey === true) || // Allow: Cmd+V (Mac)
            ((e.key === 'x' || e.code === 'KeyX') && e.metaKey === true) // Allow: Cmd+X (Mac)
        ) {
            // let it happen, don't do anything
            return;
        }

        let newValue = '';

        if (this.decimal && e.key === this.decimalSeparator) {
            newValue = this.forecastValue(e.key);
            if (newValue.split(this.decimalSeparator).length > 2) {
                // has two or more decimal points
                e.preventDefault();
                return;
            } else {
                this.hasDecimalPoint = newValue.indexOf(this.decimalSeparator) > -1;
                return; // Allow: only one decimal point
            }
        }

        // Ensure that it is a number and stop the keypress
        if (e.key === ' ' || isNaN(Number(e.key))) {
            e.preventDefault();
            return;
        }

        newValue = newValue || this.forecastValue(e.key);
        // check the input pattern RegExp
        if (this.regex) {
            if (!this.regex.test(newValue)) {
                e.preventDefault();
                return;
            }
        }

        const newNumber = Number(newValue);
        this.checkOutOfRangeValid();
    }

    checkOutOfRangeValid() {
        let num = Number(this.inputElement.value);
        let result = !(num > this.max || num < this.min);
        let message = result ? '' : 'out of range';

        // if (this.inputElement.validity instanceof ValidityState) {
        if (this.inputElement.validity) {
            this.inputElement.setCustomValidity(message);
        }
        // console.log('valid',this.inputElement.validity.valid);
    }

    @HostListener('paste', ['$event'])
    onPaste(event: any): void {
        let pastedInput: string;
        if (window['clipboardData']) {
            // Browser is IE
            pastedInput = window['clipboardData'].getData('text');
        } else if (event.clipboardData && event.clipboardData.getData) {
            // Other browsers
            pastedInput = event.clipboardData.getData('text/plain');
        }

        this.pasteData(pastedInput);
        event.preventDefault();
    }

    @HostListener('drop', ['$event'])
    onDrop(event: DragEvent): void {
        const textData = event.dataTransfer.getData('text');
        this.inputElement.focus();
        this.pasteData(textData);
        event.preventDefault();
    }

    private pasteData(pastedContent: string): void {
        const sanitizedContent = this.sanitizeInput(pastedContent);
        const pasted = document.execCommand('insertText', false, sanitizedContent);
        if (!pasted) {
            if (this.inputElement.setRangeText) {
                const { selectionStart: start, selectionEnd: end } = this.inputElement;
                this.inputElement.setRangeText(sanitizedContent, start, end, 'end');
                // Angular's Reactive Form relies on "input" event, but on Firefox, the setRangeText method doesn't trigger it
                // so we have to trigger it ourself.
                if (typeof window['InstallTrigger'] !== 'undefined') {
                    this.inputElement.dispatchEvent(new Event('input', { cancelable: true }));
                }
            } else {
                // Browser does not support setRangeText, e.g. IE
                this.insertAtCursor(this.inputElement, sanitizedContent);
            }
        }
        if (this.decimal) {
            this.hasDecimalPoint =
                this.inputElement.value.indexOf(this.decimalSeparator) > -1;
        }
        this.checkOutOfRangeValid();
    }

    // The following 2 methods were added from the below article for browsers that do not support setRangeText
    // https://stackoverflow.com/questions/11076975/how-to-insert-text-into-the-textarea-at-the-current-cursor-position
    private insertAtCursor(myField: HTMLInputElement, myValue: string): void {
        const startPos = myField.selectionStart;
        const endPos = myField.selectionEnd;

        myField.value =
            myField.value.substring(0, startPos) +
            myValue +
            myField.value.substring(endPos, myField.value.length);

        const pos = startPos + myValue.length;
        myField.focus();
        myField.setSelectionRange(pos, pos);

        this.triggerEvent(myField, 'input');
    }

    private triggerEvent(el: HTMLInputElement, type: string): void {
        if ('createEvent' in document) {
            // modern browsers, IE9+
            const e = document.createEvent('HTMLEvents');
            e.initEvent(type, false, true);
            el.dispatchEvent(e);
        }
    }
    // end stack overflow code

    private sanitizeInput(input: string): string {
        let result = '';
        if (this.decimal && this.isValidDecimal(input)) {
            const regex = new RegExp(`[^0-9${this.decimalSeparator}]`, 'g');
            result = input.replace(regex, '');
        } else {
            result = input.replace(/[^0-9]/g, '');
        }

        const maxLength = this.inputElement.maxLength;
        if (maxLength > 0) {
            // the input element has maxLength limit
            const allowedLength = maxLength - this.inputElement.value.length;
            result = allowedLength > 0 ? result.substring(0, allowedLength) : '';
        }
        return result;
    }

    private isValidDecimal(string: string): boolean {
        if (!this.hasDecimalPoint) {
            return string.split(this.decimalSeparator).length <= 2;
        } else {
            // the input element already has a decimal separator
            const selectedText = this.getSelection();
            if (selectedText && selectedText.indexOf(this.decimalSeparator) > -1) {
                return string.split(this.decimalSeparator).length <= 2;
            } else {
                return string.indexOf(this.decimalSeparator) < 0;
            }
        }
    }

    private getSelection(): string {
        return this.inputElement.value.substring(
            this.inputElement.selectionStart,
            this.inputElement.selectionEnd
        );
    }

    private forecastValue(key: string): string {
        const selectionStart = this.inputElement.selectionStart;
        const selectionEnd = this.inputElement.selectionEnd;
        const oldValue = this.inputElement.value;
        const selection = oldValue.substring(selectionStart, selectionEnd);
        return selection
            ? oldValue.replace(selection, key)
            : oldValue.substring(0, selectionStart) +
            key +
            oldValue.substring(selectionStart);
    }
}
