function init() {
  var upload = document.getElementById('upload'),
    testBtn = document.getElementById('test'),
    goBtn = document.getElementById('go'),
    stopBtn = document.getElementById('stop'),
    msgBox = document.getElementById('msg'),
    database = document.getElementById('database');

  $('li').click(function () {
    $('li').removeClass('selected');
    $(this).addClass('selected');
    if (this.id === 'advancedSearch') {
      $('.label.file-upload').text('请导入检索式 (仅支持CSV)');
      $('.label.database, #database, #test').show();
    } else {
      $('.label.file-upload').text('请导入文章标题 (仅支持CSV)');
      $('.label.database, #database').hide();
    }
  });

  chrome.extension.sendMessage({ fn: 'checkStatus' }, function (status) {
    var isAppRunning = status.isAppRunning,
      searchMode = status.searchMode;
    upload.disabled = isAppRunning;
    testBtn.disabled = !isAppRunning;
    goBtn.disabled = !isAppRunning;
    stopBtn.disabled = !isAppRunning;
    if (searchMode === 2) {
      $('ul li:nth-child(2)').click();
    }
    $('#saveOptions').val(status.saveOptions || 'fieldtagged');
    $('#fieldsSelection').val(status.fieldsSelection || 'fields_selection');
    $('#downloadInterval').val(status.downloadInterval || 10);

  });

  upload.addEventListener('change', function (evt) {
    var data = null;
    var file = evt.target.files[0];
    var reader = new FileReader();
    reader.readAsText(file);
    reader.onload = function (event) {
      var csvData = event.target.result;
      data = $.csv.toArrays(csvData);
      if (data && data.length > 0) {
        msgBox.innerHTML = '成功导入 ' + data.length + ' 条记录，点击"批量下载"开始下载';
        testBtn.disabled = false;
        goBtn.disabled = false;
        chrome.extension.sendMessage({ fn: "setQueryStrings", queryStrings: data });
      } else {
        msgBox.innerHTML = '导入失败，无数据!';
      }
      msgBox.style.display = 'block';

    };
    reader.onerror = function () {
      msgBox.innerHTML = '无法读取文件 ' + file.fileName;
      msgBox.style.display = 'block';
    };
  }, false);

  $('#saveOptions').change(function () {
    chrome.extension.sendMessage({ fn: "setSaveOptions", saveOptions: this.value });
  });

  $('#fieldsSelection').change(function () {
    chrome.extension.sendMessage({ fn: "setFieldsSelection", fieldsSelection: this.value });
  });

  $('#downloadInterval').change(function () {
    if (!this.value) {
      this.value = 10;
    }
    chrome.extension.sendMessage({ fn: "setDownloadInterval", downloadInterval: parseInt(this.value) });
  });

  var startup = function (searchMode, isDryRun) {
    chrome.extension.sendMessage({ fn: 'startup', searchMode: searchMode, isDryRun: isDryRun }, function () {
      this.disabled = true;
      upload.disabled = true;
      stopBtn.disabled = false;

      var url = searchMode === 2 ? 'https://apps.webofknowledge.com/WOS_GeneralSearch_input.do?product=WOS&search_mode=GeneralSearch' :
        database.value === '0' ? 'https://apps.webofknowledge.com/WOS_AdvancedSearch_input.do?product=WOS&search_mode=AdvancedSearch' :
          database.value === '1' ? 'https://apps.webofknowledge.com/DIIDW_AdvancedSearch_input.do?product=DIIDW&search_mode=AdvancedSearch' :
            'https://apps.webofknowledge.com/CSCD_AdvancedSearch_input.do?product=CSCD&search_mode=AdvancedSearch';

      chrome.tabs.create({ url: url });
    });
  };

  testBtn.addEventListener('click', function () {
    var searchMode = $('#advancedSearch').is('.selected') ? 1 : 2;
    startup(searchMode, true);
  });

  goBtn.addEventListener('click', function () {
    // Search Mode: 1. Advanced Search  2. General Search
    var searchMode = $('#advancedSearch').is('.selected') ? 1 : 2;
    startup(searchMode);
  });

  stopBtn.addEventListener('click', function () {
    chrome.extension.sendMessage({ fn: 'destroy' });
    this.disabled = true;
    upload.disabled = false;
    goBtn.disabled = false;
  });

  var checkAppRunning = setInterval(function () {
    chrome.extension.sendMessage({ fn: 'checkStatus' }, function (status) {
      if (!status.isAppRunning) {
        clearInterval(checkAppRunning);
        upload.disabled = false;
        testBtn.disabled = true;
        goBtn.disabled = true;
        stopBtn.disabled = true;
      }
    });

  }, 2000);

}

document.addEventListener('DOMContentLoaded', init);
