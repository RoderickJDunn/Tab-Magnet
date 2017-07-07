/**
 * Created by rdunn on 2017-02-21.
 */
// TODO: (BUG): There were ~80 tabs open altogether. ~25 in current window. The Popup did not open properly in this case.
            //  This was consistent.. I tried it 10 times, and it never opened correctly, until I closed some tabs in that window.
// TODO (Usability): Help page! Options page?
    // TODO: Check keycodes for modifier keys on Windows. (Test extension on windows) g

// TODO (FIX): Matches not shown for tab results if the match is located too far along the string
// TODO (FEATURE): I feel like history results should always show title (unless blank), even if the match is within the URL.
// TODO (IMPROVE): If matching text in result is near end of long url with ellipses, the text after ellipses doesn't take up the whole div. (TEST-STRING: "97t")
    // Cannot figure this out... seems to be very difficult and not worthwhile
// TODO (Organization): Create function to manage hiding/showing different combinations of UI elements for various circumstances
// TODO (FEATURE): Search through bookmarks as well as history and display "Extra Results", which includes both history and bookmarks
// TODO (Optimization): Use smaller version of Jquery library (only what is necessary), to decrease startup time of extension

/***** FINISHED *****/
// TODO (UI): Design main Magnet Icon
// TODO (BUG): Scrolling history with arrow keys... Reaching the bottom does not trigger loading next set of results
// TODO (FIX): Title 'hint' for some history items shows URL doubled. (Test-string: "blue" --> check the bestbuy results)
// TODO (FIX): When there are no history results, the "No history Results" element is not displayed...
// TODO (FEATURE): Long-Hover over result to show full text of URL and/or Title
    // TODO (FIX): Right now, it seems that only item titles are shown as the hint. Use URL if title is blank
// TODO (FEATURE): Key modifiers + ENTER to 1) Search google, 2) Cycle thru tab-list modes, 3) Open history result in background/foreground?
    // Also add Key Modifiers for Clicking on results.
// TODO (FIX): When tabs are listed by the ListTabs Button, with many tabs open (>10), the whole popup is scrolled which hides the text input.
// TODO (FIX): Tabbing to buttons does not work if search field is empty.
// TODO (FIX): when listing tabs with the List button, the list should expand the height to maximum if necessary (goes to only 255px right now)
    // Also pop-up remains tall even after hiding the list... (after 3rd click of the List button)
// TODO (FEATURE): Support "tabbing" between 1) First tab result, 2) First History result, 3) Google search button, 4) Search further back button
    // Deselect ALL selected elements (not just results... buttons too), on hover...
// TODO (FIX): Loading div sometimes displays when it should not. (When <10 history results)
// TODO (UI/FIX): Properly resize the results panes according to the number of each type of results.
    // TODO (repr): 'Purp' --> history div too tall
// TODO (FIX): 'Pink' with no tab results --> cannot scroll history results (status div hidden) -- { This was due to a bug in calculateFreeHeight() }
// TODO (FIX/ARCHITECTURE): Major design issue ---    { FIXED: used the 'searchContextId' variable to fix this problem }
    /*  When user types, history search begins on initial characters. If the user continues to type, another search
     *  begins with the extended search term. This results in >1 search occurring simultaneously, which is
     *  unacceptable, because all of them modify searchContext. I need a way to cancel any search that is already
     *  occurring, or potentially need to change the structure of the program to account for this problem.
     *  I will research designs that avoid this issue. */
// TODO (FIX): History results auto-scrolling can trigger additional auto-scrolls if <5 results returned
// TODO (FEATURE): A small "x" delete button would appear on Tab results ... pressing it would close that tab!!!
// TODO: Automatic "Further-back" search, if there are no history results  (this may require a "Loading" div, or animation)
// TODO (FEATURE): Button to display all tabs in current window (top left or something...)
// TODO (FEATURE): Button to 'Search Google for <searchTerm>'
/***** FINISHED *****/

/* ************ ************* */

/*
    Key Modifiers  (applies to clicking a Result or Google button, or pressing ENTER while any are selected)
    - Cmd+__    --> Keeps Popup open while new tabs are opened in the background

    Key Commands
    - ENTER (nothing selected) --> Cycle through List-Tabs modes
    - ENTER/CLICK              --> Open selected result in new tab and switch to it, closing Popup (matches Chrome omnibar)
    - Cmd+ENTER/CLICK          --> Open selected result in new tab, but keep focus on Popup        (matches Chrome omnibar)
    - Shift+ENTER/CLICK        --> Open selected result in new window, and switch to it            (matches Chrome omnibar)
    - Opt+ENTER                --> Open new tab with Google search for the term, switch to it. Ignores whatever element is Selected.
    - Ctrl+L  (mac)            --> Cycle through List-Tabs modes
 */
