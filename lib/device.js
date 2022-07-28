const Emitter = require('events');
const objectPath = require('object-path');
const debug = require('debug')('nanoleaf').extend('device');
const axios = require('axios').default;

class NotAuthorized extends Error {
    constructor(message, macAddress) {
        super(message);
        this.macAddress = macAddress;
    }
}

class AuroraDevice extends Emitter {
    constructor(macAddress, deviceName, location) {
        super();
        this.macAddress = macAddress;
        this.deviceName = deviceName;
        this.location = location;
    }

    async validateAuthToken() {
        if (!this.authToken) {
            debug('no auth token set: calling createUser()');
            try {
                this.setAuthToken(await this.createUser());
            } catch (ex) {
                debug('createUser failed with %j', ex);
                throw new NotAuthorized(
                    'no auth token set for %s: press the on-off button for 5-7 seconds',
                    this.macAddress
                );
            }
        }
    }

    setAuthToken(authToken) {
        debug('setting authToken for %s to %s', this.macAddress, authToken);
        this.authToken = authToken;
        this.emit('authtoken-generated', this);
    }

    getAuthToken() {
        return this.authToken;
    }

    async getState() {
        await this.validateAuthToken();
        const response = await axios.get(`${this.location}/api/v1/${this.authToken}`);

        this.state = response.data;

        return this.state;
    }

    async identify() {
        await this.validateAuthToken();

        return axios.put(`${this.location}/api/v1/${this.authToken}/identify`);
    }

    getValueProp(options, name, secondaryAttribute) {
        const value = objectPath.get(options, name);

        if (value) {
            const data = { value };

            if (secondaryAttribute) {
                data[secondaryAttribute] = objectPath.get(options, secondaryAttribute);
            }

            return data;
        }

        return undefined;
    }

    async set(options) {
        const data = {
            brightness : this.getValueProp(options, 'brightness', 'duration'),
            hue        : this.getValueProp(options, 'hue'),
            saturation : this.getValueProp(options, 'saturation'),
            ct         : this.getValueProp(options, 'ct'),
            on         : this.getValueProp(options, 'on')
        };


        return axios.put(
            `${this.location}/api/v1/${this.authToken}/state`,
            data
        );
    }

    async createUser() {
        if (this.authToken) {
            debug('createUser called when auth token exists; aborting');

            return this.authToken;
        }

        const response = await axios.post(`${this.location}/api/v1/new`);

        debug('%j', response.data);

        return objectPath.get(response, 'data.auth_token');
    }

    async deleteUser() {
        if (!this.authToken) {
            debug('delete user called when no auth token exists; aborting');

            return;
        }

        const response = await axios.delete(`${this.location}/api/v1/${this.authToken}`);

        debug('%j', response.data);
    }
}

module.exports = AuroraDevice;
