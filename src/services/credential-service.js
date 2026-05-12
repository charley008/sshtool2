"use strict";

class CredentialService {
    static init(context) {
        this.context = context;
        this.secrets = context && context.secrets ? context.secrets : null;
    }

    static isReady() {
        return !!this.secrets;
    }

    static key(scope, id, field) {
        return `sshtools:${scope}:${id}:${field}`;
    }

    static async get(scope, id, field) {
        if (!this.secrets || !scope || !id || !field) {
            return undefined;
        }
        return this.secrets.get(this.key(scope, id, field));
    }

    static async store(scope, id, field, value) {
        if (!this.secrets || !scope || !id || !field) {
            return false;
        }
        const key = this.key(scope, id, field);
        if (value === undefined || value === null || value === "") {
            await this.secrets.delete(key);
        } else {
            await this.secrets.store(key, String(value));
        }
        return true;
    }

    static async delete(scope, id, field) {
        if (!this.secrets || !scope || !id || !field) {
            return false;
        }
        await this.secrets.delete(this.key(scope, id, field));
        return true;
    }

    static async deleteFields(scope, id, fields) {
        if (!Array.isArray(fields)) {
            return false;
        }
        for (const field of fields) {
            await this.delete(scope, id, field);
        }
        return true;
    }
}

CredentialService.context = null;
CredentialService.secrets = null;

exports.CredentialService = CredentialService;
