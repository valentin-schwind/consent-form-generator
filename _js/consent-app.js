(function(window, $) {
    "use strict";

    var appState = {
        snippets: null,
        currentSettings: null,
        currentDocument: null,
        currentPdf: null
    };

    var SELECT_OPTIONS = {
        languages: [
            { label: "Please select", value: "" },
            { label: "English", value: "en" },
            { label: "German", value: "de" }
        ],
        institutions: [
            { label: "Please select", value: "" },
            { label: "Frankfurt University of Applied Sciences", value: "frauas" },
            { label: "University of Regensburg", value: "regensburg" },
            { label: "Hochschule der Medien Stuttgart", value: "hdm" },
            { label: "University Bremen", value: "bremen" },
            { label: "Ludwig-Maximilians-Universität München", value: "lmu" },
            { label: "University of Stuttgart", value: "stuttgart" },
            { label: "Other", value: "other" }
        ],
        studyTypes: [
            { label: "Please select", value: "" },
            { label: "Online study (survey, apps, downloads, etc.)", value: "onlinestudy" },
            { label: "User study (lab study, mixed reality, eye-tracking, etc.)", value: "userstudy" },
            { label: "Field study (outside the lab, workplaces, in-situ, etc.)", value: "fieldstudy" },
            { label: "Interview (focus groups, expert interviews, use cases, diaries, etc.)", value: "qualitativestudy" }
        ],
        durationUnits: [
            { label: "Please select", value: "" },
            { label: "Minutes", value: "minutes" },
            { label: "Hours", value: "hours" },
            { label: "Days", value: "days" },
            { label: "Weeks", value: "weeks" }
        ],
        anonymization: [
            { label: "Please select", value: "" },
            { label: "No - not anonymized", value: "no" },
            { label: "Yes - pseudonymized (recommended)", value: "pseudo" },
            { label: "Yes - fully anonymized", value: "full" }
        ],
        publication: [
            { label: "Please select", value: "" },
            { label: "Including the raw data set", value: "full" },
            { label: "The aggregated results only", value: "aggregated" }
        ],
        dataEnd: [
            { label: "Please select", value: "" },
            { label: "Not specified (not longer than necessary)", value: "0" },
            { label: "After 1 year", value: "1" },
            { label: "After 2 years", value: "2" },
            { label: "After 3 years", value: "3" },
            { label: "After 4 years", value: "4" },
            { label: "After 5 years", value: "5" },
            { label: "After 6 years", value: "6" },
            { label: "After 8 years", value: "8" },
            { label: "After 9 years", value: "9" },
            { label: "After 10 years (e.g., BMBF/DFG)", value: "10" },
            { label: "After 15 years", value: "15" },
            { label: "After 20 years", value: "20" }
        ],
        compensation: [
            { label: "Please select", value: "" },
            { label: "None", value: "compensation_none" },
            { label: "1 EUR", value: "compensation_1EUR" },
            { label: "5 EUR", value: "compensation_5EUR" },
            { label: "10 EUR", value: "compensation_10EUR" },
            { label: "15 EUR", value: "compensation_15EUR" },
            { label: "20 EUR", value: "compensation_20EUR" },
            { label: "1/2 credit point for the lecture", value: "compensation_halfcreditpoint" },
            { label: "1 credit point for the lecture (e.g., when you need 3 for the lecture)", value: "compensation_onecreditpoint" }
        ]
    };

    function populateSelect(selector, options) {
        var element = $(selector);
        element.empty();
        options.forEach(function(option) {
            element.append(new window.Option(option.label, option.value));
        });
    }

    function createProcedureStep(stepValue, index) {
        var wrapper = $("<div>").addClass("procedure-step").attr("data-index", index);
        var header = $("<div>").addClass("procedure-step-header");
        header.append($("<span>").addClass("procedure-step-title").text("Step " + (index + 1)));
        var removeButton = $("<button>")
            .attr({ type: "button", class: "btn btn-outline-danger btn-sm" })
            .text("Remove")
            .prop("disabled", $("#procedureContainer .procedure-step").length < 1);
        header.append(removeButton);
        wrapper.append(header);
        wrapper.append($("<textarea>")
            .attr({ class: "form-control procedure-step-input", rows: 3, placeholder: "Describe this study step", "aria-label": "Procedure step " + (index + 1) })
            .val(stepValue || ""));
        removeButton.on("click", function(event) {
            event.preventDefault();
            wrapper.remove();
            renumberProcedureSteps();
            syncProcedureButtons();
        });
        return wrapper;
    }

    function renumberProcedureSteps() {
        $("#procedureContainer .procedure-step").each(function(index, element) {
            $(element).attr("data-index", index);
            $(element).find(".procedure-step-title").text("Step " + (index + 1));
            $(element).find("textarea").attr("aria-label", "Procedure step " + (index + 1));
        });
    }

    function syncProcedureButtons() {
        var total = $("#procedureContainer .procedure-step").length;
        $("#btnAddProcedure").prop("disabled", total >= window.ConsentGeneratorState.MAX_PROCEDURE_STEPS);
        $("#procedureContainer .procedure-step button").prop("disabled", total <= 1);
    }

    function ensureProcedureSteps(steps) {
        var values = steps && steps.length ? steps : window.ConsentGeneratorState.DEFAULTS.procedureSteps;
        var container = $("#procedureContainer");
        container.empty();
        values.forEach(function(step, index) {
            container.append(createProcedureStep(step, index));
        });
        syncProcedureButtons();
    }

    function readProcedureSteps() {
        return $(".procedure-step-input").map(function() {
            return $(this).val().trim();
        }).get();
    }

    function getFormSettings() {
        var settings = {
            institution: $("#selectInstitution").val(),
            otherInstitution: $("#otherInstitution").val(),
            studyType: $("#selectStudyType").val(),
            language: $("#selectLanguage").val(),
            studyTitle: $("#setTitle").val(),
            studyPurpose: $("#setPurpose").val(),
            studyGoal: $("#setGoal").val(),
            startDate: $("#daterangepicker").data("daterangepicker").startDate.format("MM/DD/YYYY"),
            endDate: $("#daterangepicker").data("daterangepicker").endDate.format("MM/DD/YYYY"),
            studyDuration: $("#setDuration").val(),
            studyDurationUnit: $("#selectDurationUnit").val(),
            participants: $("#setParticipants").val(),
            repeatedParticipationAllowed: $("#repeatedParticipationAllowed").prop("checked"),
            uncomfortableQuestions: $("#uncomfortableQuestions").prop("checked"),
            compensation: $("#selectCompensation").val(),
            procedureSteps: readProcedureSteps(),
            dateOfDataEnd: $("#selectDateOfDataEnd").val(),
            anonymization: $("#selectAnonymization").val(),
            publication: $("#selectPublication").val(),
            principalInvestigator: $("#setPrincipleInvestigator").val(),
            principalInvestigatorEmail: $("#setPrincipleInvestigatorEmail").val(),
            researcherNames: $("#setResearcherNames").val(),
            researcherEmails: $("#setResearcherEmails").val(),
            funding: $("#setFunding").val(),
            ethicalComittee: $("#setEthicalComittee").val()
        };

        window.ConsentGeneratorState.DATA_KEYS.forEach(function(key) {
            settings[key] = $("#" + key).prop("checked");
        });

        return window.ConsentGeneratorState.normalizeSettings(settings);
    }

    function applySettings(settings) {
        var normalized = window.ConsentGeneratorState.normalizeSettings(settings);
        $("#selectInstitution").val(normalized.institution);
        $("#otherInstitution").val(normalized.otherInstitution);
        $("#selectStudyType").val(normalized.studyType);
        $("#selectLanguage").val(normalized.language);
        $("#setTitle").val(normalized.studyTitle);
        $("#setPurpose").val(normalized.studyPurpose);
        $("#setGoal").val(normalized.studyGoal);
        $("#setDuration").val(normalized.studyDuration);
        $("#selectDurationUnit").val(normalized.studyDurationUnit);
        $("#setParticipants").val(normalized.participants);
        $("#selectCompensation").val(normalized.compensation);
        $("#selectDateOfDataEnd").val(normalized.dateOfDataEnd);
        $("#selectAnonymization").val(normalized.anonymization);
        $("#selectPublication").val(normalized.publication);
        $("#setPrincipleInvestigator").val(normalized.principalInvestigator);
        $("#setPrincipleInvestigatorEmail").val(normalized.principalInvestigatorEmail);
        $("#setResearcherNames").val(normalized.researcherNames);
        $("#setResearcherEmails").val(normalized.researcherEmails);
        $("#setFunding").val(normalized.funding);
        $("#setEthicalComittee").val(normalized.ethicalComittee);
        $("#repeatedParticipationAllowed").prop("checked", normalized.repeatedParticipationAllowed);
        $("#uncomfortableQuestions").prop("checked", normalized.uncomfortableQuestions);
        window.ConsentGeneratorState.DATA_KEYS.forEach(function(key) {
            $("#" + key).prop("checked", !!normalized[key]);
        });

        $("#daterangepicker").data("daterangepicker").setStartDate(moment(normalized.startDate, "MM/DD/YYYY"));
        $("#daterangepicker").data("daterangepicker").setEndDate(moment(normalized.endDate, "MM/DD/YYYY"));
        ensureProcedureSteps(normalized.procedureSteps);
        toggleOtherInstitutionRow();
        clearValidationState();
    }

    function clearValidationState() {
        $("#consentForm").removeClass("was-validated");
        $(".is-invalid-manual").removeClass("is-invalid-manual");
        $("#procedureErrorSummary").addClass("d-none").text("");
    }

    function toggleOtherInstitutionRow() {
        var show = $("#selectInstitution").val() === "other";
        $("#otherInstitutionRow").toggleClass("d-none", !show);
        $("#otherInstitution").prop("required", show);
    }

    function applyValidationResult(validation) {
        clearValidationState();
        var form = $("#consentForm");
        form.addClass("was-validated");
        var errors = validation.errors;

        if (errors.selectInstitution) {
            $("#selectInstitution").addClass("is-invalid-manual");
        }
        if (errors.otherInstitution) {
            $("#otherInstitution").addClass("is-invalid-manual");
        }
        if (errors.studyType) {
            $("#selectStudyType").addClass("is-invalid-manual");
        }
        if (errors.language) {
            $("#selectLanguage").addClass("is-invalid-manual");
        }
        if (errors.studyTitle) {
            $("#setTitle").addClass("is-invalid-manual");
        }
        if (errors.studyPurpose) {
            $("#setPurpose").addClass("is-invalid-manual");
        }
        if (errors.studyGoal) {
            $("#setGoal").addClass("is-invalid-manual");
        }
        if (errors.studyDuration) {
            $("#setDuration, #selectDurationUnit").addClass("is-invalid-manual");
        }
        if (errors.participants) {
            $("#setParticipants").addClass("is-invalid-manual");
        }
        if (errors.compensation) {
            $("#selectCompensation").addClass("is-invalid-manual");
        }
        if (errors.dateOfDataEnd) {
            $("#selectDateOfDataEnd").addClass("is-invalid-manual");
        }
        if (errors.anonymization) {
            $("#selectAnonymization").addClass("is-invalid-manual");
        }
        if (errors.publication) {
            $("#selectPublication").addClass("is-invalid-manual");
        }
        if (errors.principalInvestigator) {
            $("#setPrincipleInvestigator").addClass("is-invalid-manual");
        }
        if (errors.principalInvestigatorEmail) {
            $("#setPrincipleInvestigatorEmail").addClass("is-invalid-manual");
        }
        if (errors.researcherEmails) {
            $("#setResearcherEmails").addClass("is-invalid-manual");
        }
        if (errors.procedureSteps) {
            $("#procedureErrorSummary").removeClass("d-none").text(errors.procedureSteps);
        }

        return validation.isValid;
    }

    async function generateConsent() {
        var validation = window.ConsentGeneratorState.validateSettings(getFormSettings());
        if (!applyValidationResult(validation)) {
            return false;
        }

        appState.currentSettings = validation.settings;
        appState.currentDocument = window.ConsentGeneratorContent.buildConsentDocument(validation.settings, appState.snippets);
        $("#previewHTML").html(window.ConsentGeneratorRenderer.renderHtml(appState.currentDocument));
        $("#dversion").text("Generating PDF preview...");
        appState.currentPdf = await window.ConsentGeneratorRenderer.renderPdfPreview(appState.currentDocument, "#previewPDF");
        $("#dversion").text("PDF preview ready");
        $("#input").addClass("d-none");
        $("#resultsView").removeClass("d-none");
        return true;
    }

    function saveSettings() {
        var settings = getFormSettings();
        var file = new window.File([JSON.stringify(settings, null, 2)], "informed-consent-settings.txt", { type: "application/json;charset=utf-8" });
        window.saveAs(file, "informed-consent-settings.txt");
    }

    function downloadHtml() {
        if (!appState.currentDocument) {
            return;
        }
        var html = "<!doctype html><html><head><meta charset=\"utf-8\" /><title>Informed Consent</title><link rel=\"stylesheet\" href=\"_css/style.css\" /></head><body>" + window.ConsentGeneratorRenderer.renderHtml(appState.currentDocument) + "</body></html>";
        var file = new window.File([html], "informed-consent.html", { type: "text/html;charset=utf-8" });
        window.saveAs(file, "informed-consent.html");
    }

    async function downloadPdf() {
        if (!appState.currentDocument) {
            return;
        }
        if (!appState.currentPdf) {
            appState.currentPdf = await window.ConsentGeneratorRenderer.createPdf(appState.currentDocument);
        }
        appState.currentPdf.save("informed-consent.pdf");
    }

    function bindEvents() {
        $("#selectInstitution").on("change", toggleOtherInstitutionRow);
        $("#btnAddProcedure").on("click", function(event) {
            event.preventDefault();
            var total = $("#procedureContainer .procedure-step").length;
            if (total >= window.ConsentGeneratorState.MAX_PROCEDURE_STEPS) {
                return;
            }
            $("#procedureContainer").append(createProcedureStep("", total));
            renumberProcedureSteps();
            syncProcedureButtons();
        });
        $("#btnExample").on("click", function() {
            applySettings(window.ConsentGeneratorState.EXAMPLE);
        });
        $("#btnSave").on("click", saveSettings);
        $("#btnLoad").on("click", function() {
            $("#fileInput").trigger("click");
        });
        $("#fileInput").on("change", function() {
            var file = this.files && this.files[0];
            if (!file) {
                return;
            }
            var reader = new window.FileReader();
            reader.addEventListener("load", function() {
                try {
                    applySettings(JSON.parse(reader.result));
                } catch (error) {
                    window.alert("The selected settings file could not be read.");
                }
                $("#fileInput").val(null);
            });
            reader.readAsText(file);
        });
        $("#btnBack").on("click", function() {
            $("#resultsView").addClass("d-none");
            $("#input").removeClass("d-none");
        });
        $("#btnDownloadHtml").on("click", downloadHtml);
        $("#btnDownloadPdf").on("click", function() {
            void downloadPdf();
        });
        $("#consentForm").on("submit", function(event) {
            event.preventDefault();
            void generateConsent();
        });
    }

    function applyPlaceholders() {
        $("#setTitle").attr("placeholder", "Your research title");
        $("#otherInstitution").attr("placeholder", "Institution, Street 123, ZIP City, Country");
        $("#setPrincipleInvestigator").attr("placeholder", "The person who supervises this study");
        $("#setPrincipleInvestigatorEmail").attr("placeholder", "firstname.lastname@institution.com");
        $("#setResearcherNames").attr("placeholder", "Eva Musterfrau, Max Mustermann");
        $("#setResearcherEmails").attr("placeholder", "eva@hdm-stuttgart.de, max@hdm-stuttgart.de");
        $("#setFunding").attr("placeholder", "Optional funding source");
        $("#setEthicalComittee").attr("placeholder", "Optional ethical approval");
        $("#setPurpose").attr("placeholder", "Explain the purpose of this research in one sentence.");
        $("#setGoal").attr("placeholder", "Explain the goal of this research in one sentence.");
        $("input[type='number']").inputSpinner();
    }

    function initializeDateRange() {
        $("#daterangepicker").daterangepicker({
            opens: "right",
            autoApply: true,
            startDate: moment(window.ConsentGeneratorState.DEFAULTS.startDate, "MM/DD/YYYY"),
            endDate: moment(window.ConsentGeneratorState.DEFAULTS.endDate, "MM/DD/YYYY"),
            dateFormat: "YYYY-MM-DD",
            locale: { format: "DD.MM.YYYY" }
        });
    }

    function initializeSelects() {
        populateSelect("#selectLanguage", SELECT_OPTIONS.languages);
        populateSelect("#selectInstitution", SELECT_OPTIONS.institutions);
        populateSelect("#selectStudyType", SELECT_OPTIONS.studyTypes);
        populateSelect("#selectDurationUnit", SELECT_OPTIONS.durationUnits);
        populateSelect("#selectAnonymization", SELECT_OPTIONS.anonymization);
        populateSelect("#selectPublication", SELECT_OPTIONS.publication);
        populateSelect("#selectDateOfDataEnd", SELECT_OPTIONS.dataEnd);
        populateSelect("#selectCompensation", SELECT_OPTIONS.compensation);
    }

    function init() {
        appState.snippets = window.ConsentGeneratorContent.createSnippetStore();
        initializeSelects();
        initializeDateRange();
        ensureProcedureSteps(window.ConsentGeneratorState.DEFAULTS.procedureSteps);
        applyPlaceholders();
        bindEvents();
        applySettings(window.ConsentGeneratorState.DEFAULTS);
        window.ConsentGenerator = {
            getSettings: getFormSettings,
            applySettings: applySettings,
            generateConsent: generateConsent,
            getCurrentDocument: function() {
                return appState.currentDocument;
            },
            getCurrentPdf: function() {
                return appState.currentPdf;
            }
        };
    }
    $(document).ready(init);
})(window, window.jQuery);
