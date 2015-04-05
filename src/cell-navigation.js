'use strict';

define(['module', 'knockout', 'ko-grid'], function (module, ko, koGrid) {
    var extensionId = module.id.indexOf('/') < 0 ? module.id : module.id.substring(0, module.id.indexOf('/'));

    var KEY_CODE_ARROW_UP = 38,
        KEY_CODE_ARROW_LEFT = 37,
        KEY_CODE_ARROW_RIGHT = 39,
        KEY_CODE_ARROW_DOWN = 40,
        KEY_CODE_TAB = 9,
        KEY_CODE_ENTER = 13;

    var KEY_CODES = [KEY_CODE_ARROW_UP, KEY_CODE_ARROW_LEFT, KEY_CODE_ARROW_RIGHT, KEY_CODE_ARROW_DOWN, KEY_CODE_TAB, KEY_CODE_ENTER];

    koGrid.defineExtension(extensionId, {
        initializer: template => {
            template.before('table').insert('<textarea class="ko-grid-focus-parking" tabIndex="-1" style="position: absolute; z-index: 10; overflow: hidden; box-sizing: border-box; width: 1em; height: 1em; top: -3em; left: -3em; resize: none; border: none;"></textarea>');
        },
        Constructor: function CellNavigationExtension(bindingValue, config, grid) {
            var onCellFocusedHandlers = [];

            this.onCellFocused = handler => onCellFocusedHandlers.push(handler);
            this['onCellFocused'] = this.onCellFocused;

            var scroller = null, focusParking = null,
                selectedRow = null, selectedColumn = null,
                hijacked = null;

            grid.postApplyBindings(() => {
                scroller = grid.element.querySelector('.ko-grid-table-scroller');
                focusParking = grid.element.querySelector('.ko-grid-focus-parking');
            });

            grid.data.onCellClick((e, cellValue, row, column) => focus(row, column));

            grid.onKeyDown(e => {
                if (e.defaultPrevented || KEY_CODES.indexOf(e.keyCode) < 0)
                    return;

                e.preventDefault();
                var multiplier = e.shiftKey ? -1 : 1;

                switch (e.keyCode) {
                    case KEY_CODE_ARROW_UP:
                        return move(-1, 0);
                    case KEY_CODE_ARROW_LEFT:
                        return move(0, -1);
                    case KEY_CODE_ARROW_RIGHT:
                        return move(0, 1);
                    case KEY_CODE_ARROW_DOWN:
                        return move(1, 0);
                    case KEY_CODE_TAB:
                        return move(0, multiplier, true);
                    case KEY_CODE_ENTER:
                        return move(multiplier, 0);
                }
            });

            /**
             * @param {number} rowWise
             * @param {number} columnWise
             * @param {boolean=} wrap
             */
            function move(rowWise, columnWise, wrap) {
                wrap = !!wrap;

                var rows = grid.data.rows.displayed();
                var cols = grid.columns.displayed();
                var rowIndex = rows.tryFirstIndexOf(selectedRow);
                var colIndex = cols.indexOf(selectedColumn);

                var newRowIndex = rowIndex + rowWise;
                var newColIndex = colIndex + columnWise;

                if (wrap && newColIndex < 0) {
                    newRowIndex -= 1;
                    newColIndex = cols.length - 1;
                } else if (wrap && newColIndex >= cols.length) {
                    newRowIndex += 1;
                    newColIndex = 0;
                }

                newColIndex = Math.max(0, Math.min(cols.length - 1, newColIndex));
                newRowIndex = Math.max(0, Math.min(rows.length - 1, newRowIndex));

                focus(rows.get(newRowIndex), cols[newColIndex]);
            }

            function focus(row, column) {
                if (row === selectedRow && column === selectedColumn)
                    return;
                if (hijacked)
                    hijacked.release();

                var cell = grid.data.lookupCell(row, column);

                focusParking.focus();
                focusParking.value = column.renderValue(ko.unwrap(row[column.property]));
                focusParking.setSelectionRange(0, focusParking.value.length);

                hijacked = cell.hijack(b => {
                    return onCellFocusedHandlers.reduce((a, h) => h(row, column, a) || a, {
                        init: function (element, row, column) {
                            selectedRow = row;
                            selectedColumn = column;
                            b.init.apply(this, arguments);
                            element.classList.add('focused');
                        },
                        update: function (element) {
                            b.update.apply(this, arguments);
                            element.classList.add('focused');
                        }
                    });
                });

                scrollIntoView(cell.element);
            }

            // TODO scroll containing view port if necessary
            function scrollIntoView(element) {
                var scrollerBounds = scroller.getBoundingClientRect();
                var elementBounds = element.getBoundingClientRect();

                var extra = 7;

                var scrollX = Math.min(0, elementBounds.left - scrollerBounds.left - extra)
                    || Math.max(0, elementBounds.right - scrollerBounds.right + extra + (scroller.offsetWidth - scroller.clientWidth));
                var scrollY = Math.min(0, elementBounds.top - scrollerBounds.top - extra)
                    || Math.max(0, elementBounds.bottom - scrollerBounds.bottom + extra);

                scroller.scrollLeft += scrollX;
                scroller.scrollTop += scrollY;
            }
        }
    });

    return koGrid.declareExtensionAlias('cellNavigation', extensionId);
});
