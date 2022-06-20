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

    document.addEventListener("analyticsEventReady", function (event) {
        const analyticsData = event.detail.coveoAnalyticsEventData;
        const state = Coveo.state(searchInterface);
        const queryController = event.target.CoveoQueryController;

        // Coveo assigns a unique ID to each user, use this to link your analytics to Coveo analytics to verify and track user activity.
        const visitorId = analyticsData.clientId;

        // The search term passed to the search box.
        let searchTerm = (analyticsData.queryText === undefined)
            ? queryController.lastQuery.q
            : analyticsData.queryText;

        // The facets are used for the advanced query, if you track this, then you will use this field. Omit if facets aren't needed.
        let facetValues = analyticsData.facetState;

        // The total number of results regardless of pagination.
        let results = queryController.lastQueryResults.totalCount;

        // Page number is a custom data sent when it's other than 1.
        let pageNumber = 1;

        // Every action is logged. Changing the text in the searchbox (searchboxSubmit), changing the selection of a facet (facetSelect|facetDeselect), changing sorting, changing page (pagerNumber)... all trigger events. 
        // The cause can be used to add context or to ignore certain analytics events depending how granular you want to log.
        const actionCause = analyticsData.actionCause;

        // const searchUid = analyticsData.searchQueryUid;
        const searchUid = queryController.lastQueryResults.searchUid;

        // Based on pagination settings, the number of results per page.
        // const resultsPerPage = analyticsData.resultsPerPage;
        const resultsPerPage = queryController.lastQuery.numberOfResults;

        const url = window.location.origin + window.location.pathname;

        const customData = analyticsData.customData || {};

        const tab = queryController.lastQuery.tab;

        const view = state.attributes.layout || '';

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

        const startIndex = state.attributes.first;

        const sort = queryController.lastQuery.sortCriteria;

        const selectedFacets = Object
            .keys(state.attributes)
            .filter(key => key.startsWith('f:') && !!state.attributes[key].length)
            .map(key => {
                const field = key.replace('f:', '');
                const element = searchInterface.querySelector(`[data-field="${field}"]`);
                const title = element.dataset['title'];
                const values = state.attributes[key];
                return {
                    field,
                    title,
                    values
                }
            });

        const actionPayload = {
            visitorId,
            searchTerm,
            pageNumber,
            results,
            resultsPerPage,
            facetValues,
            selectedFacets,
            startIndex,
            sort,
            searchUid,
            searchEventTrigger: actionCause,
            customData,
            tab,
            view,
            url
        };

        if (event.detail.event === 'CoveoClickEvent') {
            Object.assign(actionPayload, {
                resultTitle: analyticsData.documentTitle || analyticsData.documentUrl,
                resultUrl: analyticsData.documentUrl,
                resultPosition: analyticsData.documentPosition
            });
            const resultPagePosition = queryController.lastQueryResults.results.findIndex((element) => {
                return element.uri === analyticsData.documentUri;
            });
            if (resultPagePosition >= 0) {
                actionPayload.resultPagePosition = resultPagePosition + 1;
            }
        }

        return action(actionPayload);
    });
}

/**
 * Reconstructs the analytics events when used in a system that has JQuery and where the Coveo.Dom.useNativeJavaScriptEvents = true; doesn't work.
 */
function bridgeAnalyticsMetadataLegacy(searchInterface, action = item => item) {
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