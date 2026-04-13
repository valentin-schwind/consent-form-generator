(function(window) {
    "use strict";

    var MAX_PROCEDURE_STEPS = 8;
    var MIN_PROCEDURE_STEPS = 4;
    var DATA_KEYS = [
        "recordDemographics",
        "recordContactData",
        "recordInput",
        "recordNotes",
        "recordScreen",
        "recordPhysio",
        "recordPhotos",
        "recordAudio",
        "recordVideos",
        "recordMotion",
        "recordBodyMetrics",
        "recordEye"
    ];

    var DEFAULTS = {
        institution: "",
        otherInstitution: "",
        studyType: "",
        language: "en",
        studyTitle: "",
        studyPurpose: "",
        studyGoal: "",
        startDate: moment().add(1, "days").format("MM/DD/YYYY"),
        endDate: moment().add(15, "days").format("MM/DD/YYYY"),
        studyDuration: 60,
        studyDurationUnit: "minutes",
        participants: 24,
        repeatedParticipationAllowed: false,
        uncomfortableQuestions: false,
        recordDemographics: true,
        recordContactData: false,
        recordInput: true,
        recordNotes: true,
        recordScreen: false,
        recordPhysio: false,
        recordPhotos: false,
        recordAudio: false,
        recordVideos: false,
        recordMotion: false,
        recordBodyMetrics: false,
        recordEye: false,
        compensation: "",
        procedureSteps: ["", "", "", ""],
        dateOfDataEnd: "",
        anonymization: "",
        publication: "",
        principalInvestigator: "",
        principalInvestigatorEmail: "",
        researcherNames: "",
        researcherEmails: "",
        funding: "",
        ethicalComittee: ""
    };

    var EXAMPLE = {
        institution: "hdm",
        otherInstitution: "",
        studyType: "userstudy",
        language: "de",
        studyTitle: "Fitts' Task in Virtual Reality using Avatar Hands",
        studyPurpose: "Wir untersuchen, wie verschiedene Avatar-Hände die Leistung bei einer Zeigeaufgabe in Virtual Reality beeinflussen.",
        studyGoal: "Die Ergebnisse sollen helfen zu verstehen, wie visuelle Körpersignale in das Körperschema integriert werden.",
        startDate: moment().add(7, "days").format("MM/DD/YYYY"),
        endDate: moment().add(30, "days").format("MM/DD/YYYY"),
        studyDuration: 45,
        studyDurationUnit: "minutes",
        participants: 32,
        repeatedParticipationAllowed: false,
        uncomfortableQuestions: true,
        recordDemographics: true,
        recordContactData: true,
        recordInput: true,
        recordNotes: true,
        recordScreen: true,
        recordPhysio: true,
        recordPhotos: true,
        recordAudio: true,
        recordVideos: true,
        recordMotion: true,
        recordBodyMetrics: true,
        recordEye: true,
        compensation: "compensation_onecreditpoint",
        procedureSteps: [
            "Sie erhalten ein Virtual-Reality-Headset und eine kurze Einführung in die virtuelle Umgebung.",
            "Sie tippen mit dem Zeigefinger auf markierte Ziele.",
            "Sie beantworten einen kurzen Fragebogen in der virtuellen Umgebung.",
            "Sie wiederholen die Aufgabe mit verschiedenen virtuellen Händen.",
            "Zum Abschluss führen wir ein kurzes Interview durch."
        ],
        dateOfDataEnd: "10",
        anonymization: "pseudo",
        publication: "full",
        principalInvestigator: "Prof. Dr. Valentin Schwind",
        principalInvestigatorEmail: "schwind@hdm-stuttgart.de",
        researcherNames: "Eva Musterfrau, Max Mustermann, Erika Musterfrau",
        researcherEmails: "eva.musterfrau@hdm-stuttgart.de, max.mustermann@hdm-stuttgart.de, erika.musterfrau@hdm-stuttgart.de",
        funding: "BMBF VR@HDM.DE",
        ethicalComittee: "HdM Ethical Committee"
    };

    function trimString(value) {
        return typeof value === "string" ? value.trim() : "";
    }

    function normalizeCommaSeparated(value) {
        return trimString(value).replace(/\s*,\s*/g, ", ").replace(/\s{2,}/g, " ");
    }

    function parseCommaSeparated(value) {
        var normalized = normalizeCommaSeparated(value);
        if (!normalized) {
            return [];
        }

        return normalized.split(", ").map(function(entry) {
            return entry.trim();
        }).filter(Boolean);
    }

    function normalizeBoolean(value) {
        return value === true || value === "true";
    }

    function normalizeProcedureSteps(value) {
        var source = Array.isArray(value) ? value : [];
        var steps = source.map(function(step) {
            return trimString(step);
        }).filter(Boolean).slice(0, MAX_PROCEDURE_STEPS);

        while (steps.length < MIN_PROCEDURE_STEPS) {
            steps.push("");
        }

        return steps;
    }

    function normalizeSettings(raw) {
        var normalized = $.extend({}, DEFAULTS);
        var source = raw || {};

        Object.keys(DEFAULTS).forEach(function(key) {
            if (key === "procedureSteps") {
                normalized[key] = normalizeProcedureSteps(source[key]);
                return;
            }

            if (DATA_KEYS.indexOf(key) >= 0 || key === "repeatedParticipationAllowed" || key === "uncomfortableQuestions") {
                normalized[key] = normalizeBoolean(source[key]);
                return;
            }

            if (source[key] !== undefined && source[key] !== null) {
                normalized[key] = typeof DEFAULTS[key] === "number" ? Number(source[key]) || DEFAULTS[key] : source[key];
            }
        });

        normalized.otherInstitution = normalizeCommaSeparated(normalized.otherInstitution);
        normalized.researcherNames = normalizeCommaSeparated(normalized.researcherNames);
        normalized.researcherEmails = normalizeCommaSeparated(normalized.researcherEmails);
        normalized.studyTitle = trimString(normalized.studyTitle);
        normalized.studyPurpose = trimString(normalized.studyPurpose);
        normalized.studyGoal = trimString(normalized.studyGoal);
        normalized.principalInvestigator = trimString(normalized.principalInvestigator);
        normalized.principalInvestigatorEmail = trimString(normalized.principalInvestigatorEmail);
        normalized.funding = trimString(normalized.funding);
        normalized.ethicalComittee = trimString(normalized.ethicalComittee);
        normalized.studyDuration = Math.max(1, parseInt(normalized.studyDuration, 10) || DEFAULTS.studyDuration);
        normalized.participants = Math.max(1, parseInt(normalized.participants, 10) || DEFAULTS.participants);
        normalized.dateOfDataEnd = String(normalized.dateOfDataEnd || "");

        return normalized;
    }

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimString(value));
    }

    function parseInstitutionParts(value) {
        var parts = parseCommaSeparated(value);
        return {
            isValid: parts.length === 4,
            parts: parts
        };
    }

    function validateSettings(settings) {
        var errors = {};
        var normalized = normalizeSettings(settings);
        var researcherNames = parseCommaSeparated(normalized.researcherNames);
        var researcherEmails = parseCommaSeparated(normalized.researcherEmails);
        var procedureSteps = normalized.procedureSteps.filter(Boolean);

        if (!normalized.institution) {
            errors.selectInstitution = "Please select an institution.";
        }

        if (normalized.institution === "other" && !parseInstitutionParts(normalized.otherInstitution).isValid) {
            errors.otherInstitution = "Please enter institution name, street, ZIP and city, and country separated by commas.";
        }

        ["studyType", "language", "studyTitle", "studyPurpose", "studyGoal", "compensation", "dateOfDataEnd", "anonymization", "publication", "principalInvestigator"].forEach(function(key) {
            if (!trimString(normalized[key])) {
                errors[key] = "Required";
            }
        });

        if (!isValidEmail(normalized.principalInvestigatorEmail)) {
            errors.principalInvestigatorEmail = "Please enter a valid PI e-mail address.";
        }

        if (!normalized.studyDuration || normalized.studyDuration < 1 || !normalized.studyDurationUnit) {
            errors.studyDuration = "Please enter a valid duration and unit.";
        }

        if (!normalized.participants || normalized.participants < 1) {
            errors.participants = "Please enter a valid number of participants.";
        }

        if (procedureSteps.length < MIN_PROCEDURE_STEPS || procedureSteps.length > MAX_PROCEDURE_STEPS) {
            errors.procedureSteps = "Please provide between 4 and 8 non-empty procedure steps.";
        }

        if (researcherNames.length !== researcherEmails.length) {
            if (researcherNames.length || researcherEmails.length) {
                errors.researcherEmails = "Please provide the same number of researcher names and e-mail addresses.";
            }
        }

        researcherEmails.forEach(function(email) {
            if (!isValidEmail(email)) {
                errors.researcherEmails = "Please provide only valid comma-separated researcher e-mail addresses.";
            }
        });

        if (!normalized.recordDemographics && !normalized.recordInput && !normalized.recordNotes && !normalized.recordScreen && !normalized.recordPhysio && !normalized.recordPhotos && !normalized.recordAudio && !normalized.recordVideos && !normalized.recordMotion && !normalized.recordBodyMetrics && !normalized.recordEye && !normalized.recordContactData) {
            errors.recordings = "Please select at least one type of collected data.";
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors: errors,
            settings: normalized,
            researcherNames: researcherNames,
            researcherEmails: researcherEmails,
            procedureSteps: procedureSteps
        };
    }

    window.ConsentGeneratorState = {
        DATA_KEYS: DATA_KEYS,
        DEFAULTS: DEFAULTS,
        EXAMPLE: EXAMPLE,
        MAX_PROCEDURE_STEPS: MAX_PROCEDURE_STEPS,
        MIN_PROCEDURE_STEPS: MIN_PROCEDURE_STEPS,
        normalizeSettings: normalizeSettings,
        normalizeCommaSeparated: normalizeCommaSeparated,
        parseCommaSeparated: parseCommaSeparated,
        parseInstitutionParts: parseInstitutionParts,
        validateSettings: validateSettings,
        isValidEmail: isValidEmail
    };
})(window);