$(document).ready(function () {
    let startTabMagnet = function (tabs) {
        // console.log("Running tab magnet ...");

        /* UI Constants */
        const RES_FULL_HEIGHT = 395; // height of the entire results area (everything below search field)
        const RES_HALF_HEIGHT = 197.5; // height of the entire results area (everything below search field)
        const RES_HEIGHT_S = 39;  // height of a single normal result element
        const RES_HEIGHT_L = 58;  // height of a single large result element (tab element with URL showing)

        /* UI Elements */
        let wrapper = $('#popupContent');
        let resultsElm = wrapper.find('.results');
        let extraResultsElm = wrapper.find("#extraResultsWrapper");
        let noResultsElm = $("#noResultsBlock");
        let tabResultsElm = $('.results.tabs');
        let histResultsElm = $('.results.history');

        /* Data Structures */
        let tabResults = [];
        let searchContextId = -1;

        let keySelectMode = false;
        let disableKeySelectModeTimer;

        // Object representing everything to do with current search.
        let newContext = function () {
            console.info("\n\n\n\n\n************************************\nCreated search context");
            $("#statusWrapper").text("Loading ...");
            let now = new Date().getTime();
            searchContextId = Math.random();
            console.log("Initializing height");
            tabResultsElm.height('initial');
            histResultsElm.height('initial');
            return {
                id: searchContextId,
                currentTerm: "",
                lastTerm: "",
                start: now,
                end: now,
                now: now,
                isContinuation: false,
                appendItems: false,
                allTabMatches: [],
                allHistoryResults: [],
                currentMatches: [],
                rawResults: [],
                tabListMode: -1  // -1: default, 0: tabs of current window, 1: all tabs
            }
        };

        let searchContext = newContext();

        extraResultsElm.find("#extraResults").scroll(debounce(function () {
            if ($(this).scrollTop() + $(this).innerHeight() >= $(this)[0].scrollHeight - 20) {
                console.info("\n\n\nScrolled to bottom of history results: 'Searching-further back'");
                searchContext.isContinuation = true;
                getHistoryResults(searchContext);
            }
        }, 300));

        wrapper.find('#listTabsBtn').click(function() {
            $('input[name=search]').val("");
            console.log("Initializing height");
            tabResultsElm.height('initial');
            histResultsElm.height('initial');
            resultsElm.filter('.tabs').find("div.list-group-item").remove();
            $("#extraResults").hide().find("div.history-result").remove();
            if (searchContext.tabListMode === 0) {
                searchContext.tabListMode = 1;
                extraResultsElm.hide();
                $(this).find("#ic_listCurrentTabs").hide();
                $(this).find("#ic_listAllTabs").show();
                $('#listTabsBtn').attr('title', "List tabs from this window (Mac: Cmd+L - PC: Ctrl+L)");
                chrome.tabs.query({}, function (tabs) {
                    console.debug("Getting all tabs");
                    console.debug(tabs);
                    tabResults = populateTabResults(tabs, "");
                    if (tabResults.length >= 1) {
                        resultsElm.fadeIn('fast');
                        // resultsElm.find('div.list-group-item').first().addClass("selected");
                        noResultsElm.hide();
                    }
                    else {
                        resultsElm.find(".tabs").hide();
                        noResultsElm.show();
                    }
                    console.log(tabResults);

                });
            }
            else if (searchContext.tabListMode !== 0) {
                searchContext.tabListMode = 0;
                $(this).find("#ic_listAllTabs").hide();
                $(this).find("#ic_listCurrentTabs").show();
                $('#listTabsBtn').attr('title', "List tabs from every window (Mac: Cmd+L - PC: Ctrl+L)");
                extraResultsElm.hide();
                chrome.tabs.query({currentWindow: true}, function (tabs) {
                    console.debug("Getting tabs in current window");
                    console.debug(tabs);
                    tabResults = populateTabResults(tabs, "");
                    if (tabResults.length >= 1) {
                        resultsElm.fadeIn('fast');
                        // resultsElm.find('div.list-group-item').first().addClass("selected");
                        noResultsElm.hide();
                    }
                    else {
                        resultsElm.find(".tabs").hide();
                        noResultsElm.show();
                    }
                    console.log(tabResults);
                });
            }
            // else {
            //     searchContext.tabListMode = 0;
            //     extraResultsElm.hide();
            //     $(this).find("#ic_hideTabsList").hide();
            //     $(this).find("#ic_listCurrentTabs").show();
            //     $('#listTabsBtn').attr('title', "List tabs in this window");
            // }
        });

        // populate UI with tab results from this window
        searchContext.tabListMode = 1;
        wrapper.find('#listTabsBtn').click();

        let onGoogleBtnClick = function () {
            let term = $.trim($('input[name=search]').val());
            if (term) {
                chrome.tabs.create({url: "http://www.google.com/search?q=" + term});
            }
        };
        wrapper.find('#googleSearchBtn').click(onGoogleBtnClick);

        $(document).keydown(debounce(function (e) {
            console.log("keydown");
            let selectedResult = resultsElm.find('div.list-group-item.selected');
            let parOfSelected = selectedResult.parent();
            let results = resultsElm.find('div.list-group-item');
            let singleElmHeight;
            let selectedElm;

            switch (e.keyCode) {
                case (40): 	// down arrow
                    console.log("Down arrow");
                    clearTimeout(disableKeySelectModeTimer);
                    keySelectMode = true;
                    disableKeySelectModeTimer = setTimeout(function () {
                        keySelectMode = false;
                    }, 500);

                    singleElmHeight = selectedResult.next().outerHeight() + 1;  // TODO (fix-me): remove the +1 ??
                    if (selectedResult.length >= 1) {
                        let index = results.index(selectedResult);
                        selectedResult.removeClass('selected');
                        if (index < results.length - 1) {
                            // if this is not the bottom-most selected item, then select the item below
                            selectedResult = resultsElm.find('div.list-group-item').eq(index + 1).addClass('selected');
                        }
                        else if (index === results.length - 1) {
                            console.debug("reached end of UI results with down arrow key... loading next set");
                            selectedResult = results.last().addClass('selected');
                            let distFromTop = parOfSelected.scrollTop();
                            parOfSelected.scrollTop(distFromTop + singleElmHeight);
                        }
                        let selectedPos = selectedResult.position().top;
                        parOfSelected = selectedResult.parent();
                    }
                    else {
                        $('.selected').removeClass('selected');
                        results.first().addClass('selected');
                    }
                    break;
                case (38):  // up arrow
                    console.log("Up arrow");
                    clearTimeout(disableKeySelectModeTimer);
                    keySelectMode = true;
                    disableKeySelectModeTimer = setTimeout(function () {
                        keySelectMode = false;
                    }, 500);

                    singleElmHeight = selectedResult.prev().outerHeight();
                    if (selectedResult.length >= 1) {
                        let index = results.index(selectedResult);
                        selectedResult.removeClass('selected');
                        if (index >= 1) {
                            selectedResult = resultsElm.find('div.list-group-item').eq(index - 1).addClass('selected');
                        }
                        else {
                            selectedResult = results.first().addClass('selected');
                        }
                        parOfSelected = selectedResult.parent();
                        if (selectedResult.position().top < 0) {
                            if (selectedResult.parent().hasClass('tabs')) {
                                let pixFromTop = parOfSelected.scrollTop();
                                parOfSelected.scrollTop(pixFromTop - singleElmHeight);
                            }
                            else {
                                let distFromTop = parOfSelected.scrollTop();
                                parOfSelected.scrollTop(distFromTop - singleElmHeight);
                            }
                        }
                    }
                    break;
                case (13): // ENTER key, and selected not empty
                    let clickEvent;

                    if (e.altKey) { // if ALT key pressed, search Google. Doesn't matter what is selected
                        // Search Google (click google button)
                        onGoogleBtnClick();
                    }
                    else if (e.metaKey) {   // check for 'CMD' key modifier
                        clickEvent = $.Event('click', {metaKey: true});
                    }
                    else if (e.shiftKey) {  // check if 'SHIFT' key modifier
                        clickEvent = $.Event('click', {shiftKey: true});
                    }
                    else {
                        clickEvent = $.Event('click');
                    }
                    selectedElm = $('.selected');
                    if (selectedElm.length === 1) {
                        selectedElm.trigger(clickEvent);
                        resultsElm.scrollTop(0);
                    }
                    else {
                        console.info("No selected elements... Toggling list modes");
                        $('#listTabsBtn').click();

                    }
                    break;
                case (9): // TAB key -- cycles between 1) First Tab Result, 2) First Hist result, 3) Google button, 4) List button
                    selectedElm = $('.selected');
                    if (selectedElm.length > 1) {
                        console.error("Invalid number of selected elements");
                        return;
                    }
                    let $googleBtn = $('#googleSearchBtn');
                    let $listBtn = $('#listTabsBtn');

                    if (selectedElm.length === 0) {
                        $googleBtn.addClass('selected');
                    }
                    else if (selectedElm.parent().hasClass('tabs')) {
                        selectedElm.removeClass('selected');

                        // Change selection to first history item, Unless there are no history results.. focus to google search
                        let firstHist = results.filter('.history-result').first();
                        if (firstHist.length === 1) {
                            firstHist.addClass('selected');
                        }
                        else {
                            // focus google search button
                            $googleBtn.addClass('selected');
                        }

                    }
                    else if (selectedElm.parent().hasClass('history')) {
                        // Remove selection and switch focus to Google Search button
                        selectedElm.removeClass('selected');
                        $googleBtn.addClass('selected');
                    }

                    // We either have nothing selected (no results /or/ no search), or Google Search button is selected
                    // --> Select first result (either tab result, or history if no tab results)
                    else if ($googleBtn.hasClass('selected')) {
                        $googleBtn.removeClass('selected');
                        $listBtn.addClass('selected');
                    }
                    else if ($listBtn.hasClass("selected")) {
                        $listBtn.removeClass('selected');
                        // Select first tab element (or Hist if none)
                        let firstRes = results.first();

                        if (firstRes.length === 1) {
                            firstRes.addClass('selected');
                        }
                        else {
                            // focus google search button
                            $googleBtn.addClass('selected');
                        }

                    }
                    break;
                case (8 || 46): // BACKSPACE or DELETE key
                    // One or more characters in the current search term have been deleted. Clear search context
                    searchContext = newContext(); // Allow fall-through, since we want to search with what's left in the input after deleting the character(s)
                case (76): // 'L' key was pressed
                    // check if 'Ctrl' key modifier is being pressed
                    if (e.metaKey) {
                        $('#listTabsBtn').click();
                        break;
                    }
                default:
                    if ([16, 17, 18, 20, 91, 92, 93].indexOf(e.keyCode) >=0) {
                        return;
                    }
                    let term = $.trim($('input[name=search]').val().toLowerCase());
                    if (term.length === 0) {
                        console.log("No search term. Resetting context, hiding extra results, listing tabs");
                        const tabListMode = searchContext.tabListMode;
                        searchContext = newContext();
                        searchContext.tabListMode = tabListMode;

                        extraResultsElm.hide();
                        noResultsElm.hide();
                        // populate UI with tab results for the current mode
                        searchContext.tabListMode = searchContext.tabListMode===0 ? 1 : 0;
                        wrapper.find('#listTabsBtn').click();

                    }
                    else if (term === searchContext.lastTerm) {
                        console.log("Search term has not changed");
                    }
                    else if (term.length > 0) {
                        console.info("\n\n\nNew search term: ", term);
                        searchContext = newContext();
                        resultsElm.filter('.tabs').find("div.list-group-item").remove();

                        searchContext.currentTerm = term;
                        // TODO (Optimization): Do not search ALL *history* every time this loop executes. Eg) If user adds an additional letter to the query,
                        //                      just search historyItems that are already matched
                        setTimeout(getHistoryResults, 0, searchContext);

                        // TODO (Optimization): Do not search ALL *tabs* every time this loop executes. Eg) If user adds an additional letter to the query, just search tabs that are already showing
                        // TODO (Feature): Option to include/exclude URLs from the tab search (only search Titles)
                        tabResults = populateTabResults(tabs, term);
                        searchContext.allTabMatches = tabResults;
                        if (tabResults.length >= 1) {
                            resultsElm.fadeIn('fast');
                            $('.selected').removeClass("selected");
                            resultsElm.find('div.list-group-item').first().addClass("selected");
                            noResultsElm.hide();
                        }
                        else {
                            resultsElm.find(".tabs").hide();
                            noResultsElm.show();
                        }
                        console.log(tabResults);

                    }
                    searchContext.lastTerm = term;
            }
            if (selectedResult.length === 1) {
                let selectedPos = selectedResult.position().top;
                parOfSelected = selectedResult.parent();
                if (selectedPos < 0) {
                    let distFromTop = parOfSelected.scrollTop();
                    // parOfSelected.scrollTop(distFromTop + selectedPos); // selected position is added since it is negative
                    parOfSelected.scrollTop(distFromTop + 40);
                }
                if (selectedPos > parOfSelected.height() - singleElmHeight) {
                    let distFromTop = parOfSelected.scrollTop();
                    // parOfSelected.scrollTop(distFromTop + selectedPos);
                    parOfSelected.scrollTop(distFromTop + 40);
                }
            }
        }, 50));

        $(document).on('click', '#popupContent .results.tabs div.list-group-item', function (e) {
            console.log("Tab result clicked");
            let $target = $(e.target);
            if ($target.hasClass('tab-close-btn') || $target.parents().hasClass('tab-close-btn')) {
                // close tab
                let tabId = parseInt($(this).data('tabid'));
                chrome.tabs.remove(tabId, function () {
                    console.info("Tab closed");

                    // Request all tabs again, since one has been removed
                    chrome.tabs.query({}, function (updatedTabs) {
                        tabs = updatedTabs;
                        searchContext.allTabMatches = tabs;
                    });

                    // remove tab from popup results
                    console.info("Tab closed");
                    let $prev = $target.closest('div.list-group-item').prev();
                    $target.closest('div.list-group-item').remove();
                    $prev.nextAll().each(function(idx, elm) {
                        // for each list-group-item after the one that was clicked, decrease the tabindex by 1.
                        let data = $(elm).data();
                        data.indexid -= 1;
                    });

                });
            }
            else {
                // go to tab

                let tabIndex = parseInt($(this).data('indexid'));
                let windowId = parseInt($(this).data('windowid'));
                chrome.windows.update(windowId, {focused: true});
                chrome.tabs.highlight({
                    windowId: windowId,
                    tabs: [tabIndex]
                }, function () {
                });
            }

        });

        function populateTabResults(tabs, term) {
            console.log("Populating tab results");
            let tabsFiltered = [];
            let tabsUiItems = $();

            for (let i = 0; i < tabs.length; i++) {
                let urlMatchIdx = tabs[i].url.toLowerCase().indexOf(term);
                let titleMatchIdx = tabs[i].title.toLowerCase().indexOf(term);
                if (urlMatchIdx >= 0 || titleMatchIdx >= 0) {
                    tabsFiltered.push(tabs[i]);

                    let title = tabs[i].title;
                    let formattedTitle = title;
                    let url = tabs[i].url;
                    let formattedUrl = "";

                    if (titleMatchIdx >= 0) {
                        let titleElements = [];
                        titleElements.push(title.substr(0, titleMatchIdx));
                        titleElements.push("<span class='matched-text'>");
                        titleElements.push(title.substr(titleMatchIdx, term.length));
                        titleElements.push("</span>");
                        titleElements.push(title.substring(titleMatchIdx + term.length));
                        formattedTitle = titleElements.join("");
                    }
                    else {
                        // only show and highlight URL if title does not contain the matching text
                        let urlElements = [];
                        urlElements.push(url.substr(0, urlMatchIdx));
                        urlElements.push("<span class='matched-text'>");
                        urlElements.push(url.substr(urlMatchIdx, term.length));
                        urlElements.push("</span>");
                        urlElements.push(url.substring(urlMatchIdx + term.length));
                        formattedUrl = urlElements.join("");
                    }
                    let item = $("#tabListItemTemplate").clone().css("display", "block");
                    item.attr("id", "")
                        .attr("title", title)
                        .attr("data-windowid", tabs[i].windowId)
                        .attr("data-indexid", tabs[i].index)
                        .attr("data-tabid", tabs[i].id)
                        .mouseenter(function (e) {
                            console.log("Hover tab result");
                            if (!keySelectMode) {
                                console.debug("Mouse entered by moving");
                                $(".selected").removeClass('selected');
                                $(e.target).closest('div.list-group-item').addClass('selected');
                            }

                        })
                        .find('img.page-icon')
                        .attr('src', tabs[i].favIconUrl)
                        .end()
                        .find('span.title-text')
                        .html(formattedTitle);

                    if (formattedUrl) {
                        item.find('.separator').show();
                        item.find('span.url-text')
                            .show()
                            .html(formattedUrl);
                    }
                    // resultsElm.filter('.tabs').append(item);
                    tabsUiItems = tabsUiItems.add(item);
                }
            }
            $('.results').filter('.tabs').append(tabsUiItems);

            return tabsFiltered;
        }

        /* Main function for managing retrieval and filtering of history results */
        function getHistoryResults(searchContext) {
            if (searchContext.id !== searchContextId) {
                console.log(`Exiting current search for: ${searchContext.currentTerm}`);
                return;
            }
            console.info(`\n\n Getting History Results for: ${searchContext.currentTerm}`);
            $("#extraResultsWrapper").show();
            let $status = $("#statusWrapper").show();
            $("#historyResultsFooter").show();
            let $historyList = $("#extraResults");

            // TODO (Optimization): Search already-matched historyItems instead of actually doing a full history search. This half-works
            if (searchContext.lastTerm !== "" && !searchContext.isContinuation
                && searchContext.currentTerm.startsWith(searchContext.lastTerm)) {
                $historyList.show().find("div.history-result").remove();
                searchContext.rawResults = searchContext.allHistoryResults.concat(searchContext.rawResults);
                searchContext.allHistoryResults = [];
            }

            if (searchContext.start < searchContext.now - 9628000000) {
                console.info("Reached end of all history. No more results could be found");
                if (searchContext.currentMatches.length > 0) {
                    populateExtraResults(searchContext);
                    searchContext.currentMatches = [];
                }

                // Depending on whether there are any history results showing, change status div to "no history results" or allow hide.
                else if (searchContext.allHistoryResults.length === 0) {
                    $status.text("No history results");
                    // There's no history results. If there are no tab results either, focus (select) Google button
                    if (searchContext.allTabMatches.length === 0) {
                        $('.selected').removeClass('selected');
                        $('#googleSearchBtn').addClass('selected');
                    }
                    return;
                }
                $status.hide();

            }
            else if (searchContext.rawResults.length === 0) {
                console.info("RawResults is empty");
                setTimeout(fetchNextRawHistSet, 0, searchContext);
            }
            else {
                // we have some raw history results
                console.info("Filtering historyItems: ", searchContext.rawResults.length);
                console.log(searchContext.rawResults);
                // searchContext.rawResults = histItemsRaw;
                searchContext.currentMatches = searchContext.currentMatches.concat(filterResultSet(searchContext.rawResults, searchContext));

                console.log(`Current matches count: ${searchContext.currentMatches.length}`);

                let freeHeightForHist = calculateFreeHeight();
                let minHistoryResults = Math.floor(freeHeightForHist / RES_HEIGHT_S);

                // Fetch more raw history results IF:
                //      We have not reached the end of history
                //      AND
                // EITHER OF: 1) Total matches is less than the minimum allowed history results based on left-over height
                //            2) There are NO current matches
                if ((searchContext.start > searchContext.now - 9628000000) &&
                    (((searchContext.currentMatches.length + searchContext.allHistoryResults.length) < minHistoryResults)
                     || (searchContext.currentMatches.length === 0)))
                {

                    setTimeout(fetchNextRawHistSet, 0, searchContext);

                }
                else if (searchContext.currentMatches.length > 0) {

                    // We have some matched results
                    console.info("Found some history results!");
                    let uiItemsCnt = searchContext.allHistoryResults.length;

                    // check if we are in a "Normal Search" or a "Continuation Search"
                    if (!searchContext.isContinuation) {
                        // clear old history results
                        $historyList.show().find("div.history-result").remove();
                    }
                    populateExtraResults(searchContext);
                    searchContext.currentMatches = [];  // clear currentMatches once we have populated the UI
                    if (searchContext.isContinuation) {
                        // Scroll to first new result or by number of new results if <5 (to prevent auto-scrolling loop)
                        searchContext.isContinuation = false;
                        let currScrollPos = $historyList.scrollTop();
                        console.debug(`uiItemsCnt: ${uiItemsCnt}`);

                        // First calculate the position of the first new history result. This value would scroll till this result is at the top;
                        let scrollTo = $("#history-item-" + uiItemsCnt).position().top + currScrollPos;

                        // Prevent scrolling all the way to the bottom
                        let limit = calcAutoScrollLimit($historyList);
                        scrollTo = scrollTo > limit ? limit : scrollTo;

                        $historyList.animate({scrollTop: scrollTo + "px"}, 1000);
                    }
                }

                if (searchContext.start < searchContext.now - 9628000000) { // TODO (FIX): does this make sense here?
                    console.info("No more history results could be found");

                }
            }
        }

        /* Retrieve the next set of raw history results from local history API */
        // TODO?: Handle case where there is more than 20,000 raw results in a time period? Probably not worthwhile... too unlikely
        function fetchNextRawHistSet(searchContext) {
            if (searchContext.id !== searchContextId) {
                console.log(`Exiting current search for ${searchContext.currentTerm}`);
                return;
            }
            console.info("Fetching next set of raw results");
            searchContext.end = searchContext.start - 1782000;
            searchContext.start = searchContext.start - 604800000;  // 1 week further back
            contextToString(searchContext);
            chrome.history.search({
                text: "",
                startTime: searchContext.start,
                endTime: searchContext.end,
                maxResults: 20000
            }, function (rawHistResults) {
                searchContext.rawResults = rawHistResults;
                getHistoryResults(searchContext);
            });
        }

        /* This function is more focused than the previous version. It takes a histItem array, and filters it by the
         currentTerm in the searchContext. The histItem array may be any array, including rawResults, or
         previously matchedResults.
         */
        function filterResultSet(results, searchContext) {
            let matchedResults = [];
            let term = searchContext.currentTerm.toLowerCase();
            let count = 0;
            for (let i = 0; i < results.length; i++) {
                count++;
                if (i > 0 && matchedResults.length > 0 &&
                    similar(matchedResults[matchedResults.length - 1], results[i])) {
                    // TODO (Fix): right now, we only are passing currentMatches to the similar() function. We should really check the last item(s) from
                    // the previous search as well (in case this is a further-back search)
                    continue;
                }

                let titleMatchIdx = results[i].title.toLowerCase().indexOf(term);
                let urlMatchIdx = -1;
                if (titleMatchIdx === -1) {
                    urlMatchIdx = results[i].url.toLowerCase().indexOf(term);
                }

                if (titleMatchIdx > -1 || urlMatchIdx > -1) {
                    if (searchContext.currentMatches.length > 0 && matchedResults.length === 0
                        && similar(results[i], searchContext.currentMatches[searchContext.currentMatches.length -1])) {
                        // This prevents adding history item to "matches" array if a similar one is the last result
                        // in the previous search.
                        continue;
                    }
                    results[i].titleMatchIdx = titleMatchIdx;
                    results[i].urlMatchIdx = urlMatchIdx;
                    matchedResults.push(results[i]);
                }
                if (matchedResults.length === 10) {
                    // limit matches to 10;
                    break;
                }
            }
            // remove all rawResults that have already been checked for matches
            searchContext.rawResults.splice(0, count);

            return matchedResults;
        }

        /* this should just put an array of results into the UI. Should not know anything about what the array is
         (currentMatches, allHistResults etc), and it should not be responsible for removing
         */
        function populateExtraResults(searchContext) {
            console.debug("suggestFromHistory itself called");
            let debugTerm = searchContext.currentTerm;
            console.log("Search term: ", debugTerm);


            let $historyList = $("#extraResults");
            let $statusDiv = $historyList.find("#statusWrapper");
            $historyList.show();
            let histItems = searchContext.currentMatches;

            console.debug(histItems);

            let startIdx = searchContext.allHistoryResults.length;
            searchContext.currentMatches = [];

            console.log("Showing extraResultsWrapper");
            $historyList.show();
            let li_template = $("#histListItemTemplate").clone().removeClass('hidden');

            for (let i = 0; i < histItems.length; i++) {
                histItems[i] = formatURL(histItems[i]);
                let li = li_template.clone();
                let title = histItems[i].title;
                let formattedTitle = "";
                let url = histItems[i].url;
                let formattedUrl = "";
                let searchLength = searchContext.currentTerm.length;
                if (histItems[i].titleMatchIdx >= 0) {
                    let titleElements = [];
                    titleElements.push(title.substr(0, histItems[i].titleMatchIdx));
                    titleElements.push("<span class='matched-text'>");
                    titleElements.push(title.substr(histItems[i].titleMatchIdx, searchLength));
                    titleElements.push("</span>");
                    titleElements.push(title.substring(histItems[i].titleMatchIdx + searchLength));
                    formattedTitle = titleElements.join("");
                }
                if (histItems[i].urlMatchIdx >= 0) {
                    // show URL and highlight matching text
                    let urlElements = [];
                    urlElements.push(url.substr(0, histItems[i].urlMatchIdx));
                    urlElements.push("<span class='matched-text'>");
                    urlElements.push(url.substr(histItems[i].urlMatchIdx, searchLength));
                    urlElements.push("</span>");
                    urlElements.push(url.substring(histItems[i].urlMatchIdx + searchLength));
                    formattedUrl = urlElements.join("");
                }

                let text = formattedTitle || formattedUrl;

                let hint = "";

                // If title is empty, or title is same as url, just use URL as hint
                if (!title || url.indexOf(title) !== -1) {
                    hint = url;
                }
                else {
                    hint = title + '\n' + url;
                }

                // Otherwise use both
                li.attr("id", "history-item-" + startIdx)
                    .attr("title", hint)
                    .mouseenter(function (e) {
                        console.debug("Hover");
                        if (!keySelectMode) {
                            console.debug("Mouse entered by moving");
                            $(".selected").removeClass('selected');
                            $(e.target).closest('div.list-group-item').addClass('selected');
                        }
                    })
                    .on('click', function (e) {
                        let id = $(e.target).closest('div.list-group-item').attr("id");
                        id = id.replace("history-item-", "");
                        console.debug(id);
                        let tab = searchContext.allHistoryResults[id];
                        if (e.shiftKey) {
                            // open the history result in a new window
                            chrome.windows.create({url: tab.url})
                        }
                        else {
                            // open the history result in a new tab in current window
                            chrome.tabs.create({url: tab.url, active: false},
                                function(tab) {
                                    if (!e.metaKey) {
                                        chrome.tabs.highlight({
                                            windowId: tab.windowId,
                                            tabs: [tab.index]
                                        });
                                    }
                                });
                        }
                    })
                    .children("div:first")
                    .html(text);

                li.insertBefore($statusDiv);

                // 1. The match is BEFORE the width cutoff 410px (within visible area) --> Do nothing, just leave CSS ellipses at the end
                // 2. The match is AFTER the width cutoff (outside visible area)
                // --> Use flex-box layout with ellipses in center
                {
                    // calculate the position (from left) of the highlighted text as-is (without flex-box)
                    let matchTxtOffset = li.find("div span").offset().left;


                    if (matchTxtOffset > 410) {
                        let presplit = text.substring(0, text.indexOf("<span") - 10);
                        let postsplit = text.substr(text.indexOf("<span") - 10);
                        let $presplit = $("<div class='flex-prematch'></div>").html(presplit);
                        let $ellipses = $("<div class='flex-ellipses'></div>").html("...");
                        let $postsplit = $("<div class='flex-postmatch'></div>").html(postsplit);
                        li.children("div:first")
                            .html("")
                            .addClass("flex-ellipses-wrapper")
                            .append($presplit)
                            .append($ellipses)
                            .append($postsplit)

                    }
                }
                startIdx++;
            }

            searchContext.allHistoryResults = searchContext.allHistoryResults.concat(histItems);

            // If no tab results, select first history result
            if (searchContext.allTabMatches.length === 0) {
                $(".selected").removeClass('selected');
                let firstRes = resultsElm.find('div.list-group-item').first();
                firstRes.addClass('selected');
            }

            resizeResultsDisplay(searchContext);
        }

        // TODO (Fix): Right now, this just checks for equality. Eventually I would like to check for similarity instead.
        function similar(histItem1, histItem2) {
            if (histItem1.url && histItem2.url
                && histItem1.url === histItem2.url) {
                return true;
            }
            else if (histItem1.title && histItem2.title
                && histItem1.title === histItem2.title) {
                return true;
            }
            else {
                return false;
            }
        }

        function formatURL(historyResult) {
            console.debug("Formatting history result: ", historyResult);

            let url = historyResult.url;
            if (url) {
                if (url.substring(0, 7) === "http://") {
                    historyResult.formattedURL = historyResult.url.substring(7);
                }
                else if (url.substring(0, 8) === "https://") {
                    historyResult.formattedURL = historyResult.url.substring(8);
                }
                historyResult.hostname = new URL(historyResult.url).hostname
            }
            return historyResult;
        }

        /* Resize both the tab results and history results divs according to available space.
         *  If both have scroll heights that are more than half total height, they get equal space
         *  If tabResults scroll height is > half, but history scroll height is < half, more space to tab results
         *      - This should re-adjust if more history results are subsequently found. Or maybe this would never happen?
         *  If histResults scroll ehight is > half, but tabResults scoll height is < half, more space to history results.
         */
        function resizeResultsDisplay(searchContext) {

            let tabResultsElm = $('.results.tabs');
            let histResultsElm = $('.results.history');

            let tabResScrollHeight = Math.max(tabResultsElm[0].scrollHeight, RES_HEIGHT_S);
            let histResScrollHeight = histResultsElm[0].scrollHeight;


            // The sum of heights of tabResultsElm & histResultsElm MUST BE <= 510px
            if (tabResScrollHeight >= RES_HALF_HEIGHT && histResScrollHeight <= RES_HALF_HEIGHT) {
                tabResultsElm.height(RES_HALF_HEIGHT + (RES_HALF_HEIGHT - histResScrollHeight));
            }
            else if (histResScrollHeight >= RES_HALF_HEIGHT && tabResScrollHeight <= RES_HALF_HEIGHT) {
                // histResultsElm.height(215 + (RES_HALF_HEIGHT - tabResScrollHeight));
                let heightOfHistElms = searchContext.allHistoryResults.length * 39;
                let finalHeight = Math.min(heightOfHistElms, calculateFreeHeight());
                histResultsElm.height(finalHeight);
            }
            else if (tabResScrollHeight >= RES_HALF_HEIGHT && histResScrollHeight >= RES_HALF_HEIGHT){
                tabResultsElm.height(RES_HALF_HEIGHT);
                histResultsElm.height(RES_HALF_HEIGHT);
            }
        }

        /* Helper function to find the available UI height for history results, given height of current tab results.
         *  If less than half of full height is used by Tab results, return the actual available height (with minimum 40).
         *  If more than half of full height is used by Tab results, return half the height.
         *  */
        function calculateFreeHeight() {
            let tabResultsHeight = Math.max($('.results.tabs')[0].scrollHeight, RES_HEIGHT_S);

            if (tabResultsHeight < RES_FULL_HEIGHT/2) {
                return (RES_FULL_HEIGHT - tabResultsHeight);
            }
            else {
                return (RES_FULL_HEIGHT / 2);
            }
        }

        /* Helper function to determine the largest scroll value for a the history results ('#extraResults') element
         *  without triggering 'continuation search'.
         */
        function calcAutoScrollLimit($historyList) {
            return $historyList[0].scrollHeight - $historyList.height() - RES_HEIGHT_S;
        }

        function updateHistoryStatus(searchContext) {
            if (searchContext.allHistoryResults.length === 0) {
                $("#statusWrapper").show()
                    .find("span")
                    .text("No matches in history (since 'date')");
            }
            else {
                $("#statusWrapper").hide()
                    .find("span")
                    .text("Loading . . .");
            }
        }

        function debounce(func, wait, immediate) {
            let timeout;
            return function () {
                let context = this, args = arguments;
                let later = function () {
                    timeout = null;
                    if (!immediate) func.apply(context, args);
                };
                let callNow = immediate && !timeout;
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
                if (callNow) func.apply(context, args);
            };
        }

        function contextToString(ctx) {
            let from = toHumanDate(ctx.start);
            let to = toHumanDate(ctx.end);
            console.log(`Searching:${ctx.currentTerm}`);
            console.log(`From: ${from}   To: ${to}`);
        }

        function toHumanDate(epoch) {
            let d = new Date(0);
            d.setUTCMilliseconds(epoch);
            return d;
        }
    };
    
    function openHelp() {
        console.info("Opening Help Page");
        chrome.tabs.create({url: "src/help.html"});
    }

    console.info("Querying tabs...");
    chrome.tabs.query({}, function (tabs) {
        chrome.contextMenus.removeAll();
        let id = chrome.contextMenus.create({
            "title": "Tab Magnet Help", "contexts": ["editable"],
            "onclick": openHelp
        });
        startTabMagnet(tabs);
    });
});


