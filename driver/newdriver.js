/* eslint-disable no-magic-numbers */
const { Discovery } = require('../lib/index');

async function main() {
    const discovery = new Discovery();

    discovery.on('new-device', async (e) => {
        console.log(e);
        // e.setAuthToken('11tnYUmDjr92hQssdrA16dXNqKXObEPE');
        e.allowColorBrightness = false;
        console.log(await e.getState());
        await e.set({ color: 'blue' });
    });
    discovery.start();
}

// eslint-disable-next-line more/no-then
main().then(() => {
    setTimeout(() => process.exit(0), 15000);
});
