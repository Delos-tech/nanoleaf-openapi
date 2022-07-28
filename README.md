# nanoleaf-openapi
API to interact with Nanoleaf devices using the Aurora API.

## Example usage

Everything starts with the `Discovery` class:

```javascript
const { Discovery } = require('@delos-tech/nanoleaf-openapi');

/// ...
const discovery = new Discovery();

discovery.on('new-device', async (dev) => {
    // dev is an instance of AuroraDevice.
    // dev.setAuthToken('11tnYUmDjr92hQssdrA16dXNqKXObEPE');
    console.log(await dev.getState());
    await dev.identify();
});
discovery.start();
```

The event receiver for `new-device` is an `AuroraDevice`.

To interact with an AuroraDevice, you must have a valid  
authorization token; you can get one by using
`createUser()`, after pressing the on/off button for 5-7 seconds.
Alternatively, any action undertaken by the API will create the 
authorization token automatically if the initialization mode is
active; the `AuroraDevice` will emit an `authtoken-generated` event 
in that case, with the `AuroraDevice` as the argument.
(You can query the `AuroraDevice` and get the authorization token 
from it.)

Note that the API _will not save_ the authorization token for you. 
That is the responsibility of the API user.

If `createUser()` is called without the initialization state being
set properly, an exception will be thrown. 
