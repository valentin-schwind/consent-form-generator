const path = require("path");

function loadJsdom() {
    try {
        return require("jsdom");
    } catch (error) {
        return require(path.resolve(__dirname, "../../study-power-analysis/node_modules/jsdom"));
    }
}

const { JSDOM, VirtualConsole } = loadJsdom();

const rootDir = path.resolve(__dirname, "..");
const indexPath = path.join(rootDir, "index.html");

const virtualConsole = new VirtualConsole();
virtualConsole.on("log", (...args) => console.log("[browser log]", ...args));
virtualConsole.on("warn", (...args) => console.warn("[browser warn]", ...args));
virtualConsole.on("error", (...args) => console.error("[browser error]", ...args));
virtualConsole.on("jsdomError", (error) => console.error("[jsdom error]", error.message));

async function main() {
    const dom = await JSDOM.fromFile(indexPath, {
        url: "file://" + indexPath.replace(/\\/g, "/"),
        resources: "usable",
        runScripts: "dangerously",
        pretendToBeVisual: true,
        virtualConsole,
        beforeParse(window) {
            window.alert = (message) => {
                throw new Error("Unexpected alert: " + message);
            };
            window.HTMLCanvasElement.prototype.getContext = () => ({});
            window.URL.createObjectURL = () => "blob:mock-pdf";
        }
    });

    const { window } = dom;

    await new Promise((resolve) => {
        window.addEventListener("load", () => setTimeout(resolve, 1200));
    });

    const exampleButton = window.document.querySelector("#btnExample");
    const generateButton = window.document.querySelector("#btnGenerate");
    if (!exampleButton || !generateButton) {
        throw new Error("UI buttons are missing.");
    }

    exampleButton.click();
    generateButton.click();

    await new Promise((resolve) => setTimeout(resolve, 1200));

    const previewHtml = window.document.querySelector("#previewHTML")?.textContent || "";
    const previewPdfFrame = window.document.querySelector("#previewPDF iframe");
    const resultsVisible = !window.document.querySelector("#resultsView")?.classList.contains("d-none");
    const currentDocument = window.ConsentGenerator?.getCurrentDocument?.();
    const currentPdf = window.ConsentGenerator?.getCurrentPdf?.();

    if (!resultsVisible) {
        throw new Error("Results view did not become visible.");
    }
    if (!currentDocument || !currentDocument.sections || currentDocument.sections.length < 5) {
        throw new Error("Consent document model was not generated correctly.");
    }
    if (!previewHtml.includes("Virtual Reality") && !previewHtml.includes("virtuellen")) {
        throw new Error("Preview text does not contain expected example content.");
    }
    if (previewHtml.includes("<script")) {
        throw new Error("Preview contains unsafe script markup.");
    }
    if (!previewPdfFrame || previewPdfFrame.getAttribute("src") !== "blob:mock-pdf") {
        throw new Error("PDF preview was not rendered through jsPDF.");
    }
    if (!currentPdf || typeof currentPdf.getPageCount !== "function" || currentPdf.getPageCount() < 1) {
        throw new Error("jsPDF handle was not generated correctly.");
    }

    console.log("[test] runtime checks passed");
}

main().catch((error) => {
    console.error("[fatal]", error && error.stack ? error.stack : error);
    process.exitCode = 1;
});
