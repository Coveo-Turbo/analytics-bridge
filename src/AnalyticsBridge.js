const Coveo = require('coveo-search-ui');

module.exports = function AnalyticsBridge(action = event => event, searchInterface, useLegacy) {
    searchInterface = searchInterface || document.querySelector('.CoveoSearchInterface');

    if (useLegacy) {
        return bridgeAnalyticsMetadataLegacy(searchInterface, action);
    }

    return bridgeAnalyticsMetadata(searchInterface, action);    
}

function bridgeAnalyticsMetadata(searchInterface, action = item => item) {
    // Every time Coveo launches an analytics event, this event is triggered.
    Coveo.Dom.useNativeJavaScriptEvents = true;

    Coveo.$$(searchInterface).on("analyticsEventReady", function(event) {
        const analyticsData = event.detail.coveoAnalyticsEventData;

        // Coveo assigns a unique ID to each user, use this to link your analytics to Coveo analytics to verify and track user activity.
        const visitorId = analyticsData.clientId;

        // The search term passed to the search box.
        let searchTerm = analyticsData.queryText;

        // The facets are used for the advanced query, if you track this, then you will use this field. Omit if facets aren't needed.
        let facetValues = analyticsData.facetState;

        // The total number of results regardless of pagination.
        let results = analyticsData.numberOfResults;

        // Page number is a custom data sent when it's other than 1.
        let pageNumber = 1;

        // Every action is logged. Changing the text in the searchbox (searchboxSubmit), changing the selection of a facet (facetSelect|facetDeselect), changing sorting, changing page (pagerNumber)... all trigger events. 
        // The cause can be used to add context or to ignore certain analytics events depending how granular you want to log.
        const actionCause = analyticsData.actionCause;

        const queryController = event.target.CoveoQueryController;

        // const searchUid = analyticsData.searchQueryUid;
        const searchUid = queryController.lastQueryResults.searchUid;

        // Based on pagination settings, the number of results per page.
        // const resultsPerPage = analyticsData.resultsPerPage;
        const resultsPerPage = queryController.lastQuery.numberOfResults;

        // If the action cause is page number, some information won't be available and needs to be retrieved from state or initialized components.
        if ("pagerNumber" === actionCause) {
            searchTerm = queryController.lastQuery.q;
            pageNumber = analyticsData.customData.pagerNumber;
            results = queryController.lastQueryResults.totalCount;
            
            facetValues = Object.entries(Coveo.state(searchInterface).attributes)
                .filter(item => item[0].lastIndexOf("f:", 0) === 0)
                .flatMap(
                    entry => entry[1].map(
                        item => {
                            const fieldName = entry[0].substring(2);
                            return {
                                "field": fieldName,
                                "id": fieldName,
                                "value": item
                            };
                        }
                    )
                );
        }

        // If the action cause is the interface Load, we want to grab the page number returned at this moment.
        if (["interfaceLoad", "searchFromLink"].includes(actionCause)) {
            pageNumber = analyticsData.pageNumber + 1; // page number here is bugged -- if you refresh at page 1, it returns 0.
        }

        const startIndex = queryController.usageAnalytics.bindings.queryStateModel.attributes.first;
        const sort = queryController.lastQueryBuilder.sortCriteria;

        return action({
            visitorId,
            searchTerm,
            pageNumber,
            results,
            resultsPerPage,
            facetValues,
            startIndex,
            sort,
            searchUid,
            searchEventTrigger: actionCause,
        });
    });
}

/**
 * Reconstructs the analytics events when used in a system that has JQuery and where the Coveo.Dom.useNativeJavaScriptEvents = true; doesn't work.
 */
function bridgeAnalyticsMetadataLegacy(searchInterface, action = item => item) {
    Coveo.Dom.useNativeJavaScriptEvents = true;

    Coveo.$$(searchInterface).on("analyticsEventReady", function(event) {
        const queryController = event.target.CoveoQueryController;
        const lastQuery = queryController.lastQuery;
        const searchTerm = lastQuery.q;
        const sort = lastQuery.sortCriteria;
        const searchEventTrigger = event.detail.coveoAnalyticsEventData.actionCause;

        const startIndex = queryController.usageAnalytics.bindings.queryStateModel.attributes.first;
        const resultsPerPage = lastQuery.numberOfResults;
        const pageNumber = startIndex / resultsPerPage + 1;

        const lastQueryBuilder = queryController.lastQueryBuilder;
        const facetRequests = lastQueryBuilder.facetRequests;
        const facetValues = facetRequests.flatMap(function(facetRequestOptions) {
            return facetRequestOptions.currentValues
                .filter(facetValue => 'selected' === facetValue.state)
                .map(facetValue => {
                    return {
                        fieldName: facetRequestOptions.field,
                        facetId: facetRequestOptions.facetId,
                        value: facetValue.value,
                    };
                });
        });

        const searchUid = lastQueryBuilder.searchUid;
        const visitorId = event.detail.coveoAnalyticsEventData.clientId;
        const results = queryController.lastQueryResults.totalCount;

        return action({
            visitorId,
            searchTerm,
            pageNumber,
            results,
            resultsPerPage,
            facetValues,
            startIndex,
            sort,
            searchUid,
            searchEventTrigger,
        });
    });
}