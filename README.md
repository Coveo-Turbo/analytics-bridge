# AnalyticsBridge

Disclaimer: This component was built by the community at large and is not an official Coveo JSUI Component. Use this component at your own risk.

## Getting Started

1. Install the component into your project.

```
npm i @coveops/analytics-bridge
```

2. Use the Component or extend it

Typescript:

```javascript
import { AnalyticsBridge, IAnalyticsBridgeOptions } from '@coveops/analytics-bridge';
```

Javascript

```javascript
const AnalyticsBridge = require('@coveops/analytics-bridge').AnalyticsBridge;
```

3. You can also expose the component alongside other components being built in your project.

```javascript
export * as AnalyticsBridge from '@coveops/analytics-bridge';

```

4. Or for quick testing, you can add the script from unpkg

```html
<script src="https://unpkg.com/@coveops/analytics-bridge@latest/dist/index.min.js"></script>
```

> Disclaimer: Unpkg should be used for testing but not for production.

5. Include the component in your template as follows:

Declare the AnalyticsBridge once the appropriate event pertaining to the Coveo JSUI library's loaded state has been fired before calling the Coveo initialization.

The first argument is a function that will recieve an event with the following schema and can relay it to a third-party system like Adobe Analytics.

```json
{
    "visitorId": "34d38382-bb95-5b1b-4304-5e84abbaacd8",
    "searchTerm": "search",
    "pageNumber": 1,
    "results": 1446,
    "resultsPerPage": 10,
    "facetValues": [
        {
            "field": "@objecttype",
            "id": "@objecttype",
            "title": "Type",
            "facetType": "specific",
            "value": "Message",
            "valuePosition": 1,
            "displayValue": "Message",
            "state": "selected"
        }
    ],
    "startIndex": 0,
    "sort": "date descending",
    "searchUid": "8debb900-752e-4d49-82f9-b3edcd01c4c7",
    "searchEventTrigger": "searchFromLink"
}
```

The following code snippet gives an example usage of the function that will print to console.

```html
<script>
    function forwardToAnalyticsSystem(event) {
        //This function bridges the event data to your third-party system.
        console.log("Event to be forwarded!")
        console.log(event)
    }
    document.addEventListener('DOMContentLoaded', function () {
        const searchInterface = document.getElementById('search');

        //Important to call this code before Coveo initializes.
        Coveo.AnalyticsBridge(
            forwardToAnalyticsSystem,
            searchInterface
        );
    })
</script>
```

If you're working in a system with an older version of JQuery and the Javascript Events are overridden by JQuery events, you can pass `true` as the last argument to use the legacy version. If in this case it is being used with the Hosted Search Page, the declaration should be called within the event listener assigned to the Hosted Search Page before Coveo initializes.

```html
<script>
    function forwardToAnalyticsSystem(event) {
        //This function bridges the event data to your third-party system.
        console.log("Event to be forwarded!")
        console.log(event)
    }
    document.addEventListener("CoveoScriptsLoaded", function() {
        document.addEventListener('DOMContentLoaded', function () {
            const searchInterface = document.getElementById('search');

            //Important to call this code before Coveo initializes.
            Coveo.AnalyticsBridge(
                forwardToAnalyticsSystem,
                searchInterface,
                true
            );
        })
    });
</script>
```

## Contribute

1. Clone the project
2. Copy `.env.dist` to `.env` and update the COVEO_ORG_ID and COVEO_TOKEN fields in the `.env` file to use your Coveo credentials and SERVER_PORT to configure the port of the sandbox - it will use 8080 by default.
3. Build the code base: `npm run build`
4. Serve the sandbox for live development `npm run serve`