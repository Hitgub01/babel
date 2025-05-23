import browserCompatData from "@mdn/browser-compat-data" with { type: "json" };
import { addElectronSupportFromChromium } from "./chromium-to-electron.mjs";
import { writeFile, babel7Only } from "./utils-build-data.mjs";

const compatData = browserCompatData.javascript;
const browserNameMaps = {
  // Map @mdn/browser-compat-data to browserslist browser names
  toBrowserslist: {
    chrome_android: "and_chr",
    firefox_android: "and_ff",
    safari_ios: "ios",
    nodejs: "node",
    webview_android: "android",
    webview_ios: "ios",
    opera_android: "op_mob",
    samsunginternet_android: "samsung",
  },
  // Map @mdn/browser-compat-data to kangax/compat-table engine names
  toCompatTable: {
    chrome_android: "chrome",
    firefox_android: "firefox",
    safari_ios: "ios",
    nodejs: "node",
    webview_android: "android",
    webview_ios: "ios",
    opera_android: "opera_mobile",
    samsunginternet_android: "samsung",
  },
};

const browserSupportMap = {
  android: "chrome_android", // map to chrome here as Android WebView 61 is Chromium-based
};

function browserVersion(browser, version_added) {
  if (browser === "samsunginternet_android" && version_added === "8.0") {
    return "8.2"; // samsung 8.0 is not defined in browserslist
  }
  return version_added;
}

function generateModuleSupport(source, toCompatTable) {
  const stats = source.__compat.support;
  const allowedBrowsers = {};
  const browserNameMap = toCompatTable
    ? browserNameMaps.toCompatTable
    : browserNameMaps.toBrowserslist;

  Object.keys(stats).forEach(browser => {
    const browserName = browserNameMap[browser] || browser;
    // todo: remove this when we support oculus
    if (browserName === "oculus") return;
    let browserSupport = stats[browserSupportMap[browserName] || browser];
    if (Array.isArray(browserSupport)) {
      browserSupport = browserSupport[0]; // The first item is the most progressive support
    }
    if (
      browserSupport.version_added &&
      !browserSupport.flags &&
      !browserSupport.partial_implementation
    ) {
      allowedBrowsers[browserName] = browserVersion(
        browser,
        browserSupport.version_added
      );
    }
  });
  addElectronSupportFromChromium(allowedBrowsers);

  return allowedBrowsers;
}

const dataURL = new URL("../data/native-modules.json", import.meta.url);
const processed = generateModuleSupport(compatData.statements.export, false);
// todo: restore deno support when browserslist recognizes deno
delete processed.deno;
babel7Only(() => {
  if (processed.ios) {
    processed.ios_saf = processed.ios;
  }
});
const data = {
  "es6.module": processed,
};
writeFile(data, dataURL, "native-modules");
export { generateModuleSupport };
