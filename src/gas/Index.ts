import AppsScriptHttpRequestEvent = GoogleAppsScript.Events.AppsScriptHttpRequestEvent;

function doGet(request: AppsScriptHttpRequestEvent) {
  return HtmlService.createTemplateFromFile('dist/Index').evaluate();
}
