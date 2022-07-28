/* eslint-disable no-magic-numbers */
const debug = require('debug')('nanoleaf');
const logger = require('@delos-tech/nva-logger').getLogger('NanoleafDriver');
const objectPath = require('object-path');
const Client = require('node-ssdp').Client;
const axios = require('axios').create();

const debugDiscovery = debug.extend('discovery');
const debugCreateuser = debug.extend('createUser');

class NanoleafException extends Error {}

class LinkButtonNotPressedException extends NanoleafException {
    constructor(message, ip) {
        super(message);
        this.ip = ip;
    }
}

class NanoleafDriver {
    constructor({
        devices = {},
        callback
    }) {
        this.devices = this._validateDevices(devices);
        // used by discoverDevice
        this.scanningDeviceMacAddresses = [];
        this.callback = callback;
        this.runDiscovery = this.runDiscovery.bind(this);
        this.discoverDevice = this.discoverDevice.bind(this);

        this.runDiscovery(callback);
    }

    _validateDevices(devices) {
        const newDevices = {};

        for (const [ key, value ] of Object.entries(devices)) {
            let error = false;

            if (objectPath.get(value, 'authToken')) {
                newDevices[key] = value;
            } else {
                error = true;
            }

            if (error) {
                debugDiscovery('pruning invalid device data %s %j', key, value);
            }
        }


        return newDevices;
    }

    async discoverDevice(headers, callback) {
        // noinspection SpellCheckingInspection
        const macAddress = objectPath.get(headers, 'NL-DEVICEID');
        // noinspection SpellCheckingInspection
        const deviceName = objectPath.get(headers, 'NL-DEVICENAME');
        const location = objectPath.get(headers, 'LOCATION');

        if (!this.scanningDeviceMacAddresses.includes(macAddress)) {
            // we only want to inquire about the device ONCE. We get
            // a series of mDNS responses, so we're throttling them here.
            this.scanningDeviceMacAddresses.push(macAddress);
            setTimeout(
                () => {
                    this.scanningDeviceMacAddresses =
                  this.scanningDeviceMacAddresses.filter((e) => e !== macAddress);
                },
                5000
            );
            debugDiscovery('found a new device at %s (%s, %s)', macAddress, deviceName, location);
            try {
                const deviceData = await axios.get(`${location}/api/v1/${this.devices[macAddress].authToken}`);

                debugDiscovery('deviceData %j', deviceData.data);
                // override the existing device data with the new name and/or location,
                // just in case they've changed.

                this.devices[macAddress] = {
                    ...this.devices[macAddress],
                    location,
                    deviceName
                };

                // Create the configuration.
            } catch (ex) {
                if (ex.code === 'ERR_BAD_REQUEST') {
                    try {
                        const authToken = await this.createUser(location);
                        // we have an auth token; we know it's good.
                        // create the configuration.

                        this.devices[macAddress] = {
                            deviceName,
                            location,
                            authToken
                        };
                        if (callback) {
                            // eslint-disable-next-line callback-return
                            callback(this);
                        }
                    } catch (err) {
                        logger.error(err);
                    }
                }
            }
        }

        // debugDiscovery('Scanned device: %s %s %s', macAddress, deviceName, location);
        // try {
        //     const response = await axios.get(`${location}/api/v1/`);
        //
        //     debugDiscovery('%j', response);
        // } catch (ex) {
        //     if (ex.code === 'ERR_BAD_REQUEST') {
        //         try {
        //             const authToken = await this.createUser(location);
        //         } catch (err) {
        //             logger.error(`Please press the on/off button for 5-7 seconds on the device at ${location}`);
        //         }
        //     } else {
        //         throw ex;
        //     }
        // }
    }

    async runDiscovery(callback) {
        debugDiscovery('running discovery');
        try {
            this.ssdpClient = new Client();
            this.ssdpClient.on('response', async (headers) => {
                // we only care about devices that tell us they're nanoleaf devices.
                if (headers.ST.includes('nanoleaf')) {
                    await this.discoverDevice(headers, callback);
                }
            });
            this.ssdpClient.search('ssdp:all');
        } catch (ex) {
            logger.error(ex);
        }

        // if we have devices, we want to rescan every five minutes. If not, we
        // poll every six seconds.
        // eslint-disable-next-line no-magic-numbers
        const timeoutTime = Object.keys(this.devices).length === 0 ? 6000 : 60000 * 5;

        setTimeout(
            () => {
                this.ssdpClient.stop();
                this.runDiscovery(callback);
            },
            timeoutTime
        );
    }

    async createUser(location) {
        try {
            const response = await axios.post(`${location}/api/v1/new`);

            debugCreateuser('%j', response.data);

            return objectPath.get(response, 'data.auth_token');
        } catch (ex) {
            throw new LinkButtonNotPressedException(ex.message, location);
        }
    }
}

module.exports = { NanoleafDriver };
