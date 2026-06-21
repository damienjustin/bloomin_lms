"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const fake_wait_hours_multiplier_1 = require("../../../../../core/server/services/automations/fake-wait-hours-multiplier");
describe('parseFakeWaitHoursMultiplier', function () {
    it('returns a positive safe integer from a number or string', function () {
        strict_1.default.equal((0, fake_wait_hours_multiplier_1.parseFakeWaitHoursMultiplier)(2500), 2500);
        strict_1.default.equal((0, fake_wait_hours_multiplier_1.parseFakeWaitHoursMultiplier)('2500'), 2500);
    });
    it('returns null for missing or invalid values', function () {
        strict_1.default.equal((0, fake_wait_hours_multiplier_1.parseFakeWaitHoursMultiplier)(undefined), null);
        strict_1.default.equal((0, fake_wait_hours_multiplier_1.parseFakeWaitHoursMultiplier)(null), null);
        strict_1.default.equal((0, fake_wait_hours_multiplier_1.parseFakeWaitHoursMultiplier)(0), null);
        strict_1.default.equal((0, fake_wait_hours_multiplier_1.parseFakeWaitHoursMultiplier)(-1), null);
        strict_1.default.equal((0, fake_wait_hours_multiplier_1.parseFakeWaitHoursMultiplier)(1.5), null);
        strict_1.default.equal((0, fake_wait_hours_multiplier_1.parseFakeWaitHoursMultiplier)(Number.MAX_SAFE_INTEGER + 1), null);
        strict_1.default.equal((0, fake_wait_hours_multiplier_1.parseFakeWaitHoursMultiplier)('not-a-number'), null);
        strict_1.default.equal((0, fake_wait_hours_multiplier_1.parseFakeWaitHoursMultiplier)(true), null);
    });
});
