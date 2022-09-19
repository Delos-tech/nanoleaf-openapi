const Emitter = require('events');
const util = require('util');
const objectPath = require('object-path');
const debug = require('debug')('nanoleaf').extend('device');
const axios = require('axios').default;
const parse = require('parse-color');

class NotAuthorized extends Error {
    constructor(message, macAddress) {
        super(message);
        this.macAddress = macAddress;
    }
}

class AuroraDevice extends Emitter {
    #authToken;

    constructor(macAddress, deviceName, location, allowColorBrightness = true) {
        super();
        this.macAddress = macAddress;
        this.deviceName = deviceName;
        this.location = location;
        this.allowColorBrightness = allowColorBrightness;
    }

    async validateAuthToken() {
        if (!this.#authToken) {
            debug('no auth token set: calling createUser()');
            try {
                this.setAuthToken(await this.createUser());
                this.emit('user-created', this);
            } catch (ex) {
                debug('createUser failed with %j', ex);
                throw new NotAuthorized(util.format(
                    'no auth token set for %s (%s): press the on-off button for 5-7 seconds',
                    this.macAddress,
                    this.deviceName
                ));
            }
        }
    }

    setAuthToken(authToken) {
        debug('setting authToken for %s to %s', this.macAddress, authToken);
        this.#authToken = authToken;
        this.emit('authtoken-generated', this);
    }

    getAuthToken() {
        return this.#authToken;
    }

    setAllowColorBrightness(value) {
        this.allowColorBrightness = !(value === false);
    }

    getAllowColorBrightness() {
        return this.allowColorBrightness;
    }

    async getState() {
        await this.validateAuthToken();
        const response = await axios.get(`${this.location}/api/v1/${this.#authToken}`);

        this.state = response.data;

        return this.state;
    }

    async identify() {
        await this.validateAuthToken();

        return axios.put(`${this.location}/api/v1/${this.#authToken}/identify`);
    }

    getValueProp(options, name, secondaryAttribute) {
        const value = objectPath.get(options, name);

        if (value !== undefined) {
            const data = { value };

            if (secondaryAttribute) {
                data[secondaryAttribute] = objectPath.get(options, secondaryAttribute);
            }

            return data;
        }

        return undefined;
    }

    async setBrightness(brightness, duration) {
        return this.set({ brightness, duration });
    }

    async setHue(hue) {
        return this.set({ hue });
    }

    async setSaturation(saturation) {
        return this.set({ saturation });
    }

    async setColorTemperature(colorTemperature) {
        return this.set({ ct: colorTemperature });
    }

    async setPower(power) {
        return this.set({ on: !!power });
    }

    async setColor(color) {
        return this.set({ color });
    }

    async set(options) {
        const data = {
            brightness : this.getValueProp(options, 'brightness', 'duration'),
            hue        : this.getValueProp(options, 'hue', 'duration'),
            sat        : this.getValueProp(options, 'saturation', 'duration'),
            ct         : this.getValueProp(options, 'ct', 'duration'),
            on         : this.getValueProp(options, 'on')
        };

        if (options.hasOwnProperty('color')) {
            const { hsv } = parse(options.color);

            if (!data.hue) {
                data.hue = hsv[0];
            }

            if (!data.sat) {
                data.sat = hsv[1];
            }

            if (!data.brightness && this.allowColorBrightness) {
                data.brightness = hsv[2];
            }
        }

        debug('setting device state for %s: %j', this.location, data);

        for (const [ key, value ] of Object.entries(data)) {
            if (value) {
                debug('decomposing call for %s:%j', key, value);
                // eslint-disable-next-line more/no-then
                axios.put(
                    `${this.location}/api/v1/${this.#authToken}/state`,
                    { [key]: { ...value } }
                ).then(() => {})
                    .catch(ex => {
                        debug('error in PUT: %j', ex);
                    });
            }
        }
    }

    async createUser() {
        if (this.#authToken) {
            debug('createUser called when auth token exists; aborting');

            return this.getAuthToken();
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

        const response = await axios.delete(`${this.location}/api/v1/${this.#authToken}`);

        debug('%j', response.data);
    }
}

module.exports = AuroraDevice;
