import AppsScriptHttpRequestEvent = GoogleAppsScript.Events.AppsScriptHttpRequestEvent;

function doGet(request: AppsScriptHttpRequestEvent) {
  return HtmlService.createHtmlOutputFromFile('dist/Index');
}
