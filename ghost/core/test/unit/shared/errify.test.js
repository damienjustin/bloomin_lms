"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const errify_1 = require("../../../core/shared/errify");
const assertError = (value, expectedMessage) => {
    (0, strict_1.default)(value instanceof Error);
    strict_1.default.equal(value.message, expectedMessage);
};
describe('errify', function () {
    it('returns the value unchanged if it is already an error', function () {
        const error = new Error('Test error');
        strict_1.default.equal((0, errify_1.errify)(error), error);
    });
    it('returns the value unchanged if it is an error subclass', function () {
        class CustomError extends Error {
        }
        const error = new CustomError('Test error');
        strict_1.default.equal((0, errify_1.errify)(error), error);
    });
    it('converts null to an error with no message', function () {
        assertError((0, errify_1.errify)(null), '');
    });
    it('converts undefined to an error with no message', function () {
        assertError((0, errify_1.errify)(undefined), '');
    });
    it('converts strings to errors with the string as the message', function () {
        assertError((0, errify_1.errify)('Test error'), 'Test error');
    });
    it('converts other primitive types to an error with their values stringified', function () {
        assertError((0, errify_1.errify)(false), 'false');
        assertError((0, errify_1.errify)(42), '42');
        assertError((0, errify_1.errify)(42n), '42');
        assertError((0, errify_1.errify)(Symbol('test')), 'Symbol(test)');
    });
    it('converts objects with messages to errors with the message property as the message', function () {
        assertError((0, errify_1.errify)({ message: 'Test error' }), 'Test error');
        assertError((0, errify_1.errify)({ message: 42 }), '42');
    });
    it('does not use nested message properties', function () {
        assertError((0, errify_1.errify)({ message: { message: 'Test error' } }), '[object Object]');
    });
    it('converts objects without messages to errors with the object stringified as the message', function () {
        assertError((0, errify_1.errify)({ foo: 'bar' }), '[object Object]');
        assertError((0, errify_1.errify)(Object.create(null)), '[object Object]');
        assertError((0, errify_1.errify)([1, 2, 3]), '1,2,3');
        assertError((0, errify_1.errify)({ [Symbol.toPrimitive]: () => 'test' }), 'test');
        assertError((0, errify_1.errify)({ toString: () => 'test' }), 'test');
    });
    it('handles failures to convert to string gracefully', function () {
        const explode = () => {
            strict_1.default.fail('Failed to convert');
        };
        assertError((0, errify_1.errify)({ [Symbol.toPrimitive]: explode }), '[object Object]');
        assertError((0, errify_1.errify)({ toString: explode }), '[object Object]');
    });
    it('handles strange objects with circular messages', function () {
        const obj = {};
        obj.message = obj;
        assertError((0, errify_1.errify)(obj), '[object Object]');
    });
});
