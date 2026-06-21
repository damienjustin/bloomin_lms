"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const sinon_1 = __importDefault(require("sinon"));
const poll_1 = require("../../../../../core/server/services/automations/poll");
const constants_1 = require("../../../../../core/server/services/member-welcome-emails/constants");
// @ts-expect-error Models currently lack type definitions.
const models_1 = require("../../../../../core/server/models");
const MAX_STEPS_PER_BATCH = 100;
const RETRY_DELAY_MS = 10 * 60 * 1000;
const fake = () => (sinon_1.default.stub());
function buildMember(attrs = {}) {
    const values = {
        email: 'member@example.com',
        name: 'Test Member',
        status: 'free',
        uuid: '00000000-0000-4000-8000-000000000001',
        enable_updates_and_announcements: true,
        newsletters: [{}],
        ...attrs
    };
    return {
        get(key) {
            return values[key];
        },
        related(key) {
            return {
                models: values[key]
            };
        }
    };
}
function buildStep(attrs = {}) {
    return {
        id: `step-${Math.random()}`,
        locked_by: 'lock-id',
        automation_run_id: 'run-id',
        automation_id: 'automation-id',
        automation_slug: constants_1.MEMBER_WELCOME_EMAIL_SLUGS.free,
        automation_status: 'active',
        member_id: 'member-id',
        member_email: 'member@example.com',
        action_id: 'action-id',
        automation_action_revision_id: 'revision-id',
        ready_at: new Date(),
        step_attempts: 1,
        ...attrs
    };
}
function buildWaitStep(attrs = {}) {
    return {
        ...buildStep(attrs),
        type: 'wait',
        wait_hours: 24,
        ...attrs
    };
}
function buildEmailStep(attrs = {}) {
    return {
        ...buildStep(attrs),
        type: 'send_email',
        email_subject: 'Welcome!',
        email_lexical: JSON.stringify({ root: { children: [], direction: null, format: '', indent: 0, type: 'root', version: 1 } }),
        email_design_setting_id: null,
        ...attrs
    };
}
describe('automations poll', function () {
    let automationsApi;
    let automatedEmailRecipientAdd;
    let memberWelcomeEmailService;
    let options;
    beforeEach(function () {
        sinon_1.default.useFakeTimers({ now: new Date('2026-01-01T12:00:00.000Z'), shouldAdvanceTime: true });
        automationsApi = {
            fetchAndLockSteps: fake().resolves({ steps: [], nextStepReadyAt: null }),
            finishStepAndEnqueueNext: fake().resolves(null),
            markStepTerminal: fake().resolves(true),
            retryStep: fake().resolves(true)
        };
        memberWelcomeEmailService = {
            init: fake(),
            api: {
                loadMemberWelcomeEmails: sinon_1.default.stub().resolves(),
                sendAutomationEmail: fake().resolves()
            }
        };
        options = {
            automationsApi,
            enqueueAnotherPollAt: fake(),
            memberWelcomeEmailService
        };
        sinon_1.default.stub(models_1.Member, 'findOne').resolves(buildMember());
        automatedEmailRecipientAdd = sinon_1.default.stub(models_1.AutomatedEmailRecipient, 'add').resolves();
    });
    afterEach(function () {
        sinon_1.default.restore();
    });
    it('does nothing when no steps are ready', async function () {
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.calledOnceWithExactly(automationsApi.fetchAndLockSteps, MAX_STEPS_PER_BATCH);
        sinon_1.default.assert.notCalled(options.enqueueAnotherPollAt);
        sinon_1.default.assert.notCalled(memberWelcomeEmailService.init);
    });
    it('does not run when no steps are ready, but does enqueue a future poll if one will be ready in the future', async function () {
        const nextStepReadyAt = new Date(Date.now() + 60 * 1000);
        automationsApi.fetchAndLockSteps.resolves({ steps: [], nextStepReadyAt });
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, nextStepReadyAt);
        sinon_1.default.assert.notCalled(memberWelcomeEmailService.init);
    });
    it('keeps processing other steps if one step execution fails', async function () {
        const step1 = buildWaitStep({ id: 'step-1' });
        const step2 = buildWaitStep({ id: 'step-2' });
        const pollStart = Date.now();
        automationsApi.fetchAndLockSteps.resolves({ steps: [step1, step2], nextStepReadyAt: null });
        automationsApi.finishStepAndEnqueueNext.withArgs(step1).rejects(new Error('finish failed'));
        automationsApi.finishStepAndEnqueueNext.withArgs(step2).resolves();
        await (0, poll_1.poll)(options);
        const retryAt = automationsApi.retryStep.firstCall.args[1];
        strict_1.default.ok(Math.abs(retryAt.getTime() - (pollStart + RETRY_DELAY_MS)) < 2000);
        sinon_1.default.assert.calledWith(automationsApi.finishStepAndEnqueueNext, step1);
        sinon_1.default.assert.calledWith(automationsApi.finishStepAndEnqueueNext, step2);
        sinon_1.default.assert.calledOnceWithExactly(automationsApi.retryStep, step1, retryAt);
        sinon_1.default.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, retryAt);
    });
    it('enqueues another immediate poll when the batch is full', async function () {
        const beforePoll = new Date();
        automationsApi.fetchAndLockSteps.resolves({
            steps: Array.from({ length: MAX_STEPS_PER_BATCH }, () => buildWaitStep()),
            nextStepReadyAt: null
        });
        await (0, poll_1.poll)(options);
        const afterPoll = new Date();
        sinon_1.default.assert.calledWith(options.enqueueAnotherPollAt, sinon_1.default.match(date => (date instanceof Date &&
            date >= beforePoll &&
            date <= afterPoll)));
    });
    it('marks the step failed without sending when max attempts are exceeded', async function () {
        const nextStepReadyAt = new Date(Date.now() + 60 * 1000);
        const step = buildEmailStep({ step_attempts: 11 });
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt });
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.notCalled(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon_1.default.assert.calledOnceWithExactly(automationsApi.markStepTerminal, step, 'failed');
        sinon_1.default.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, nextStepReadyAt);
    });
    it('bails if the automation is inactive', async function () {
        const step = buildEmailStep({ automation_status: 'inactive' });
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt: null });
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.notCalled(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon_1.default.assert.calledOnceWithExactly(automationsApi.markStepTerminal, step, 'automation disabled');
    });
    it('bails if the member no longer exists', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt: null });
        models_1.Member.findOne.resolves(null);
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.notCalled(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon_1.default.assert.calledOnceWithExactly(automationsApi.markStepTerminal, step, 'member unsubscribed');
    });
    it('bails if the member status changed', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt: null });
        models_1.Member.findOne.resolves(buildMember({ status: 'paid' }));
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.notCalled(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon_1.default.assert.calledOnceWithExactly(automationsApi.markStepTerminal, step, 'member changed status');
    });
    it('skips sending email if the member unsubscribed from updates & announcements', async function () {
        const nextReadyAt = new Date(Date.now() + 60 * 1000);
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt: null });
        automationsApi.finishStepAndEnqueueNext.resolves(nextReadyAt);
        models_1.Member.findOne.resolves(buildMember({ enable_updates_and_announcements: false }));
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.notCalled(memberWelcomeEmailService.init);
        sinon_1.default.assert.notCalled(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon_1.default.assert.notCalled(automatedEmailRecipientAdd);
        sinon_1.default.assert.notCalled(automationsApi.markStepTerminal);
        sinon_1.default.assert.calledOnceWithExactly(automationsApi.finishStepAndEnqueueNext, step);
        sinon_1.default.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, nextReadyAt);
    });
    it('sends email if updates & announcements is unset and the member has newsletter subscriptions', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt: null });
        models_1.Member.findOne.resolves(buildMember({
            enable_updates_and_announcements: null,
            newsletters: [{}]
        }));
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.calledOnce(memberWelcomeEmailService.init);
        sinon_1.default.assert.calledOnce(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon_1.default.assert.calledOnceWithExactly(automationsApi.finishStepAndEnqueueNext, step);
    });
    it('skips sending email if updates & announcements is unset and the member has no newsletter subscriptions', async function () {
        const nextReadyAt = new Date(Date.now() + 60 * 1000);
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt: null });
        automationsApi.finishStepAndEnqueueNext.resolves(nextReadyAt);
        models_1.Member.findOne.resolves(buildMember({
            enable_updates_and_announcements: null,
            newsletters: []
        }));
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.notCalled(memberWelcomeEmailService.init);
        sinon_1.default.assert.notCalled(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon_1.default.assert.notCalled(automatedEmailRecipientAdd);
        sinon_1.default.assert.notCalled(automationsApi.markStepTerminal);
        sinon_1.default.assert.calledOnceWithExactly(automationsApi.finishStepAndEnqueueNext, step);
        sinon_1.default.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, nextReadyAt);
    });
    it('gift members run through paid automations', async function () {
        const step = buildEmailStep({
            automation_slug: constants_1.MEMBER_WELCOME_EMAIL_SLUGS.paid
        });
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt: null });
        models_1.Member.findOne.resolves(buildMember({ status: 'gift' }));
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.calledOnceWithExactly(memberWelcomeEmailService.api.sendAutomationEmail, sinon_1.default.match({
            memberStatus: 'paid'
        }));
        sinon_1.default.assert.calledOnceWithExactly(automationsApi.finishStepAndEnqueueNext, step);
    });
    it('sends email revision content and enqueues the next step', async function () {
        const nextReadyAt = new Date(Date.now() + 60 * 1000);
        const step = buildEmailStep({ email_design_setting_id: 'design-id' });
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt: null });
        automationsApi.finishStepAndEnqueueNext.resolves(nextReadyAt);
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.calledOnce(memberWelcomeEmailService.init);
        sinon_1.default.assert.calledOnceWithExactly(memberWelcomeEmailService.api.sendAutomationEmail, sinon_1.default.match({
            email: {
                designSettingId: 'design-id',
                lexical: step.email_lexical,
                subject: 'Welcome!'
            },
            memberStatus: 'free'
        }));
        sinon_1.default.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, nextReadyAt);
    });
    it('records the automated email recipient after sending email revision content', async function () {
        const step = buildEmailStep({
            automation_action_revision_id: 'revision-id'
        });
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt: null });
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.calledOnceWithExactly(automatedEmailRecipientAdd, {
            member_id: step.member_id,
            member_uuid: '00000000-0000-4000-8000-000000000001',
            member_email: 'member@example.com',
            member_name: 'Test Member',
            automation_action_revision_id: 'revision-id'
        });
        sinon_1.default.assert.callOrder(memberWelcomeEmailService.api.sendAutomationEmail, automatedEmailRecipientAdd, automationsApi.finishStepAndEnqueueNext);
    });
    it('does not retry the email send when recording the automated email recipient fails', async function () {
        const step = buildEmailStep();
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt: null });
        automatedEmailRecipientAdd.rejects(new Error('recipient persistence failed'));
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.calledOnce(memberWelcomeEmailService.api.sendAutomationEmail);
        sinon_1.default.assert.calledOnce(automatedEmailRecipientAdd);
        sinon_1.default.assert.calledOnceWithExactly(automationsApi.finishStepAndEnqueueNext, step);
        sinon_1.default.assert.notCalled(automationsApi.retryStep);
        sinon_1.default.assert.notCalled(automationsApi.markStepTerminal);
    });
    it('enqueues the earlier pending step instead of a later processed next step', async function () {
        const pendingReadyAt = new Date(Date.now() + 30 * 1000);
        const processedNextReadyAt = new Date(Date.now() + 60 * 1000);
        const step = buildWaitStep();
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt: pendingReadyAt });
        automationsApi.finishStepAndEnqueueNext.resolves(processedNextReadyAt);
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, pendingReadyAt);
    });
    it('retries email send failures', async function () {
        const step = buildEmailStep({ step_attempts: 1 });
        const pollStart = Date.now();
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt: null });
        memberWelcomeEmailService.api.sendAutomationEmail.rejects(new Error('send failed'));
        await (0, poll_1.poll)(options);
        const retryAt = automationsApi.retryStep.firstCall.args[1];
        strict_1.default.ok(Math.abs(retryAt.getTime() - (pollStart + RETRY_DELAY_MS)) < 2000);
        sinon_1.default.assert.calledOnceWithExactly(automationsApi.retryStep, step, retryAt);
        sinon_1.default.assert.calledOnceWithExactly(options.enqueueAnotherPollAt, retryAt);
    });
    it('permanently fails email send failures at the attempt limit', async function () {
        const step = buildEmailStep({ step_attempts: 10 });
        automationsApi.fetchAndLockSteps.resolves({ steps: [step], nextStepReadyAt: null });
        memberWelcomeEmailService.api.sendAutomationEmail.rejects(new Error('send failed'));
        await (0, poll_1.poll)(options);
        sinon_1.default.assert.notCalled(automationsApi.retryStep);
        sinon_1.default.assert.calledOnceWithExactly(automationsApi.markStepTerminal, step, 'failed');
    });
});
