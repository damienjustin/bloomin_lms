"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const strict_1 = __importDefault(require("node:assert/strict"));
const email_template_1 = require("../../../../../core/server/data/importer/email-template");
describe('Importer email template', function () {
    const siteUrl = new URL('http://example.com');
    const postsUrl = new URL('http://example.com/ghost/#/posts');
    const emailRecipient = 'recipient@example.com';
    it('renders the success email when there are no errors', function () {
        const html = (0, email_template_1.emailTemplate)({ result: { data: {} }, siteUrl, postsUrl, emailRecipient });
        strict_1.default.match(html, /Your content import has finished successfully/);
        strict_1.default.doesNotMatch(html, /Import unsuccessful/);
    });
    it('lists every error message in the failure email', function () {
        const result = {
            data: {
                errors: [
                    new Error('Value in [posts.title] exceeds maximum length of 2000 characters.'),
                    new Error('Value in [users.bio] exceeds maximum length of 250 characters.')
                ]
            }
        };
        const html = (0, email_template_1.emailTemplate)({ result, siteUrl, postsUrl, emailRecipient });
        strict_1.default.match(html, /Import unsuccessful/);
        strict_1.default.match(html, /Value in \[posts\.title\] exceeds maximum length of 2000 characters\./);
        strict_1.default.match(html, /Value in \[users\.bio\] exceeds maximum length of 250 characters\./);
        strict_1.default.doesNotMatch(html, /check the server logs/);
    });
    it('caps the listed errors at 5 and points to the server logs for the rest', function () {
        const result = {
            data: {
                errors: Array.from({ length: 8 }, (_, i) => new Error(`Import error number ${i + 1}`))
            }
        };
        const html = (0, email_template_1.emailTemplate)({ result, siteUrl, postsUrl, emailRecipient });
        strict_1.default.match(html, /Import error number 1/);
        strict_1.default.match(html, /Import error number 5/);
        strict_1.default.doesNotMatch(html, /Import error number 6/);
        strict_1.default.match(html, /and 3 more &mdash; check the server logs for the full list/);
    });
    it('escapes HTML in error messages', function () {
        const result = {
            data: {
                errors: [new Error('Invalid value <script>alert("xss")</script> & more')]
            }
        };
        const html = (0, email_template_1.emailTemplate)({ result, siteUrl, postsUrl, emailRecipient });
        strict_1.default.doesNotMatch(html, /<script>alert/);
        strict_1.default.match(html, /Invalid value &lt;script&gt;alert\(&quot;xss&quot;\)&lt;\/script&gt; &amp; more/);
    });
    it('falls back to a generic label for errors without a message', function () {
        const result = {
            data: {
                errors: [{}]
            }
        };
        const html = (0, email_template_1.emailTemplate)({ result, siteUrl, postsUrl, emailRecipient });
        strict_1.default.match(html, /Import unsuccessful/);
        strict_1.default.match(html, /Unknown error/);
    });
});
