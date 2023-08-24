// Set up a trigger to run the processCSV function
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('StackIt')
    .addItem('Import CSV', 'showUI')
    .addToUi();
}

// Function to open the sidebar HTML
function showUI() {
  var html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('CSV Importer')
      .setWidth(300);
  SpreadsheetApp.getUi().showSidebar(html);
}

// Function to process the CSV data and append it to the Google Sheet
function importData(csvData) {
  const ui = SpreadsheetApp.getUi()
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sheet = ss.getActiveSheet();

  var csvRows = csvData.split('\n');
  var headerRow = csvRows[0].split(',');

  // Find the last row with data in the sheet
  var lastRow = sheet.getLastRow();

  // If there is existing data, compare header to ensure appending only
  if (lastRow > 0) {
    var existingHeader = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (arraysEqual(existingHeader, headerRow)) {
      // Append new rows to the sheet, skipping the header row
      for (var i = 1; i < csvRows.length; i++) {
        var rowData = csvRows[i].split(',');
        sheet.appendRow(rowData);
      }
    } else {
      throw new Error("CSV headers don't match the existing sheet's headers.");
    }
  } else {
    // Append all rows to the sheet since it's empty
    for (var i = 0; i < csvRows.length; i++) {
      var rowData = csvRows[i].split(',');
      sheet.appendRow(rowData);
    }
  }

  // Show success message and ask for email if user wants to receive CSV analytics
  const response = ui.alert("Successfully imported CSV. Do you want to create Visualizations?", ui.ButtonSet.YES_NO)

  const data = Utilities.parseCsv(csvData)

  if (response == ui.Button.YES) {
    const email = ui.prompt("Enter your email").getResponseText()
    sendEmail(email, "Visualisation from your recent imports with StackIt", `<h2>Here are the analytics for your CSV File</h2><img src="cid:barChart"><img src="cid:areaChart">`, createGraphFromData(data))
  }

  const chart = HtmlService.createHtmlOutputFromFile("visuals").getContent().replace("SHEET_URL_HERE", `"${getURL()}"`)
  ui.showModalDialog(HtmlService.createHtmlOutput(chart).setHeight(1000).setWidth(1000), "CSV Visualizations")
}

// Compare two arrays for equality
function arraysEqual(arr1, arr2) {
  if (arr1.length !== arr2.length) return false;
  for (var i = 0; i < arr1.length; i++) {
    if (arr1[i] !== arr2[i]) return false;
  }
  return true;
}

function getURL() {
  return SpreadsheetApp.getActiveSpreadsheet().getUrl()
}

function sendEmail(receiver, subject, htmlBody, inlineImages) {
  GmailApp.sendEmail(receiver, subject, "", {
    htmlBody: htmlBody,
    inlineImages: inlineImages
  })
}

function createGraphFromData(csvData) {
  var data = Charts.newDataTable()

  // Add columns using csvData[0]
  for (var i = 0; i < csvData[0].length; i++) {
    // check the next row to see if it is a number or not
    var isNumber = !isNaN(csvData[1][i])

    // add column with the correct type
    if (isNumber) {
      data.addColumn(Charts.ColumnType.NUMBER, csvData[0][i])
    }
    else {
      data.addColumn(Charts.ColumnType.STRING, csvData[0][i])
    }
  }

  // Add rows using csvData rows
  for (var i = 1; i < csvData.length; i++) {
    data.addRow(csvData[i])
  }

  // Create chart
  var barChart = Charts.newBarChart()
    .setDataTable(data)
    .setDimensions(1000, 1000)
    .build()

  var areaChart = Charts.newAreaChart()
    .setDataTable(data)
    .setDimensions(1000, 1000)
    .build()

  // return charts as blobs for inline images
  return {
    barChart: barChart.getBlob(),
    areaChart: areaChart.getBlob()
  }
}


