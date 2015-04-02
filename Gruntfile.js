'use strict';

module.exports = function (grunt) {
    require('grunt-commons')(grunt, {
        name: 'ko-grid-cell-navigation',
        main: 'cell-navigation',
        internalMain: 'cell-navigation',

        shims: {
            knockout: 'window.ko',
            'ko-grid': 'window.ko.bindingHandlers[\'grid\']'
        }
    }).initialize({
        less: true
    });
};
