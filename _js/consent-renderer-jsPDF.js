(function(window) {
    "use strict";

    var PDF_BODY_FONT_SIZE_PT = 9.25;
    var PDF_BODY_LINE_HEIGHT = 1.25;
    var PDF_TITLE_FONT_SIZE_PT = 16;
    var PDF_SECTION_HEADING_FONT_SIZE_PT = 11;
    var PDF_SUBHEADING_FONT_SIZE_PT = 9;

    var PDF_MARGIN_TOP_MM = 22;
    var PDF_MARGIN_RIGHT_MM = 14;
    var PDF_MARGIN_BOTTOM_MM = 16;
    var PDF_MARGIN_LEFT_MM = 14;

    var MM_PER_PT = 0.352777778;
    var PAGE_WIDTH_MM = 210;
    var PAGE_HEIGHT_MM = 297;
    var CONTENT_WIDTH_MM = PAGE_WIDTH_MM - PDF_MARGIN_LEFT_MM - PDF_MARGIN_RIGHT_MM;

    function escapeHtml(value) {
        if (value === null || value === undefined) {
            return "";
        }

        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/\"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function renderLines(lines, paragraphClass, paragraphStyle) {
        var classAttribute = paragraphClass ? " class=\"" + paragraphClass + "\"" : "";
        var styleAttribute = paragraphStyle ? " style=\"" + paragraphStyle + "\"" : "";

        return (lines || []).map(function(line) {
            return "<p" + classAttribute + styleAttribute + ">" + escapeHtml(line) + "</p>";
        }).join("");
    }

    function renderChecklist(section) {
        if (!section.checklist || !section.checklist.length) {
            return "";
        }

        return [
            "<div class=\"preview-signature\">",
            "<ul class=\"preview-checklist\">",
            section.checklist.map(function(item) {
                return "<li><span class=\"preview-checkbox\" aria-hidden=\"true\"></span><span>" + escapeHtml(item) + "</span></li>";
            }).join(""),
            "</ul>",
            "<div class=\"signature-grid\"><div><div class=\"signature-line\"></div><p>" + escapeHtml(section.signature.leftLabel) + "</p><div class=\"signature-line\"></div><p>" + escapeHtml(section.signature.dateLabel) + "</p></div><div><div class=\"signature-line\"></div><p>" + escapeHtml(section.signature.rightLabel) + "</p></div></div>",
            "</div>"
        ].join("");
    }

    function renderHtml(documentModel) {
        var html = ["<div class=\"preview-document pdf-document\">"];
        html.push("<h1>" + escapeHtml(documentModel.title) + "</h1>");
        html.push("<p>" + escapeHtml(documentModel.introParagraph) + "</p>");
        html.push("<ul class=\"intro-list\">" + (documentModel.introBullets || []).map(function(item) {
            return "<li>" + escapeHtml(item) + "</li>";
        }).join("") + "</ul>");
        html.push("<p>" + escapeHtml(documentModel.responsibilityParagraph) + "</p>");

        (documentModel.sections || []).forEach(function(section, index) {
            html.push("<section>");
            html.push("<h2>" + escapeHtml((index + 1) + ". " + section.heading) + "</h2>");

            (section.paragraphs || []).forEach(function(paragraph) {
                html.push("<p>" + escapeHtml(paragraph) + "</p>");
            });

            if (section.orderedList && section.orderedList.length) {
                html.push("<ol>" + section.orderedList.map(function(item) {
                    return "<li>" + escapeHtml(item) + "</li>";
                }).join("") + "</ol>");
            }

            (section.postListParagraphs || []).forEach(function(paragraph) {
                html.push("<p>" + escapeHtml(paragraph) + "</p>");
            });

            if (section.columns && section.columns.length) {
                html.push("<div class=\"preview-two-column\">" + section.columns.map(function(column) {
                    return "<div><h3>" + escapeHtml(column.title) + "</h3>" + renderLines(column.lines, "preview-contact-line") + "</div>";
                }).join("") + "</div>");
            }

            html.push(renderChecklist(section));
            html.push("</section>");
        });

        html.push("</div>");
        return html.join("");
    }

    function getConsentLanguage(documentModel) {
        var value = "";

        if (documentModel && documentModel.language !== undefined && documentModel.language !== null) {
            value = String(documentModel.language).trim().toLowerCase();
        }

        if (!value) {
            var select = window.document.getElementById("selectLanguage");
            if (select) {
                value = String(select.value || "").trim().toLowerCase();
            }
        }

        if (value === "de" || value === "deutsch" || value === "german" || value.indexOf("de") === 0) {
            return "de";
        }

        return "en";
    }

    function getPageLabel(documentModel) {
        return getConsentLanguage(documentModel) === "de" ? "Seite" : "Page";
    }

    function splitHeaderLines(value) {
        if (value === null || value === undefined) {
            return [];
        }

        return String(value)
            .split(/\r?\n/)
            .map(function(line) {
                return line.trim();
            })
            .filter(function(line) {
                return line.length > 0;
            });
    }

    function getJsPdfCtor() {
        if (window.jspdf && window.jspdf.jsPDF) {
            return window.jspdf.jsPDF;
        }

        if (window.jsPDF) {
            return window.jsPDF;
        }

        throw new Error("jsPDF is not loaded.");
    }

    function getFontRegistrationScript(variableName) {
        if (!variableName || typeof window[variableName] !== "string") {
            return "";
        }

        return window[variableName];
    }

    function registerFontScript(doc, scriptSource) {
        if (!scriptSource) {
            return;
        }

        var registerFont = new Function("doc", scriptSource);
        registerFont(doc);
    }

    function ensureRobotoFonts(doc) {
        var fontList = typeof doc.getFontList === "function" ? doc.getFontList() : {};
        var hasRegular = Array.isArray(fontList["Roboto-Regular"]) && fontList["Roboto-Regular"].indexOf("normal") !== -1;
        var hasMedium = Array.isArray(fontList["Roboto-Medium"]) && fontList["Roboto-Medium"].indexOf("normal") !== -1;

        if (!hasRegular) {
            registerFontScript(doc, getFontRegistrationScript("includeRobotoFontNormal"));
        }

        if (!hasMedium) {
            registerFontScript(doc, getFontRegistrationScript("includeRobotoFontMedium"));
        }
    }

    function ptToMm(pt) {
        return pt * MM_PER_PT;
    }

    function lineHeightMm(fontSizePt, lineHeightMultiplier) {
        return ptToMm(fontSizePt) * lineHeightMultiplier;
    }

    function createLayoutEngine(doc, documentModel) {
        var cursorY = PDF_MARGIN_TOP_MM;
        var pageLabel = getPageLabel(documentModel);
        var headerLines = splitHeaderLines(documentModel.headerAffiliation || "");
        var bodyBottomLimit = PAGE_HEIGHT_MM - PDF_MARGIN_BOTTOM_MM;
        var headerY = 11.5;
        var headerLineHeight = 3.2;

        function applyPageHeader(pageNumber, totalPages) {
            var pageWidth = doc.internal.pageSize.getWidth();

            doc.setFont("Roboto-Regular", "normal");
            doc.setFontSize(8);
            doc.setTextColor(71, 85, 105);

            headerLines.forEach(function(line, index) {
                doc.text(line, PDF_MARGIN_LEFT_MM, headerY + (index * headerLineHeight));
            });

            doc.text(
                pageLabel + " " + pageNumber + "/" + totalPages,
                pageWidth - PDF_MARGIN_RIGHT_MM,
                headerY,
                { align: "right" }
            );
        }

        function setBodyFont() {
            doc.setFont("Roboto-Regular", "normal");
            doc.setFontSize(PDF_BODY_FONT_SIZE_PT);
            doc.setTextColor(17, 24, 39);
        }

        function setBoldFont(sizePt) {
            doc.setFont("Roboto-Medium", "normal");
            doc.setFontSize(sizePt);
            doc.setTextColor(17, 24, 39);
        }

        function applyHeadersToAllPages() {
            var totalPages = doc.internal.getNumberOfPages();

            for (var pageNumber = 1; pageNumber <= totalPages; pageNumber += 1) {
                doc.setPage(pageNumber);
                applyPageHeader(pageNumber, totalPages);
            }
        }

        function newPage() {
            doc.addPage();
            cursorY = PDF_MARGIN_TOP_MM;
        }

        function ensureSpace(requiredHeightMm) {
            if (cursorY + requiredHeightMm > bodyBottomLimit) {
                newPage();
            }
        }

        function drawWrappedText(lines, x, startY, lineHeightValue) {
            lines.forEach(function(line, index) {
                doc.text(line, x, startY + (index * lineHeightValue));
            });
        }

        function estimateParagraphHeight(text) {
            if (!text) {
                return 0;
            }

            setBodyFont();

            var lines = doc.splitTextToSize(String(text), CONTENT_WIDTH_MM);
            var lh = lineHeightMm(PDF_BODY_FONT_SIZE_PT, PDF_BODY_LINE_HEIGHT);
            return lines.length * lh;
        }

        function estimateOrderedListHeight(items) {
            if (!items || !items.length) {
                return 0;
            }

            setBodyFont();

            var numberColumnWidth = 7;
            var textWidth = CONTENT_WIDTH_MM - numberColumnWidth;
            var lh = lineHeightMm(PDF_BODY_FONT_SIZE_PT, PDF_BODY_LINE_HEIGHT);
            var totalHeight = 0;

            items.forEach(function(item) {
                var lines = doc.splitTextToSize(String(item), textWidth);
                totalHeight += (lines.length * lh) + 1.0;
            });

            return totalHeight;
        }

        function estimateHeadingWithFirstBlock(text, sizePt, marginBottomMm, marginTopMm, firstBlockHeightMm) {
            setBoldFont(sizePt);

            var headingLines = doc.splitTextToSize(String(text || ""), CONTENT_WIDTH_MM);
            var headingHeight = headingLines.length * lineHeightMm(sizePt, 1.08);
            var combinedHeight = headingHeight + marginBottomMm + (firstBlockHeightMm || 0);

            if (marginTopMm) {
                combinedHeight += marginTopMm;
            }

            return combinedHeight;
        }

        function keepHeadingWithNextBlock(text, sizePt, marginBottomMm, marginTopMm, firstBlockHeightMm) {
            ensureSpace(estimateHeadingWithFirstBlock(text, sizePt, marginBottomMm, marginTopMm, firstBlockHeightMm));
        }

        function addParagraph(text, marginBottomMm) {
            if (!text) {
                return;
            }

            setBodyFont();

            var lines = doc.splitTextToSize(String(text), CONTENT_WIDTH_MM);
            var lh = lineHeightMm(PDF_BODY_FONT_SIZE_PT, PDF_BODY_LINE_HEIGHT);
            var blockHeight = lines.length * lh;

            ensureSpace(blockHeight);
            drawWrappedText(lines, PDF_MARGIN_LEFT_MM, cursorY, lh);
            cursorY += blockHeight + marginBottomMm;
        }

        function addBulletList(items, marginBottomAfterListMm) {
            if (!items || !items.length) {
                return;
            }

            setBodyFont();

            var bulletIndent = 4;
            var textWidth = CONTENT_WIDTH_MM - bulletIndent;
            var lh = lineHeightMm(PDF_BODY_FONT_SIZE_PT, PDF_BODY_LINE_HEIGHT);

            items.forEach(function(item) {
                var lines = doc.splitTextToSize(String(item), textWidth);
                var blockHeight = lines.length * lh;

                ensureSpace(blockHeight);
                doc.text("\u2022", PDF_MARGIN_LEFT_MM, cursorY);
                drawWrappedText(lines, PDF_MARGIN_LEFT_MM + bulletIndent, cursorY, lh);
                cursorY += blockHeight + 0.85;
            });

            cursorY += Math.max(0, marginBottomAfterListMm - 0.85);
        }

        function addOrderedList(items, marginBottomAfterListMm) {
            if (!items || !items.length) {
                return;
            }

            setBodyFont();

            var numberColumnWidth = 7;
            var textX = PDF_MARGIN_LEFT_MM + numberColumnWidth;
            var textWidth = CONTENT_WIDTH_MM - numberColumnWidth;
            var lh = lineHeightMm(PDF_BODY_FONT_SIZE_PT, PDF_BODY_LINE_HEIGHT);

            items.forEach(function(item, index) {
                var marker = String(index + 1) + ".";
                var lines = doc.splitTextToSize(String(item), textWidth);
                var blockHeight = lines.length * lh;

                ensureSpace(blockHeight);
                doc.text(marker, PDF_MARGIN_LEFT_MM, cursorY);
                drawWrappedText(lines, textX, cursorY, lh);
                cursorY += blockHeight + 1.0;
            });

            cursorY += Math.max(0, marginBottomAfterListMm - 1.0);
        }

        function addHeading(text, sizePt, marginBottomMm, marginTopMm) {
            if (!text) {
                return;
            }

            if (marginTopMm) {
                cursorY += marginTopMm;
            }

            setBoldFont(sizePt);

            var lh = lineHeightMm(sizePt, 1.08);
            var lines = doc.splitTextToSize(String(text), CONTENT_WIDTH_MM);
            var blockHeight = lines.length * lh;

            ensureSpace(blockHeight);
            drawWrappedText(lines, PDF_MARGIN_LEFT_MM, cursorY, lh);
            cursorY += blockHeight + marginBottomMm;
        }

        function addColumns(columns) {
            if (!columns || !columns.length) {
                return;
            }

            var colGap = 6;
            var colWidth = (CONTENT_WIDTH_MM - colGap) / 2;
            var leftX = PDF_MARGIN_LEFT_MM;
            var rightX = PDF_MARGIN_LEFT_MM + colWidth + colGap;
            var startY = cursorY;
            var estimatedHeight = estimateColumnsHeight(columns, colWidth);

            ensureSpace(estimatedHeight);

            var endYs = columns.map(function(column, index) {
                var x = index === 0 ? leftX : rightX;
                var y = startY;

                setBoldFont(PDF_SUBHEADING_FONT_SIZE_PT);
                var headingLh = lineHeightMm(PDF_SUBHEADING_FONT_SIZE_PT, 1.08);
                var headingLines = doc.splitTextToSize(String(column.title || ""), colWidth);
                drawWrappedText(headingLines, x, y, headingLh);
                y += headingLines.length * headingLh + 0.85;

                setBodyFont();
                var bodyLh = lineHeightMm(PDF_BODY_FONT_SIZE_PT, PDF_BODY_LINE_HEIGHT);

                (column.lines || []).forEach(function(line) {
                    var wrapped = doc.splitTextToSize(String(line), colWidth);
                    drawWrappedText(wrapped, x, y, bodyLh);
                    y += wrapped.length * bodyLh + 0.45;
                });

                return y;
            });

            cursorY = Math.max.apply(null, endYs) + 2.0;
        }

        function estimateColumnsHeight(columns, colWidth) {
            var heights = columns.map(function(column) {
                var total = 0;

                doc.setFont("Roboto-Medium", "normal");
                doc.setFontSize(PDF_SUBHEADING_FONT_SIZE_PT);
                total += doc.splitTextToSize(String(column.title || ""), colWidth).length * lineHeightMm(PDF_SUBHEADING_FONT_SIZE_PT, 1.08) + 0.85;

                doc.setFont("Roboto-Regular", "normal");
                doc.setFontSize(PDF_BODY_FONT_SIZE_PT);

                (column.lines || []).forEach(function(line) {
                    total += doc.splitTextToSize(String(line), colWidth).length * lineHeightMm(PDF_BODY_FONT_SIZE_PT, PDF_BODY_LINE_HEIGHT) + 0.45;
                });

                return total;
            });

            return Math.max.apply(null, heights) + 2.0;
        }

        function addChecklist(section) {
            if (!section.checklist || !section.checklist.length) {
                return;
            }

            var lh = lineHeightMm(PDF_BODY_FONT_SIZE_PT, PDF_BODY_LINE_HEIGHT);
            var estimatedHeight = (section.checklist.length * (lh + 1.3)) + 32;

            ensureSpace(estimatedHeight);

            cursorY += 3;

            setBodyFont();
            section.checklist.forEach(function(item) {
                doc.rect(PDF_MARGIN_LEFT_MM, cursorY - 3.2, 4, 4);
                var lines = doc.splitTextToSize(String(item), CONTENT_WIDTH_MM - 6);
                drawWrappedText(lines, PDF_MARGIN_LEFT_MM + 6, cursorY, lh);
                cursorY += (lines.length * lh) + 2;
            });

            cursorY += 3;

            var leftColWidth = (CONTENT_WIDTH_MM - 6) / 2;
            var rightColX = PDF_MARGIN_LEFT_MM + leftColWidth + 6;
            var lineTopY = cursorY + 10;

            doc.setDrawColor(71, 85, 105);
            doc.setLineWidth(0.3);

            doc.line(PDF_MARGIN_LEFT_MM, lineTopY, PDF_MARGIN_LEFT_MM + leftColWidth, lineTopY);
            doc.line(PDF_MARGIN_LEFT_MM, lineTopY + 16, PDF_MARGIN_LEFT_MM + leftColWidth, lineTopY + 16);
            doc.line(rightColX, lineTopY, rightColX + leftColWidth, lineTopY);

            setBodyFont();
            doc.text(String(section.signature.leftLabel || ""), PDF_MARGIN_LEFT_MM, lineTopY + 5);
            doc.text(String(section.signature.dateLabel || ""), PDF_MARGIN_LEFT_MM, lineTopY + 21);
            doc.text(String(section.signature.rightLabel || ""), rightColX, lineTopY + 5);

            cursorY = lineTopY + 26;
        }

        return {
            addParagraph: addParagraph,
            addBulletList: addBulletList,
            addOrderedList: addOrderedList,
            addHeading: addHeading,
            addColumns: addColumns,
            addChecklist: addChecklist,
            estimateParagraphHeight: estimateParagraphHeight,
            estimateOrderedListHeight: estimateOrderedListHeight,
            estimateColumnsHeight: estimateColumnsHeight,
            keepHeadingWithNextBlock: keepHeadingWithNextBlock,
            applyHeadersToAllPages: applyHeadersToAllPages
        };
    }

    function createPdf(documentModel, filename) {
        var JsPdfCtor = getJsPdfCtor();
        var doc = new JsPdfCtor({
            unit: "mm",
            format: "a4",
            orientation: "portrait"
        });

        ensureRobotoFonts(doc);

        var layout = createLayoutEngine(doc, documentModel);

        function getFirstSectionBlockHeight(section) {
            if (section.paragraphs && section.paragraphs.length) {
                return layout.estimateParagraphHeight(section.paragraphs[0]) + 1.6;
            }

            if (section.orderedList && section.orderedList.length) {
                return layout.estimateOrderedListHeight([section.orderedList[0]]) + 1.6;
            }

            if (section.postListParagraphs && section.postListParagraphs.length) {
                return layout.estimateParagraphHeight(section.postListParagraphs[0]) + 1.6;
            }

            if (section.columns && section.columns.length) {
                return layout.estimateColumnsHeight(section.columns, (CONTENT_WIDTH_MM - 6) / 2);
            }

            if (section.checklist && section.checklist.length) {
                return 16;
            }

            return 0;
        }

        layout.addHeading(documentModel.title || "", PDF_TITLE_FONT_SIZE_PT, 2.4, 0);
        layout.addParagraph(documentModel.introParagraph || "", 1.6);
        layout.addBulletList(documentModel.introBullets || [], 1.6);
        layout.addParagraph(documentModel.responsibilityParagraph || "", 2.0);

        (documentModel.sections || []).forEach(function(section, index) {
            layout.keepHeadingWithNextBlock(
                (index + 1) + ". " + (section.heading || ""),
                PDF_SECTION_HEADING_FONT_SIZE_PT,
                1.6,
                3.0,
                getFirstSectionBlockHeight(section)
            );
            layout.addHeading((index + 1) + ". " + (section.heading || ""), PDF_SECTION_HEADING_FONT_SIZE_PT, 1.6, 3.0);

            if (section.paragraphs && section.paragraphs.length) {
                section.paragraphs.forEach(function(paragraph) {
                    layout.addParagraph(paragraph, 1.6);
                });
            }

            if (section.orderedList && section.orderedList.length) {
                layout.addOrderedList(section.orderedList, 1.6);
            }

            if (section.postListParagraphs && section.postListParagraphs.length) {
                section.postListParagraphs.forEach(function(paragraph) {
                    layout.addParagraph(paragraph, 1.6);
                });
            }

            if (section.columns && section.columns.length) {
                layout.addColumns(section.columns);
            }

            if (section.checklist && section.checklist.length) {
                layout.addChecklist(section);
            }
        });

        layout.applyHeadersToAllPages();

        return {
            save: function(saveName) {
                doc.save(saveName || filename || "informed-consent.pdf");
            },
            getBlobUrl: function() {
                return doc.output("bloburl");
            },
            getPageCount: function() {
                return doc.internal.getNumberOfPages();
            }
        };
    }

    async function renderPdfPreview(documentModel, selector) {
        var pdfHandle = createPdf(documentModel, "informed-consent-preview.pdf");
        var container = window.document.querySelector(selector);

        if (container) {
            container.innerHTML = "";
            var iframe = window.document.createElement("iframe");
            iframe.className = "preview-pdf-frame";
            iframe.setAttribute("title", "PDF preview");
            iframe.src = pdfHandle.getBlobUrl();
            container.appendChild(iframe);
        }

        return pdfHandle;
    }

    window.ConsentGeneratorRenderer = {
        escapeHtml: escapeHtml,
        renderHtml: renderHtml,
        createPdf: createPdf,
        renderPdfPreview: renderPdfPreview
    };
})(window);
