const Emitter = require('events');
const objectPath = require('object-path');
const debug = require('debug')('nanoleaf').extend('discovery');
const Client = require('node-ssdp').Client;
const AuroraDevice = require('./device');


class Discovery extends Emitter {
    constructor() {
        super();
        this.devices = {};
        this.start = this.start.bind(this);
        this.runDiscovery = this.runDiscovery.bind(this);
        this.discoverDevice = this.discoverDevice.bind(this);
    }

    start() {
        // eslint-disable-next-line more/no-then
        this.runDiscovery();
    }

    async discoverDevice(headers) {
        const discovery = this;

        debug('discovered! %j', headers);
        // noinspection SpellCheckingInspection
        const macAddress = objectPath.get(headers, 'NL-DEVICEID');
        // noinspection SpellCheckingInspection
        const deviceName = objectPath.get(headers, 'NL-DEVICENAME');
        const location = objectPath.get(headers, 'LOCATION');

        let device = this.devices[macAddress];

        if (!device) {
            device = new AuroraDevice(macAddress, deviceName, location);
            device.on('authtoken-generated', (thing) => {
                discovery.emit('authtoken-generated', thing);
            });
            device.on('user-created', (thing) => {
                discovery.emit('user-created', thing);
            });
            this.emit('new-device', device);
            this.devices[macAddress] = device;
        } else {
            let changed = false;

            if (objectPath.get(this.devices[macAddress], 'location') !== location) {
                debug(
                    'new location for %s: from %s to %s',
                    macAddress,
                    this.devices[macAddress].location,
                    location
                );
                changed = true;
                device.location = location;
            }

            if (objectPath.get(this.devices[macAddress], 'deviceName') !== deviceName) {
                debug(
                    'new deviceName for %s: from %s to %s',
                    macAddress,
                    this.devices[macAddress].deviceName,
                    deviceName
                );

                changed = true;
                device.deviceName = deviceName;
            }

            if (changed) {
                // need to update object reference
                this.emit('changed-device', device);
            }
        }
    }

    runDiscovery() {
        const client = new Client({});

        client.on('response', async (headers) => {
            // we only care about devices that tell us they're nanoleaf devices.
            if (headers.ST.includes('nanoleaf')) {
                // eslint-disable-next-line more/no-then
                this.discoverDevice(headers)
                    .then(() => debug('discovery finished'));
            }
        });
        client.search('ssdp:all');

        client.start();

        // eslint-disable-next-line no-magic-numbers
        const timeoutTime = Object.keys(this.devices).length === 0 ? 6000 : 60000 * 5;

        debug('setting next discovery timeout for %d ms', timeoutTime);

        setTimeout(() => {
            client.stop();
            this.runDiscovery();
        }, timeoutTime);
    }
}

module.exports = Discovery;
