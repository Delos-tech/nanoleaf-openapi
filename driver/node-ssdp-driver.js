const ssdpClient = require('node-ssdp').Client;

async function main() {
    const client = new ssdpClient();

    client.on('response', (headers, statusCode, rinfo) => {
        if (headers.ST.includes('nanoleaf')) {
            console.log('Got a response to an m-search.', headers, statusCode, rinfo);
        }
    });
    client.search('ssdp:all');
}

main().then(() => {
    setTimeout(() => {
        process.exit(0);
    }, 61000);
});
