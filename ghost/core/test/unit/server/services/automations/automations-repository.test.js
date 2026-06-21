"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const errors_1 = __importDefault(require("@tryghost/errors"));
const bson_objectid_1 = __importDefault(require("bson-objectid"));
const knex_1 = __importDefault(require("knex"));
const moment_1 = __importDefault(require("moment"));
const automations_fixtures_1 = require("../../../../utils/automations-fixtures");
const database_automations_repository_1 = require("../../../../../core/server/services/automations/database-automations-repository");
const HOUR_MS = 60 * 60 * 1000;
const FAKE_WAIT_HOURS_MULTIPLIER = 2500;
const DATABASE_DATE_FORMAT = 'YYYY-MM-DD HH:mm:ss';
const toDatabaseDate = (date) => (0, moment_1.default)(date).format(DATABASE_DATE_FORMAT);
const toRepositoryDateISOString = (date) => new Date(toDatabaseDate(date)).toISOString();
const addHours = (dateCol, hours) => {
    (0, strict_1.default)(typeof dateCol === 'string', 'Expected date column to be a string');
    return (0, moment_1.default)(dateCol, DATABASE_DATE_FORMAT).add(hours, 'hours').toDate();
};
const createDatabase = async () => {
    const database = (0, knex_1.default)({
        client: 'sqlite3',
        connection: {
            filename: ':memory:'
        },
        pool: {
            min: 1,
            max: 1
        },
        useNullAsDefault: true
    });
    await database.raw('PRAGMA foreign_keys = ON;');
    const id = () => (0, bson_objectid_1.default)().toHexString();
    const now = () => toDatabaseDate(new Date());
    const fakeEmailDesignSettingId = id();
    const defaultEmailDesignSettingId = id();
    await database.schema.createTable('automations', (table) => {
        table.text('id').primary();
        table.text('created_at').notNullable();
        table.text('updated_at').notNullable();
        table.text('slug').notNullable().unique();
        table.text('name').notNullable();
        table.text('status').notNullable();
    });
    await database.schema.createTable('automation_actions', (table) => {
        table.text('id').primary();
        table.text('created_at').notNullable();
        table.text('updated_at').notNullable();
        table.text('deleted_at');
        table.text('automation_id').notNullable().references('id').inTable('automations');
        table.text('type').notNullable();
    });
    await database.schema.createTable('email_design_settings', (table) => {
        table.text('id').primary();
        table.text('slug').notNullable().unique();
        table.text('created_at').notNullable();
        table.text('updated_at');
    });
    await database.schema.createTable('welcome_email_automated_emails', (table) => {
        table.text('id').primary();
        table.text('welcome_email_automation_id').notNullable().references('id').inTable('automations');
        table.text('next_welcome_email_automated_email_id');
        table.integer('delay_days').notNullable();
        table.text('subject').notNullable();
        table.text('lexical');
        table.text('email_design_setting_id').notNullable().references('id').inTable('email_design_settings');
        table.text('created_at').notNullable();
        table.text('updated_at');
    });
    await database.schema.createTable('automation_action_revisions', (table) => {
        table.text('id').primary();
        table.text('created_at').notNullable();
        table.text('action_id').notNullable().references('id').inTable('automation_actions');
        table.integer('wait_hours');
        table.text('email_subject');
        table.text('email_lexical');
        table.text('email_design_setting_id').references('id').inTable('email_design_settings');
        table.unique(['created_at', 'action_id']);
    });
    await database.schema.createTable('automation_action_edges', (table) => {
        table.text('source_action_id').notNullable().references('id').inTable('automation_actions');
        table.text('target_action_id').notNullable().references('id').inTable('automation_actions');
        table.primary(['source_action_id', 'target_action_id']);
    });
    await database.schema.createTable('automation_runs', (table) => {
        table.text('id').primary();
        table.text('created_at').notNullable();
        table.text('updated_at').notNullable();
        table.text('automation_id').notNullable().references('id').inTable('automations');
        table.text('member_id'); // not a real foreign key here
        table.text('member_email').notNullable();
    });
    await database.schema.createTable('automation_run_steps', (table) => {
        table.text('id').primary();
        table.text('created_at').notNullable();
        table.text('updated_at').notNullable();
        table.text('automation_run_id').notNullable().references('id').inTable('automation_runs');
        table.text('automation_action_revision_id').notNullable().references('id').inTable('automation_action_revisions');
        table.text('ready_at').notNullable();
        table.integer('step_attempts').notNullable().defaultTo(0);
        table.text('started_at');
        table.text('finished_at');
        table.text('status').notNullable().defaultTo('pending');
        table.text('locked_by');
        table.text('locked_at');
    });
    const freeAutomationId = id();
    const paidAutomationId = id();
    await database('email_design_settings').insert([{
            id: defaultEmailDesignSettingId,
            slug: 'default-automated-email',
            created_at: now(),
            updated_at: now()
        }, {
            id: fakeEmailDesignSettingId,
            slug: 'test-automation-email-design',
            created_at: now(),
            updated_at: now()
        }]);
    await database('automations').insert([{
            id: freeAutomationId,
            created_at: now(),
            updated_at: now(),
            slug: 'member-welcome-email-free',
            name: 'Free member welcome flow',
            status: 'active'
        }, {
            id: paidAutomationId,
            created_at: now(),
            updated_at: now(),
            slug: 'member-welcome-email-paid',
            name: 'Paid member welcome flow',
            status: 'active'
        }]);
    const freeAction1Id = id();
    const freeAction2Id = id();
    const freeAction3Id = id();
    const freeAction4Id = id();
    const paidAction1Id = id();
    const paidAction2Id = id();
    const paidAction3Id = id();
    const paidAction4Id = id();
    await database('automation_actions').insert([{
            id: freeAction1Id,
            created_at: now(),
            updated_at: now(),
            automation_id: freeAutomationId,
            type: 'wait'
        }, {
            id: freeAction2Id,
            created_at: now(),
            updated_at: now(),
            automation_id: freeAutomationId,
            type: 'send_email'
        }, {
            id: freeAction3Id,
            created_at: now(),
            updated_at: now(),
            automation_id: freeAutomationId,
            type: 'wait'
        }, {
            id: freeAction4Id,
            created_at: now(),
            updated_at: now(),
            automation_id: freeAutomationId,
            type: 'send_email'
        }, {
            id: paidAction1Id,
            created_at: now(),
            updated_at: now(),
            automation_id: paidAutomationId,
            type: 'wait'
        }, {
            id: paidAction2Id,
            created_at: now(),
            updated_at: now(),
            automation_id: paidAutomationId,
            type: 'send_email'
        }, {
            id: paidAction3Id,
            created_at: now(),
            updated_at: now(),
            automation_id: paidAutomationId,
            type: 'wait'
        }, {
            id: paidAction4Id,
            created_at: now(),
            updated_at: now(),
            automation_id: paidAutomationId,
            type: 'send_email'
        }]);
    await database('automation_action_revisions').insert([{
            id: id(),
            created_at: now(),
            action_id: freeAction1Id,
            wait_hours: 48,
            email_subject: null,
            email_lexical: null,
            email_design_setting_id: null
        }, {
            id: id(),
            created_at: now(),
            action_id: freeAction2Id,
            wait_hours: null,
            email_subject: 'Welcome!',
            email_lexical: automations_fixtures_1.NON_EMPTY_EMAIL_LEXICAL,
            email_design_setting_id: fakeEmailDesignSettingId
        }, {
            id: id(),
            created_at: now(),
            action_id: freeAction3Id,
            wait_hours: 72,
            email_subject: null,
            email_lexical: null,
            email_design_setting_id: null
        }, {
            id: id(),
            created_at: now(),
            action_id: freeAction4Id,
            wait_hours: null,
            email_subject: 'Follow up',
            email_lexical: automations_fixtures_1.NON_EMPTY_EMAIL_LEXICAL,
            email_design_setting_id: fakeEmailDesignSettingId
        }, {
            id: id(),
            created_at: now(),
            action_id: paidAction1Id,
            wait_hours: 48,
            email_subject: null,
            email_lexical: null,
            email_design_setting_id: null
        }, {
            id: id(),
            created_at: now(),
            action_id: paidAction2Id,
            wait_hours: null,
            email_subject: 'Welcome to Paid!',
            email_lexical: automations_fixtures_1.NON_EMPTY_EMAIL_LEXICAL,
            email_design_setting_id: fakeEmailDesignSettingId
        }, {
            id: id(),
            created_at: now(),
            action_id: paidAction3Id,
            wait_hours: 72,
            email_subject: null,
            email_lexical: null,
            email_design_setting_id: null
        }, {
            id: id(),
            created_at: now(),
            action_id: paidAction4Id,
            wait_hours: null,
            email_subject: 'Exclusive Insights',
            email_lexical: automations_fixtures_1.NON_EMPTY_EMAIL_LEXICAL,
            email_design_setting_id: fakeEmailDesignSettingId
        }]);
    await database('automation_action_edges').insert([{
            source_action_id: freeAction1Id,
            target_action_id: freeAction2Id
        }, {
            source_action_id: freeAction2Id,
            target_action_id: freeAction3Id
        }, {
            source_action_id: freeAction3Id,
            target_action_id: freeAction4Id
        }, {
            source_action_id: paidAction1Id,
            target_action_id: paidAction2Id
        }, {
            source_action_id: paidAction2Id,
            target_action_id: paidAction3Id
        }, {
            source_action_id: paidAction3Id,
            target_action_id: paidAction4Id
        }]);
    return database;
};
// These tests are partly coupled to the *fake* repository. We should be able to
// modify it once we have the real repository.
describe('automations repository', function () {
    let knex;
    let repo;
    const getRunByMemberEmail = async (email) => (await knex('automation_runs')
        .select('automation_runs.*', 'automations.slug as automation_slug')
        .innerJoin('automations', 'automations.id', 'automation_runs.automation_id')
        .where('automation_runs.member_email', email)
        .first());
    const getStepByRunId = async (runId) => (await knex('automation_run_steps')
        .select('automation_run_steps.*', 'automation_actions.id as action_id', 'automation_actions.type as action_type', 'automation_action_revisions.wait_hours as wait_hours', 'automation_action_revisions.email_subject as email_subject')
        .innerJoin('automation_action_revisions', 'automation_action_revisions.id', 'automation_run_steps.automation_action_revision_id')
        .innerJoin('automation_actions', 'automation_actions.id', 'automation_action_revisions.action_id')
        .where('automation_run_steps.automation_run_id', runId)
        .first());
    const getAutomationBySlug = async (slug) => {
        const automationSummaries = await repo.browse();
        const automationSummary = automationSummaries.data.find(automation => automation.slug === slug);
        (0, strict_1.default)(automationSummary);
        const automation = await repo.getById(automationSummary.id);
        (0, strict_1.default)(automation);
        return automation;
    };
    const getRunCountByAutomationId = async (automationId) => {
        const result = await knex('automation_runs')
            .count({ count: '*' })
            .where('automation_id', automationId)
            .first();
        return result?.count;
    };
    const getRevisionCount = async (actionId) => {
        const builder = knex('automation_action_revisions').count({ count: '*' });
        const row = await (actionId ? builder.where('action_id', actionId) : builder).first();
        return Number(row.count);
    };
    const getActionByIndex = async (automationId, index) => {
        const result = await knex('automation_actions')
            .select('automation_actions.id as action_id', 'automation_actions.type as action_type', 'automation_action_revisions.id as revision_id', 'automation_action_revisions.wait_hours as wait_hours')
            .innerJoin('automation_action_revisions', 'automation_action_revisions.action_id', 'automation_actions.id')
            .where('automation_actions.automation_id', automationId)
            .whereNull('automation_actions.deleted_at')
            .orderBy([
            'automation_actions.created_at',
            'automation_actions.id'
        ])
            .offset(index)
            .first();
        (0, strict_1.default)(result, 'Expected action to exist');
        return result;
    };
    const getLatestActionRevisionByActionId = async (actionId) => {
        const result = await knex('automation_actions')
            .select('automation_actions.id as action_id', 'automation_actions.type as action_type', 'automation_action_revisions.id as revision_id', 'automation_action_revisions.wait_hours as wait_hours', 'automation_action_revisions.email_design_setting_id as email_design_setting_id')
            .innerJoin('automation_action_revisions', 'automation_action_revisions.action_id', 'automation_actions.id')
            .where('automation_actions.id', actionId)
            .whereNull('automation_actions.deleted_at')
            .orderBy('automation_action_revisions.created_at', 'desc')
            .orderBy('automation_action_revisions.id', 'desc')
            .first();
        (0, strict_1.default)(result, 'Expected action revision to exist');
        return result;
    };
    const insertRun = async (automationId) => {
        const now = toDatabaseDate(new Date());
        const run = {
            id: (0, bson_objectid_1.default)().toHexString(),
            created_at: now,
            updated_at: now,
            automation_id: automationId,
            member_id: (0, bson_objectid_1.default)().toHexString(),
            member_email: 'member@example.com'
        };
        await knex('automation_runs').insert(run);
        return run;
    };
    const normalizeDateColumns = (row, columns) => {
        for (const column of columns) {
            const value = row[column];
            if (typeof value === 'string' || value instanceof Date) {
                row[column] = toDatabaseDate(value);
            }
        }
    };
    const insertStep = async (runId, revisionId, attrs = {}) => {
        const now = toDatabaseDate(new Date());
        const step = {
            id: (0, bson_objectid_1.default)().toHexString(),
            created_at: now,
            updated_at: now,
            automation_run_id: runId,
            automation_action_revision_id: revisionId,
            ready_at: now,
            step_attempts: 0,
            started_at: null,
            finished_at: null,
            status: 'pending',
            locked_by: null,
            locked_at: null,
            ...attrs
        };
        normalizeDateColumns(step, [
            'created_at',
            'updated_at',
            'ready_at',
            'started_at',
            'finished_at',
            'locked_at'
        ]);
        await knex('automation_run_steps').insert(step);
        return step;
    };
    const getStepById = async (id) => {
        const result = await knex('automation_run_steps')
            .select('*')
            .where('id', id)
            .first();
        (0, strict_1.default)(result, 'Expected step to exist');
        return result;
    };
    const getStepsByRunId = async (runId) => (await knex('automation_run_steps')
        .select('*')
        .where('automation_run_id', runId)
        .orderBy([
        'created_at',
        'id'
    ]));
    const getLockedStep = async (stepId) => {
        const { steps } = await repo.fetchAndLockSteps(10);
        const step = steps.find(candidate => candidate.id === stepId);
        (0, strict_1.default)(step);
        return step;
    };
    const assertSingleBatchLock = (steps) => {
        const lockId = steps[0]?.locked_by;
        strict_1.default.equal(typeof lockId, 'string');
        (0, strict_1.default)(steps.every(step => step.locked_by === lockId));
        return lockId;
    };
    const changeWaitHours = (action, waitHours) => {
        strict_1.default.equal(action.type, 'wait');
        return {
            ...action,
            data: {
                wait_hours: waitHours
            }
        };
    };
    beforeEach(async function () {
        knex = await createDatabase();
        repo = (0, database_automations_repository_1.createDatabaseAutomationsRepository)({
            knex,
            fakeWaitHoursMultiplier: null
        });
    });
    afterEach(async function () {
        await knex?.destroy();
    });
    describe('browse', function () {
        const deleteActionsForAutomationIds = async (automationIds) => {
            const actionIds = await knex('automation_actions')
                .whereIn('automation_id', automationIds)
                .pluck('id');
            await knex('automation_action_edges')
                .whereIn('source_action_id', actionIds)
                .orWhereIn('target_action_id', actionIds)
                .del();
            await knex('automation_action_revisions')
                .whereIn('action_id', actionIds)
                .del();
            await knex('automation_actions')
                .whereIn('id', actionIds)
                .del();
        };
        const getWelcomeEmailDesignSettingId = async () => {
            const row = await knex('email_design_settings')
                .select('id')
                .where('slug', 'test-automation-email-design')
                .first();
            (0, strict_1.default)(row);
            return row.id;
        };
        const createWelcomeEmailsForAutomations = async (automations) => {
            const emailDesignSettingId = await getWelcomeEmailDesignSettingId();
            await knex('welcome_email_automated_emails').insert(automations.map(automation => ({
                id: (0, bson_objectid_1.default)().toHexString(),
                welcome_email_automation_id: automation.id,
                next_welcome_email_automated_email_id: null,
                delay_days: 0,
                subject: `${automation.slug} subject`,
                lexical: automations_fixtures_1.NON_EMPTY_EMAIL_LEXICAL,
                email_design_setting_id: emailDesignSettingId,
                created_at: toDatabaseDate(new Date()),
                updated_at: toDatabaseDate(new Date())
            })));
            return emailDesignSettingId;
        };
        const assertWelcomeEmailActionsWereCreated = async (automations, emailDesignSettingId) => {
            for (const automation of automations) {
                const result = await repo.getById(automation.id);
                (0, strict_1.default)(result);
                strict_1.default.deepEqual(result.edges, []);
                strict_1.default.equal(result.actions.length, 1);
                const action = result.actions[0];
                strict_1.default.equal(action.type, 'send_email');
                if (action.type !== 'send_email') {
                    strict_1.default.fail('Expected a send_email action');
                }
                strict_1.default.equal(action.data.email_subject, `${automation.slug} subject`);
                strict_1.default.equal(action.data.email_lexical, automations_fixtures_1.NON_EMPTY_EMAIL_LEXICAL);
                strict_1.default.equal(action.data.email_design_setting_id, emailDesignSettingId);
            }
        };
        it('creates missing default free and paid automations', async function () {
            const automationIds = await knex('automations')
                .whereIn('slug', ['member-welcome-email-free', 'member-welcome-email-paid'])
                .pluck('id');
            await deleteActionsForAutomationIds(automationIds);
            await knex('automations')
                .whereIn('id', automationIds)
                .del();
            await repo.browse();
            const automations = await knex('automations')
                .select('id', 'name', 'slug', 'status')
                .whereIn('slug', ['member-welcome-email-free', 'member-welcome-email-paid'])
                .orderBy('slug');
            strict_1.default.deepEqual(automations.map(({ name, slug, status }) => ({ name, slug, status })), [{
                    name: 'Free member welcome flow',
                    slug: 'member-welcome-email-free',
                    status: 'inactive'
                }, {
                    name: 'Paid member welcome flow',
                    slug: 'member-welcome-email-paid',
                    status: 'inactive'
                }]);
            const emailDesignSettingId = await createWelcomeEmailsForAutomations(automations);
            await repo.browse();
            await assertWelcomeEmailActionsWereCreated(automations, emailDesignSettingId);
        });
        it('creates copied send_email actions for default automations without actions', async function () {
            const automations = await knex('automations')
                .select('id', 'slug')
                .whereIn('slug', ['member-welcome-email-free', 'member-welcome-email-paid']);
            const automationIds = automations.map(automation => automation.id);
            await deleteActionsForAutomationIds(automationIds);
            const emailDesignSettingId = await createWelcomeEmailsForAutomations(automations);
            await repo.browse();
            await assertWelcomeEmailActionsWereCreated(automations, emailDesignSettingId);
            await repo.browse();
            const totalActions = await knex('automation_actions')
                .whereIn('automation_id', automationIds)
                .whereNull('deleted_at')
                .count({ count: 'id' })
                .first();
            strict_1.default.equal(Number(totalActions?.count), 2);
        });
    });
    describe('trigger', function () {
        it('can trigger an automation for a free member', async function () {
            await repo.trigger({
                memberEmail: 'free@example.com',
                memberId: 'member_123',
                memberStatus: 'free'
            });
            const run = await getRunByMemberEmail('free@example.com');
            (0, strict_1.default)(run);
            strict_1.default.equal(run.member_email, 'free@example.com');
            strict_1.default.equal(run.member_id, 'member_123');
            strict_1.default.equal(run.automation_slug, 'member-welcome-email-free');
            strict_1.default.equal(run.created_at, run.updated_at);
            const step = await getStepByRunId(run.id);
            (0, strict_1.default)(step);
            strict_1.default.equal(step.automation_run_id, run.id);
            strict_1.default.equal(step.action_type, 'wait');
            strict_1.default.equal(step.wait_hours, 48);
            strict_1.default.equal(step.created_at, run.created_at);
            strict_1.default.equal(step.updated_at, run.updated_at);
            strict_1.default.equal(step.ready_at, toDatabaseDate(addHours(run.created_at, 48)));
            strict_1.default.equal(step.step_attempts, 0);
            strict_1.default.equal(step.started_at, null);
            strict_1.default.equal(step.finished_at, null);
            strict_1.default.equal(step.status, 'pending');
            strict_1.default.equal(step.locked_by, null);
            strict_1.default.equal(step.locked_at, null);
        });
        it('uses the fake wait hours multiplier for triggered wait actions when configured', async function () {
            repo = (0, database_automations_repository_1.createDatabaseAutomationsRepository)({
                knex,
                fakeWaitHoursMultiplier: FAKE_WAIT_HOURS_MULTIPLIER
            });
            const beforeTrigger = Date.now();
            await repo.trigger({
                memberEmail: 'fake-wait@example.com',
                memberId: 'member_123',
                memberStatus: 'free'
            });
            const afterTrigger = Date.now();
            const run = await getRunByMemberEmail('fake-wait@example.com');
            (0, strict_1.default)(run);
            const step = await getStepByRunId(run.id);
            (0, strict_1.default)(step);
            const readyAtMs = (0, moment_1.default)(step.ready_at, DATABASE_DATE_FORMAT).valueOf();
            (0, strict_1.default)(readyAtMs >= beforeTrigger + (48 * FAKE_WAIT_HOURS_MULTIPLIER) - 999);
            (0, strict_1.default)(readyAtMs <= afterTrigger + (48 * FAKE_WAIT_HOURS_MULTIPLIER));
        });
        it('can trigger an automation for a paid member', async function () {
            await repo.trigger({
                memberEmail: 'paid@example.com',
                memberId: 'member_123',
                memberStatus: 'paid'
            });
            const run = await getRunByMemberEmail('paid@example.com');
            (0, strict_1.default)(run);
            strict_1.default.equal(run.automation_slug, 'member-welcome-email-paid');
            const step = await getStepByRunId(run.id);
            (0, strict_1.default)(step);
            strict_1.default.equal(step.automation_run_id, run.id);
            strict_1.default.equal(step.action_type, 'wait');
        });
        it('inserts the first non-deleted step', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            await repo.edit(automation.id, {
                status: 'active',
                actions: [
                    {
                        id: 'wait-action-to-delete',
                        type: 'wait',
                        data: { wait_hours: 72 }
                    },
                    {
                        id: 'main-wait-action',
                        type: 'wait',
                        data: { wait_hours: 24 }
                    }
                ],
                edges: [{
                        source_action_id: 'wait-action-to-delete',
                        target_action_id: 'main-wait-action'
                    }]
            });
            await repo.edit(automation.id, {
                status: 'active',
                actions: [
                    {
                        id: 'main-wait-action',
                        type: 'wait',
                        data: { wait_hours: 24 }
                    }
                ],
                edges: []
            });
            await repo.trigger({
                memberEmail: 'free@example.com',
                memberId: 'member_123',
                memberStatus: 'free'
            });
            const run = await getRunByMemberEmail('free@example.com');
            (0, strict_1.default)(run);
            const step = await getStepByRunId(run.id);
            (0, strict_1.default)(step);
            strict_1.default.equal(step.action_id, 'main-wait-action');
        });
        it('does not trigger an automation for an inactive automation', async function () {
            const freeAutomation = await getAutomationBySlug('member-welcome-email-free');
            await repo.edit(freeAutomation.id, {
                ...freeAutomation,
                status: 'inactive'
            });
            await repo.trigger({
                memberEmail: 'inactive-free@example.com',
                memberId: 'member_123',
                memberStatus: 'free'
            });
            strict_1.default.equal(await getRunByMemberEmail('inactive-free@example.com'), undefined);
            strict_1.default.equal(await getRunCountByAutomationId(freeAutomation.id), 0);
        });
        it('does not trigger an automation for an automation with no actions', async function () {
            const freeAutomation = await getAutomationBySlug('member-welcome-email-free');
            await repo.edit(freeAutomation.id, {
                status: 'active',
                actions: [],
                edges: []
            });
            await repo.trigger({
                memberEmail: 'free-no-actions@example.com',
                memberId: 'member_123',
                memberStatus: 'free'
            });
            strict_1.default.equal(await getRunByMemberEmail('free-no-actions@example.com'), undefined);
            strict_1.default.equal(await getRunCountByAutomationId(freeAutomation.id), 0);
        });
    });
    describe('edit', function () {
        const assertValidationError = async (fn, property, message) => {
            await strict_1.default.rejects(fn, (error) => {
                (0, strict_1.default)(error instanceof errors_1.default.ValidationError);
                strict_1.default.equal(error.property, property);
                strict_1.default.match(error.message, message);
                return true;
            });
        };
        it('only inserts action revisions when action data changes', async function () {
            const initialAutomation = await getAutomationBySlug('member-welcome-email-free');
            const initialRevisionCount = await getRevisionCount();
            const waitAction = initialAutomation.actions.find(action => action.type === 'wait');
            const unchangedEmailAction = initialAutomation.actions.find(action => action.type === 'send_email');
            (0, strict_1.default)(waitAction);
            (0, strict_1.default)(unchangedEmailAction);
            strict_1.default.equal(await getRevisionCount(waitAction.id), 1);
            strict_1.default.equal(await getRevisionCount(unchangedEmailAction.id), 1);
            await repo.edit(initialAutomation.id, {
                status: 'inactive',
                actions: initialAutomation.actions,
                edges: initialAutomation.edges
            });
            strict_1.default.equal(await getRevisionCount(), initialRevisionCount);
            strict_1.default.equal(await getRevisionCount(waitAction.id), 1);
            strict_1.default.equal(await getRevisionCount(unchangedEmailAction.id), 1);
            const changedWaitAction = changeWaitHours(waitAction, waitAction.data.wait_hours + 24);
            await repo.edit(initialAutomation.id, {
                status: 'inactive',
                actions: [changedWaitAction, unchangedEmailAction],
                edges: [{
                        source_action_id: changedWaitAction.id,
                        target_action_id: unchangedEmailAction.id
                    }]
            });
            strict_1.default.equal(await getRevisionCount(), initialRevisionCount + 1);
            strict_1.default.equal(await getRevisionCount(waitAction.id), 2);
            strict_1.default.equal(await getRevisionCount(unchangedEmailAction.id), 1);
            const addedActionId = (0, bson_objectid_1.default)().toString();
            const addedAction = {
                id: addedActionId,
                type: 'wait',
                data: {
                    wait_hours: 72
                }
            };
            await repo.edit(initialAutomation.id, {
                status: 'inactive',
                actions: [changedWaitAction, unchangedEmailAction, addedAction],
                edges: [
                    {
                        source_action_id: changedWaitAction.id,
                        target_action_id: unchangedEmailAction.id
                    },
                    {
                        source_action_id: unchangedEmailAction.id,
                        target_action_id: addedActionId
                    }
                ]
            });
            strict_1.default.equal(await getRevisionCount(), initialRevisionCount + 2);
            strict_1.default.equal(await getRevisionCount(waitAction.id), 2);
            strict_1.default.equal(await getRevisionCount(unchangedEmailAction.id), 1);
            strict_1.default.equal(await getRevisionCount(addedActionId), 1);
        });
        it('resolves default email design setting slugs to the default design setting id', async function () {
            const initialAutomation = await getAutomationBySlug('member-welcome-email-free');
            const addedActionId = (0, bson_objectid_1.default)().toString();
            const addedAction = {
                id: addedActionId,
                type: 'send_email',
                data: {
                    email_subject: 'Welcome',
                    email_lexical: automations_fixtures_1.NON_EMPTY_EMAIL_LEXICAL,
                    email_design_setting_id: 'default-automated-email'
                }
            };
            await repo.edit(initialAutomation.id, {
                status: 'inactive',
                actions: [addedAction],
                edges: []
            });
            const defaultDesignSetting = await knex('email_design_settings')
                .select('id')
                .where('slug', 'default-automated-email')
                .first();
            const revision = await getLatestActionRevisionByActionId(addedActionId);
            strict_1.default.equal(revision.email_design_setting_id, defaultDesignSetting.id);
        });
        it('rejects changing an action that is part of another automation', async function () {
            const freeAutomation = await getAutomationBySlug('member-welcome-email-free');
            const paidAutomation = await getAutomationBySlug('member-welcome-email-paid');
            const paidAction = paidAutomation.actions[0];
            await assertValidationError(async () => repo.edit(freeAutomation.id, {
                status: 'inactive',
                actions: [paidAction],
                edges: []
            }), 'actions.id', /already exists/);
        });
        it('rejects changing a soft-deleted action', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const now = toDatabaseDate(new Date());
            const softDeletedActionId = (0, bson_objectid_1.default)().toString();
            await knex('automation_actions').insert({
                id: softDeletedActionId,
                created_at: now,
                updated_at: now,
                deleted_at: now,
                automation_id: automation.id,
                type: 'wait'
            });
            await assertValidationError(async () => repo.edit(automation.id, {
                status: 'inactive',
                actions: [{
                        id: softDeletedActionId,
                        type: 'wait',
                        data: {
                            wait_hours: 24
                        }
                    }],
                edges: []
            }), 'actions.id', /already exists/);
        });
        it('rejects changing the type of an action', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const waitAction = automation.actions.find(action => action.type === 'wait');
            const emailAction = automation.actions.find(action => action.type === 'send_email');
            (0, strict_1.default)(waitAction, 'test setup expects wait action');
            strict_1.default.equal(emailAction?.type, 'send_email', 'test setup expects email action');
            await assertValidationError(async () => repo.edit(automation.id, {
                status: 'inactive',
                actions: [{
                        id: waitAction.id,
                        type: 'send_email',
                        data: emailAction.data
                    }],
                edges: []
            }), 'actions.type', /different type/);
        });
    });
    describe('fetchAndLockSteps', function () {
        const isCandidateStepSelect = (query) => {
            const sql = query.sql?.toLowerCase() ?? '';
            return (query.method === 'select' &&
                sql.includes('select `id`') &&
                sql.includes('from `automation_run_steps`'));
        };
        const includesStepId = (response, stepId) => (Array.isArray(response) &&
            response.some(row => (typeof row === 'object' &&
                row !== null &&
                'id' in row &&
                row.id === stepId)));
        const simulateLockRace = (contendedStepId) => {
            let hasSimulatedLock = false;
            const originalTransaction = knex.transaction.bind(knex);
            const mockTransaction = async (scope, config) => (originalTransaction(async (trx) => {
                const { client } = trx;
                const originalQuery = client.query.bind(client);
                client.query = async (connection, query) => {
                    const result = await originalQuery(connection, query);
                    if (!hasSimulatedLock &&
                        isCandidateStepSelect(query) &&
                        includesStepId(result.response, contendedStepId)) {
                        hasSimulatedLock = true;
                        const lockedAt = toDatabaseDate(new Date());
                        await trx('automation_run_steps')
                            .update({
                            locked_by: 'contending-lock',
                            locked_at: lockedAt,
                            started_at: lockedAt,
                            updated_at: lockedAt
                        })
                            .where('id', contendedStepId);
                        client.query = originalQuery;
                    }
                    return result;
                };
                return await scope(trx);
            }, config));
            const mockKnex = new Proxy(knex, {
                get(target, property, receiver) {
                    if (property === 'transaction') {
                        return mockTransaction;
                    }
                    return Reflect.get(target, property, receiver);
                }
            });
            repo = (0, database_automations_repository_1.createDatabaseAutomationsRepository)({
                knex: mockKnex,
                fakeWaitHoursMultiplier: null
            });
        };
        const assertContendedStepWasLocked = async (stepId) => {
            const step = await getStepById(stepId);
            strict_1.default.equal(step.locked_by, 'contending-lock');
            strict_1.default.equal(typeof step.locked_at, 'string');
            strict_1.default.equal(step.started_at, step.locked_at);
            strict_1.default.equal(step.updated_at, step.locked_at);
        };
        it('locks ready and steps with stale locks, but skips future and recently-locked steps', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const readyStep = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const staleLockStep = await insertStep(run.id, action.revision_id, {
                locked_at: new Date(Date.now() - (31 * 60 * 1000)).toISOString(),
                ready_at: new Date(Date.now() - 1000).toISOString(),
                locked_by: 'old-lock',
                step_attempts: 2
            });
            const finishedStep = await insertStep(run.id, action.revision_id, {
                finished_at: new Date(Date.now() - 1000).toISOString(),
                locked_at: new Date(Date.now() - (31 * 60 * 1000)).toISOString(),
                ready_at: new Date(Date.now() - 1000).toISOString(),
                locked_by: 'finished-lock',
                status: 'finished',
                step_attempts: 4
            });
            const futureReadyAt = new Date(Date.now() + 60 * 1000);
            const notReadyYetStep = await insertStep(run.id, action.revision_id, {
                ready_at: futureReadyAt.toISOString()
            });
            const recentlyLockedStep = await insertStep(run.id, action.revision_id, {
                locked_at: new Date(Date.now() - (29 * 60 * 1000)).toISOString(),
                ready_at: new Date(Date.now() - 1000).toISOString(),
                locked_by: 'fresh-lock'
            });
            const result = await repo.fetchAndLockSteps(10);
            const actualStepIds = new Set(result.steps.map(step => step.id));
            const expectedStepIds = new Set([readyStep.id, staleLockStep.id]);
            strict_1.default.deepEqual(actualStepIds, expectedStepIds);
            strict_1.default.equal(result.nextStepReadyAt?.toISOString(), toRepositoryDateISOString(futureReadyAt));
            const lockId = assertSingleBatchLock(result.steps);
            const lockedReady = await getStepById(readyStep.id);
            strict_1.default.equal(lockedReady.status, 'pending');
            strict_1.default.equal(lockedReady.step_attempts, 1);
            strict_1.default.equal(lockedReady.locked_by, lockId);
            const lockedStaleLock = await getStepById(staleLockStep.id);
            strict_1.default.equal(lockedStaleLock.status, 'pending');
            strict_1.default.equal(lockedStaleLock.step_attempts, 3);
            strict_1.default.equal(lockedStaleLock.locked_by, lockId);
            const skippedFinished = await getStepById(finishedStep.id);
            strict_1.default.equal(skippedFinished.status, 'finished');
            strict_1.default.equal(skippedFinished.step_attempts, 4);
            strict_1.default.equal(skippedFinished.locked_by, 'finished-lock');
            const skippedNotReadyYet = await getStepById(notReadyYetStep.id);
            strict_1.default.equal(skippedNotReadyYet.step_attempts, 0);
            strict_1.default.equal(skippedNotReadyYet.locked_by, null);
            const skippedRecentlyLocked = await getStepById(recentlyLockedStep.id);
            strict_1.default.equal(skippedRecentlyLocked.step_attempts, 0);
            strict_1.default.equal(skippedRecentlyLocked.locked_by, 'fresh-lock');
        });
        it('returns the next future pending ready_at when no steps can be locked', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const later = new Date(Date.now() + 60 * 1000);
            const sooner = new Date(Date.now() + 30 * 1000);
            await insertStep(run.id, action.revision_id, { ready_at: later.toISOString() });
            await insertStep(run.id, action.revision_id, { ready_at: sooner.toISOString() });
            const result = await repo.fetchAndLockSteps(10);
            strict_1.default.deepEqual(result.steps, []);
            (0, strict_1.default)(result.nextStepReadyAt);
            strict_1.default.equal(result.nextStepReadyAt.toISOString(), toRepositoryDateISOString(sooner));
        });
        it('does not schedule an immediate poll when due steps are locked by another worker', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const lockedAt = new Date(Date.now() - 60 * 1000);
            await insertStep(run.id, action.revision_id, {
                locked_at: lockedAt.toISOString(),
                ready_at: new Date(Date.now() - 1000).toISOString(),
                locked_by: 'fresh-lock'
            });
            const result = await repo.fetchAndLockSteps(10);
            strict_1.default.deepEqual(result.steps, []);
            strict_1.default.equal(result.nextStepReadyAt, null);
        });
        it('respects the limit argument', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const readyAt1 = new Date(Date.now() - 2000).toISOString();
            const readyAt2 = new Date(Date.now() - 1000).toISOString();
            const firstStep = await insertStep(run.id, action.revision_id, { ready_at: readyAt1 });
            const secondStep = await insertStep(run.id, action.revision_id, { ready_at: readyAt1 });
            const thirdStep = await insertStep(run.id, action.revision_id, { ready_at: readyAt2 });
            const result = await repo.fetchAndLockSteps(2);
            strict_1.default.equal(result.steps.length, 2);
            strict_1.default.equal(result.nextStepReadyAt?.toISOString(), toRepositoryDateISOString(readyAt2));
            const lockId = assertSingleBatchLock(result.steps);
            const first = await getStepById(firstStep.id);
            const second = await getStepById(secondStep.id);
            const third = await getStepById(thirdStep.id);
            const allSteps = [first, second, third];
            const lockedSteps = allSteps.filter(step => step.locked_by === lockId);
            strict_1.default.equal(lockedSteps.length, 2);
            const notLockedSteps = allSteps.filter(step => step.locked_by !== lockId);
            strict_1.default.equal(notLockedSteps.length, 1);
            const [notLockedStep] = notLockedSteps;
            (0, strict_1.default)(notLockedStep);
            strict_1.default.equal(notLockedStep.locked_by, null);
            strict_1.default.equal(notLockedStep.step_attempts, 0);
        });
        it('does not return the same steps to concurrent callers', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const readyAt = new Date(Date.now() - 1000).toISOString();
            const readySteps = await Promise.all([
                insertStep(run.id, action.revision_id, { ready_at: readyAt }),
                insertStep(run.id, action.revision_id, { ready_at: readyAt }),
                insertStep(run.id, action.revision_id, { ready_at: readyAt }),
                insertStep(run.id, action.revision_id, { ready_at: readyAt })
            ]);
            const [firstResult, secondResult] = await Promise.all([
                repo.fetchAndLockSteps(2),
                repo.fetchAndLockSteps(2)
            ]);
            const firstStepIds = new Set(firstResult.steps.map(step => step.id));
            const secondStepIds = new Set(secondResult.steps.map(step => step.id));
            strict_1.default.equal(firstStepIds.size, firstResult.steps.length);
            strict_1.default.equal(secondStepIds.size, secondResult.steps.length);
            strict_1.default.equal([...firstStepIds].some(id => secondStepIds.has(id)), false);
            const firstLockId = assertSingleBatchLock(firstResult.steps);
            const secondLockId = assertSingleBatchLock(secondResult.steps);
            strict_1.default.notEqual(firstLockId, secondLockId);
            const allSteps = await Promise.all(readySteps.map(step => getStepById(step.id)));
            const lockedSteps = allSteps.filter(step => step.locked_by !== null);
            strict_1.default.equal(lockedSteps.length, firstResult.steps.length + secondResult.steps.length);
            (0, strict_1.default)(lockedSteps.length <= readySteps.length);
        });
        it('handles concurrent locks in the same transaction', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const readyAt = new Date(Date.now() - 1000).toISOString();
            const availableStep = await insertStep(run.id, action.revision_id, { ready_at: readyAt });
            const contendedStep = await insertStep(run.id, action.revision_id, { ready_at: readyAt });
            simulateLockRace(contendedStep.id);
            const result = await repo.fetchAndLockSteps(2);
            const actualStepIds = new Set(result.steps.map(step => step.id));
            const expectedStepIds = new Set([availableStep.id]);
            strict_1.default.deepEqual(actualStepIds, expectedStepIds);
            await assertContendedStepWasLocked(contendedStep.id);
        });
        it('returns the next unlocked ready_at when selected rows lose the lock race', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const readyAt = new Date(Date.now() - 1000).toISOString();
            const contendedStep = await insertStep(run.id, action.revision_id, {
                created_at: new Date(Date.now() - 2000).toISOString(),
                ready_at: readyAt
            });
            await insertStep(run.id, action.revision_id, {
                created_at: new Date(Date.now() - 1000).toISOString(),
                ready_at: readyAt
            });
            simulateLockRace(contendedStep.id);
            const result = await repo.fetchAndLockSteps(1);
            strict_1.default.deepEqual(result.steps, []);
            (0, strict_1.default)(result.nextStepReadyAt);
            strict_1.default.equal(result.nextStepReadyAt.toISOString(), toRepositoryDateISOString(readyAt));
            await assertContendedStepWasLocked(contendedStep.id);
        });
    });
    describe('finishStepAndEnqueueNext', function () {
        it('finishes a locked step and enqueues the next action revision', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const lockedStep = await getStepById(step.id);
            const beforeFinish = Date.now();
            const nextReadyAt = await repo.finishStepAndEnqueueNext(step);
            const afterFinish = Date.now();
            (0, strict_1.default)(nextReadyAt);
            (0, strict_1.default)(nextReadyAt.getTime() >= beforeFinish);
            (0, strict_1.default)(nextReadyAt.getTime() <= afterFinish);
            const finished = await getStepById(stepRow.id);
            strict_1.default.equal(finished.status, 'finished');
            strict_1.default.equal(finished.locked_by, null);
            strict_1.default.equal(finished.locked_at, null);
            strict_1.default.equal(finished.started_at, lockedStep.started_at);
            strict_1.default.equal(finished.ready_at, stepRow.ready_at);
            strict_1.default.equal(finished.step_attempts, 1);
            strict_1.default.equal(typeof finished.finished_at, 'string');
            const allSteps = await getStepsByRunId(run.id);
            strict_1.default.equal(allSteps.length, 2);
            const nextStep = allSteps.find(candidate => candidate.id !== stepRow.id);
            (0, strict_1.default)(nextStep);
            const nextAction = await getActionByIndex(automation.id, 1);
            strict_1.default.equal(nextStep.automation_run_id, run.id);
            strict_1.default.equal(nextStep.automation_action_revision_id, nextAction.revision_id);
            strict_1.default.equal(nextStep.status, 'pending');
            strict_1.default.equal(nextStep.ready_at, toDatabaseDate(nextReadyAt));
        });
        it('uses wait hours when the next action is a wait action', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const sendEmailAction = await getActionByIndex(automation.id, 1);
            strict_1.default.equal(sendEmailAction.action_type, 'send_email');
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, sendEmailAction.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const beforeFinish = Date.now();
            const nextReadyAt = await repo.finishStepAndEnqueueNext(step);
            const afterFinish = Date.now();
            (0, strict_1.default)(nextReadyAt);
            (0, strict_1.default)(nextReadyAt.getTime() >= beforeFinish + (72 * HOUR_MS));
            (0, strict_1.default)(nextReadyAt.getTime() <= afterFinish + (72 * HOUR_MS));
        });
        it('uses the fake wait hours multiplier when configured', async function () {
            repo = (0, database_automations_repository_1.createDatabaseAutomationsRepository)({
                knex,
                fakeWaitHoursMultiplier: FAKE_WAIT_HOURS_MULTIPLIER
            });
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const sendEmailAction = await getActionByIndex(automation.id, 1);
            strict_1.default.equal(sendEmailAction.action_type, 'send_email');
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, sendEmailAction.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const beforeFinish = Date.now();
            const nextReadyAt = await repo.finishStepAndEnqueueNext(step);
            const afterFinish = Date.now();
            (0, strict_1.default)(nextReadyAt);
            (0, strict_1.default)(nextReadyAt.getTime() >= beforeFinish + (72 * FAKE_WAIT_HOURS_MULTIPLIER));
            (0, strict_1.default)(nextReadyAt.getTime() <= afterFinish + (72 * FAKE_WAIT_HOURS_MULTIPLIER));
        });
        it('does not enqueue a duplicate next step when called again with the same locked step', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const firstNextReadyAt = await repo.finishStepAndEnqueueNext(step);
            const secondNextReadyAt = await repo.finishStepAndEnqueueNext(step);
            (0, strict_1.default)(firstNextReadyAt);
            strict_1.default.equal(secondNextReadyAt, null);
            const allSteps = await getStepsByRunId(run.id);
            strict_1.default.equal(allSteps.length, 2);
            const finished = await getStepById(stepRow.id);
            strict_1.default.equal(finished.status, 'finished');
            strict_1.default.equal(finished.locked_by, null);
            strict_1.default.equal(finished.locked_at, null);
        });
        it('does not finish or enqueue if the step lock has been taken by another runner', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const otherLockedAt = new Date().toISOString();
            await knex('automation_run_steps')
                .update({
                locked_by: 'other-runner-lock',
                locked_at: otherLockedAt,
                updated_at: otherLockedAt
            })
                .where('id', stepRow.id);
            const nextReadyAt = await repo.finishStepAndEnqueueNext(step);
            strict_1.default.equal(nextReadyAt, null);
            const unchanged = await getStepById(stepRow.id);
            strict_1.default.equal(unchanged.status, 'pending');
            strict_1.default.equal(unchanged.locked_by, 'other-runner-lock');
            strict_1.default.equal(unchanged.locked_at, otherLockedAt);
            strict_1.default.equal(unchanged.finished_at, null);
            const allSteps = await getStepsByRunId(run.id);
            strict_1.default.equal(allSteps.length, 1);
        });
        it('returns null and does not enqueue when there is no next action', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const lastAction = await getActionByIndex(automation.id, 3);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, lastAction.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const nextReadyAt = await repo.finishStepAndEnqueueNext(step);
            strict_1.default.equal(nextReadyAt, null);
            const finished = await getStepById(stepRow.id);
            strict_1.default.equal(finished.status, 'finished');
            strict_1.default.equal(finished.locked_by, null);
            strict_1.default.equal(finished.locked_at, null);
            const allSteps = await getStepsByRunId(run.id);
            strict_1.default.equal(allSteps.length, 1);
        });
        it('enqueues the latest revision of the next action', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const sendEmailAction = await getActionByIndex(automation.id, 1);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, sendEmailAction.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const nextActionBeforeEdit = await getActionByIndex(automation.id, 2);
            const waitAction = automation.actions.find(action => action.id === nextActionBeforeEdit.action_id);
            (0, strict_1.default)(waitAction);
            const updatedWaitAction = changeWaitHours(waitAction, 96);
            await repo.edit(automation.id, {
                status: automation.status,
                actions: automation.actions.map((action) => {
                    if (action.id === updatedWaitAction.id) {
                        return updatedWaitAction;
                    }
                    return action;
                }),
                edges: automation.edges
            });
            const updatedNextAction = await getLatestActionRevisionByActionId(updatedWaitAction.id);
            strict_1.default.equal(updatedNextAction.wait_hours, 96);
            const beforeFinish = Date.now();
            const nextReadyAt = await repo.finishStepAndEnqueueNext(step);
            const afterFinish = Date.now();
            (0, strict_1.default)(nextReadyAt);
            (0, strict_1.default)(nextReadyAt.getTime() >= beforeFinish + (96 * HOUR_MS));
            (0, strict_1.default)(nextReadyAt.getTime() <= afterFinish + (96 * HOUR_MS));
            const allSteps = await getStepsByRunId(run.id);
            strict_1.default.equal(allSteps.length, 2);
            const nextStep = allSteps.find(candidate => candidate.id !== stepRow.id);
            (0, strict_1.default)(nextStep);
            strict_1.default.equal(nextStep.automation_action_revision_id, updatedNextAction.revision_id);
            strict_1.default.equal(nextStep.ready_at, toDatabaseDate(nextReadyAt));
        });
    });
    describe('markStepTerminal', function () {
        it('marks a locked step with a terminal status and clears the lock', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const lockedStep = await getStepById(step.id);
            strict_1.default.equal(typeof lockedStep.started_at, 'string');
            const beforeMark = Date.now();
            const didMark = await repo.markStepTerminal(step, 'member unsubscribed');
            const afterMark = Date.now();
            strict_1.default.equal(didMark, true);
            const marked = await getStepById(step.id);
            strict_1.default.equal(marked.status, 'member unsubscribed');
            strict_1.default.equal(marked.locked_by, null);
            strict_1.default.equal(marked.locked_at, null);
            strict_1.default.equal(marked.started_at, lockedStep.started_at);
            strict_1.default.equal(marked.ready_at, lockedStep.ready_at);
            strict_1.default.equal(marked.step_attempts, 1);
            strict_1.default.equal((await getStepsByRunId(run.id)).length, 1);
            const markedFinishedAt = marked.finished_at;
            (0, strict_1.default)(typeof markedFinishedAt === 'string');
            (0, strict_1.default)(markedFinishedAt >= toDatabaseDate(new Date(beforeMark - 1000)));
            (0, strict_1.default)(markedFinishedAt <= toDatabaseDate(new Date(afterMark)));
        });
        it('does not overwrite a step that is no longer pending', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const finishedAt = new Date(Date.now() - 500).toISOString();
            await knex('automation_run_steps')
                .update({
                status: 'finished',
                finished_at: finishedAt,
                locked_at: null
            })
                .where('id', step.id);
            const didMark = await repo.markStepTerminal(step, 'member unsubscribed');
            strict_1.default.equal(didMark, false);
            const unchanged = await getStepById(step.id);
            strict_1.default.equal(unchanged.status, 'finished');
            strict_1.default.equal(unchanged.finished_at, finishedAt);
            strict_1.default.equal(unchanged.locked_by, step.locked_by);
            strict_1.default.equal(unchanged.locked_at, null);
        });
        it('does not mark a step terminal if the step lock has been taken by another runner', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const otherLockedAt = new Date().toISOString();
            await knex('automation_run_steps')
                .update({
                locked_by: 'other-runner-lock',
                locked_at: otherLockedAt,
                updated_at: otherLockedAt
            })
                .where('id', stepRow.id);
            const beforeMark = await getStepById(stepRow.id);
            const didMark = await repo.markStepTerminal(step, 'member unsubscribed');
            strict_1.default.equal(didMark, false);
            const unchanged = await getStepById(stepRow.id);
            strict_1.default.deepEqual(unchanged, beforeMark);
        });
    });
    describe('retryStep', function () {
        it('reschedules a locked step for retry and clears the lock', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const retryAt = new Date(Date.now() + 60 * 1000);
            const beforeRetry = Date.now();
            const didRetry = await repo.retryStep(step, retryAt);
            const afterRetry = Date.now();
            strict_1.default.equal(didRetry, true);
            const retried = await getStepById(step.id);
            strict_1.default.equal(retried.status, 'pending');
            strict_1.default.equal(retried.ready_at, toDatabaseDate(retryAt));
            strict_1.default.equal(retried.started_at, null);
            strict_1.default.equal(retried.finished_at, null);
            strict_1.default.equal(retried.locked_by, null);
            strict_1.default.equal(retried.locked_at, null);
            strict_1.default.equal(retried.step_attempts, 1);
            const retriedUpdatedAt = retried.updated_at;
            (0, strict_1.default)(typeof retriedUpdatedAt === 'string');
            (0, strict_1.default)(retriedUpdatedAt >= toDatabaseDate(new Date(beforeRetry - 1000)));
            (0, strict_1.default)(retriedUpdatedAt <= toDatabaseDate(new Date(afterRetry)));
        });
        it('does not retry a locked step that is no longer pending', async function () {
            const automation = await getAutomationBySlug('member-welcome-email-free');
            const action = await getActionByIndex(automation.id, 0);
            const run = await insertRun(automation.id);
            const stepRow = await insertStep(run.id, action.revision_id, {
                ready_at: new Date(Date.now() - 1000).toISOString()
            });
            const step = await getLockedStep(stepRow.id);
            const finishedAt = new Date(Date.now() - 500).toISOString();
            await knex('automation_run_steps')
                .update({
                status: 'finished',
                finished_at: finishedAt
            })
                .where('id', step.id);
            const beforeRetry = await getStepById(step.id);
            const didRetry = await repo.retryStep(step, new Date(Date.now() + 1000));
            strict_1.default.equal(didRetry, false);
            const unchanged = await getStepById(step.id);
            strict_1.default.deepEqual(unchanged, beforeRetry);
        });
    });
});
