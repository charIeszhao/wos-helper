var totalCount = parseInt($('.l-columns-criteria h3 span').text().replace(/,/g, ''));
var path = $(location).attr('pathname');

if ($('.errorMessage').is(':visible') && $('.errorText').text().indexOf('server error') > -1) {
  // terminate the app when server error occurs.
  chrome.extension.sendMessage({ fn: 'destroy' });
}

var batchDownload = function (index, qty, forceStart) {
  chrome.extension.sendMessage({ fn: 'checkStatus' }, function (status) {
    if (!status.isAppRunning && !forceStart) {
      return false;
    }

    var endIndex = Math.min(index + qty - 1, totalCount);
    chrome.extension.sendMessage({ fn: "setRange", from: index, to: endIndex, forceStart: forceStart });

    // Launch download options dialog
    $('a.quickOutputOther')[0].dispatchEvent(new Event('click'))

    $('#records-range-radio-button input').prop('checked', true);
    $('#markFrom').val(index);
    $('#markTo').val(endIndex);
    $('#bib_fields').val($('#bib_fields\\:' + status.fieldsSelection).last().val())[0].dispatchEvent(new Event('change'));

    $('#saveOptions').val(status.saveOptions)[0].dispatchEvent(new Event('change'));

    // Start downloading!!
    $('.quickoutput-action > button[name=email]').click();

    // Set download status
    chrome.extension.sendMessage({ fn: 'setIsDownloading', isDownloading: true }, function () {

      var checkDownloadCompleteInterval = setInterval(function () {
        // Check download status
        chrome.extension.sendMessage({ fn: 'checkStatus' }, function (status) {

          // If previous download completes
          if (status.isAppRunning && !status.isDownloading) {

            clearInterval(checkDownloadCompleteInterval);

            // If all download completes
            if (index + qty > totalCount) {
              if (status.isForceStarted) {
                // If it was manually started in search result page,
                // terminate the app when all downloads are completed in this round.
                chrome.extension.sendMessage({ fn: 'destroy' });
              } else {
                if (status.searchMode === 1) {
                  // Navigate back to go for the next query
                  history.back();
                } else {
                  // Go back to search page
                  location.href = 'https://apps.webofknowledge.com/WOS_GeneralSearch_input.do?product=WOS&search_mode=GeneralSearch';
                }

              }
            } else {
              // Otherwise, trigger the next download in 10s (Bypass the security)
              setTimeout(function () {
                batchDownload(index + qty, qty);
              }, status.downloadInterval * 1000);
            }
          }
        });
      }, 200);
    });
  });
};

// Inject batch download button
if ($('.addToMarkedListButton').length > 0) {
  $('<span class="onload-secondary-button" />')
    .text('批量下载')
    .css({ 'height': '20px', 'line-height': '20px', 'margin-left': '10px' })
    .click(function () {
      batchDownload(1, 500, true);
    })
    .insertBefore($('.addToMarkedListButton').parent());
  $('.addToMarkedListButton').parent().css('padding-left', '5px');
}

if (path.indexOf('AdvancedSearch') > -1) {
  chrome.extension.sendMessage({ fn: 'checkStatus' }, function (status) {
    if (status.isAppRunning) {
      if ($('#set_1_row').length > 0 && !status.isSearchHistoryCleared) {
        // Search history exists. Clear history first.
        $('.bselsets').click(); // Select all
        setTimeout(function () {
          $('button + br + button').click(); // Click remove button
          chrome.extension.sendMessage({ fn: 'clearSearchHistory' });
        }, 500);
      } else {
        if ($('#set_1_row').length === 0 && !status.isSearchHistoryCleared) {
          chrome.extension.sendMessage({ fn: 'clearSearchHistory' });
        }
        if (!status.isSearchLocked || status.isDryRun) {
          chrome.extension.sendMessage({ fn: 'getNextQuery' }, function (query) {
            if (query) {
              $('.AdvSearchBox > textarea').val(query[1]);
              $('#search-button').click();
            }
          });
        } else {
          // Search query is locked, do batch download now!
          var $resultLink = $('#set_' + (status.index + 1) + '_row').find('.historyResults a');
          $resultLink[0].click();
          chrome.extension.sendMessage({ fn: 'setTotalCount', totalCount: parseInt($resultLink.text().replace(/,/g, '')) });
        }
      }
    }
  });
}

if (path.indexOf('GeneralSearch') > -1) {
  chrome.extension.sendMessage({ fn: 'checkStatus' }, function (status) {
    if (status.isAppRunning) {
      if (status.isSearchHistoryFull || !status.isSearchHistoryCleared) {
        // Need to clear search history first
        $('.nav-link.snowplow-search-history')[0].click(); // Navigate to history page (WOS_CombineSearches_input.do)
      } else {
        // Do search
        $('#clearIcon1').click();
        chrome.extension.sendMessage({ fn: 'getNextQuery' }, function (query) {
          if (query) {
            $('.focusinput.search-criteria-input').val(query[1]);
            $('#select1').val('TI')[0].dispatchEvent(new Event('change'));
            $('.searchButton button').click();
          }
        });
      }
    }
  });
}

if (path.indexOf('WOS_CombineSearches_input.do') > -1) {
  chrome.extension.sendMessage({ fn: 'checkStatus' }, function (status) {
    if (status.isAppRunning) {
      if ($('#set_1_row').length > 0) {
        $('.bselsets').click(); // Select all
        setTimeout(function () {
          $('#deleteTop').click(); // Click remove button
          chrome.extension.sendMessage({ fn: 'clearSearchHistory' });
        }, 500);
      } else {
        // Navigate back to search page
        chrome.extension.sendMessage({ fn: 'clearSearchHistory' });
        $('.reverse-focus-style.snowplow-searchback')[0].click();
      }

    }
  });
}

if (path.indexOf('Search.do') > -1) {
  chrome.extension.sendMessage({ fn: 'checkStatus' }, function (status) {
    if (status.isAppRunning) {
      $('.search-results-data-cite a')[0].click();
    }
  });
}

if (path.indexOf('summary.do') > -1 || path.indexOf('CitingArticles.do') > -1) {
  chrome.extension.sendMessage({ fn: 'checkStatus' }, function (status) {
    if (status.isAppRunning && status.isSearchLocked) {
      if ($('.errorMessage').is(':visible')) {
        if (status.searchMode === 1) {
          // Navigate back to go for the next query
          history.back();
        } else {
          // Go back to search page
          location.href = 'https://apps.webofknowledge.com/WOS_GeneralSearch_input.do?product=WOS&search_mode=GeneralSearch';
        }
      } else {
        batchDownload(1, 500);
      }
    }
  });
}
