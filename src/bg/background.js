var background = {

    queryStrings: null,

    currentQueryIndex: -1,

    from: 1,

    to: 500,

    totalCount: 0,

    stopSign: true,

    searchMode: 1,

    saveOptions: 'fieldtagged',

    fieldsSelection: 'fields_selection',

    downloadInterval: 10,

    searchLock: false,

    searchHistoryCount: 0,

    isSearchHistoryCleared: false,

    isDownloading: false,

    isForceStarted: false,

    isDryRun: false,

    init: function() {
        chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
            if (request.fn in background) {
                background[request.fn](request, sender, sendResponse);
            }
        });
    },

    getNextQuery: function(request, sender, sendResponse) {
        if (this.currentQueryIndex < this.queryStrings.length - 1 && !this.stopSign) {
            this.searchLock = true;
            this.currentQueryIndex++;
            this.searchHistoryCount++;
            sendResponse(this.queryStrings[this.currentQueryIndex]);
        } else {
            this._setStopSign(true);
        }
    },

    getQueryStrings: function(request, sender, sendResponse) {
        sendResponse(this.queryStrings);
    },

    setQueryStrings: function(request, sender, sendResponse) {
        this.queryStrings = request.queryStrings;
    },

    setSaveOptions: function(request, sender, sendResponse) {
        this.saveOptions = request.saveOptions;
    },

    setFieldsSelection: function(request, sender, sendResponse) {
        this.fieldsSelection = request.fieldsSelection;
    },

    setDownloadInterval: function(request, sender, sendResponse) {
        this.downloadInterval = request.downloadInterval;
    },

    startup: function(request, sender, sendResponse) {
        this.searchMode = request && request.searchMode;
        this.isDryRun = request && request.isDryRun;
        this.currentQueryIndex = -1;
        this.isSearchHistoryCleared = false;
        this.searchLock = false;
        this.isForceStarted = false;
        this._setStopSign(false);
        if (sendResponse) {
            sendResponse();
        }
    },

    _setStopSign: function(flag) {
        this.stopSign = flag;
    },

    clearSearchHistory: function(request, sender, sendResponse) {
        this.isSearchHistoryCleared = true;
        this.searchHistoryCount = 0;
    },

    setIsDownloading: function(request, sender, sendResponse) {
        this.isDownloading = request.isDownloading;
    },

    setRange: function(request, sender, sendResponse) {
        this.from = request.from;
        this.to = request.to;
        if (request.forceStart) {
            this.startup();
            this.isForceStarted = true;
        }
        if (this.queryStrings && (this.queryStrings.length < this.to)) {
            // Unlock search to get ready for the next round search and download
            this.searchLock = false;
        }
        sendResponse(!this.stopSign);
    },

    setTotalCount: function(request, sender, sendResponse) {
        this.totalCount = request.totalCount;
    },

    isAppRunning: function(request, sender, sendResponse) {
        sendResponse(!this.stopSign);
    },

    checkStatus: function(request, sender, sendResponse) {
        sendResponse({
            isAppRunning: !this.stopSign,
            isDryRun: this.isDryRun,
            isForceStarted: this.isForceStarted,
            isSearchLocked: this.searchLock,
            isSearchHistoryFull: this.searchHistoryCount > 99,
            isSearchHistoryCleared: this.isSearchHistoryCleared,
            isDownloading: this.isDownloading,
            index: this.currentQueryIndex,
            searchMode: this.searchMode,
            saveOptions: this.saveOptions,
            fieldsSelection: this.fieldsSelection,
            downloadInterval: this.downloadInterval
        });
    },

    destroy: function(request, sender, sendResponse) {
        this.currentQueryIndex = -1;
        this.isSearchHistoryCleared = false;
        this.isDownloading = false;
        this.searchLock = false;
        this._setStopSign(true);
    }
};

background.init();

chrome.downloads.onDeterminingFilename.addListener(function(item, suggest) {
    if (item.finalUrl.indexOf('webofknowledge.com') > -1 && !background.stopSign) {
        var temp = item.filename.split('.');
        if (background.queryStrings && background.queryStrings[background.currentQueryIndex]) {
            var queryName = background.queryStrings[background.currentQueryIndex][0];
            if (background.searchMode === 1) {
                suggest({filename: queryName + '(' + background.totalCount + ')/' + queryName + '(' + background.from + '-' + background.to + ').' + temp[1]});
            } else {
                suggest({filename: queryName + '/' + background.from + '-' + background.to + '.' + temp[1]});
            }
        } else {
            suggest({filename: temp[0] + '(' + background.from + '-' + background.to + ').' + temp[1]});
        }
    }
});

chrome.downloads.onChanged.addListener(function(downloadDelta) {
    if (!background.stopSign && downloadDelta.state && downloadDelta.state.current === 'complete') {
        background.isDownloading = false;
    }
});
