/* eslint-disable no-magic-numbers */
const { Discovery } = require('../lib/index');

async function main() {
    const discovery = new Discovery();

    discovery.on('new-device', async (e) => {
        console.log(e);
        e.setAuthToken('oqTrK0kUZGDzuOjzXqH4yge81l3QaDd4');
        e.allowColorBrightness = false;
        console.log(await e.getState());
        await e.setPower(true);
        // await e.set({ color: 'green' });
    });
    discovery.start();
}

// eslint-disable-next-line more/no-then
main().then(() => {
    setTimeout(() => process.exit(0), 15000);
});
