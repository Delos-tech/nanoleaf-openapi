const { Discovery } = require('../lib/index');

async function main() {
    const discovery = new Discovery();

    discovery.on('new-device', async (e) => {
        console.log(e);
        e.setAuthToken('11tnYUmDjr92hQssdrA16dXNqKXObEPE');
        console.log(await e.getState());
        await e.identify();
    });
    discovery.start();
}

// eslint-disable-next-line more/no-then
main().then();
