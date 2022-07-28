/* eslint-disable no-magic-numbers */
const { NanoleafDriver } = require('../lib');

async function main() {
    const nano = new NanoleafDriver({ devices : {
        '13:F6:11:72:E2:38' : {
            deviceName : 'Shapes 86B0',
            location   : 'http://192.168.4.159:16021',
            authToken  : '11tnYUmDjr92hQssdrA16dXNqKXObEPE'
        }
    },
    callback : (driver) => {
        console.log(driver.devices);
    } });
}

// eslint-disable-next-line more/no-then
main().then(() => {
    setTimeout(() => {
        process.exit(0);
    }, 17000);
});
