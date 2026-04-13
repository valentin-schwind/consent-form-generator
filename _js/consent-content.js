(function(window) {
    "use strict";

    function decodeBase64Utf8(base64) {
        return decodeURIComponent(Array.prototype.map.call(window.atob(base64), function(char) {
            return "%" + char.charCodeAt(0).toString(16).padStart(2, "0");
        }).join(""));
    }

    function repairMojibake(value) {
        if (typeof value !== "string" || !value) {
            return value;
        }

        if (value.indexOf("Ã") === -1 && value.indexOf("Â") === -1) {
            return value;
        }

        try {
            return decodeURIComponent(escape(value));
        } catch (error) {
            return value.replace(/Â/g, "");
        }
    }

    function createSnippetStore() {
        var xml = decodeBase64Utf8(window.ConsentTextSnippetsXmlBase64 || "");
        var xmlDocument = new window.DOMParser().parseFromString(xml, "text/xml");
        var texts = {};
        var options = {};

        Array.prototype.forEach.call(xmlDocument.querySelectorAll("text"), function(node) {
            var id = node.getAttribute("id");
            texts[id] = {};
            Array.prototype.forEach.call(node.querySelectorAll("content"), function(contentNode) {
                texts[id][contentNode.getAttribute("lang")] = repairMojibake(contentNode.textContent || "");
            });
        });

        Array.prototype.forEach.call(xmlDocument.querySelectorAll("options"), function(node) {
            var id = node.getAttribute("id");
            options[id] = {};
            Array.prototype.forEach.call(node.querySelectorAll("option"), function(optionNode) {
                var lang = optionNode.getAttribute("lang");
                var value = optionNode.getAttribute("value");
                if (!options[id][lang]) {
                    options[id][lang] = {};
                }
                options[id][lang][value] = repairMojibake(optionNode.textContent || "");
            });
        });

        function getText(id, lang) {
            return texts[id] && texts[id][lang] ? texts[id][lang] : "";
        }

        function getOption(group, lang, value) {
            return options[group] && options[group][lang] ? options[group][lang][value] || "" : "";
        }

        return {
            getText: getText,
            getOption: getOption,
            options: options,
            texts: texts
        };
    }

    function replaceTokens(template, replacements) {
        return Object.keys(replacements).reduce(function(result, key) {
            return result.split(key).join(replacements[key]);
        }, template).replace(/\s{2,}/g, " ").trim();
    }

    function makeCommaSeparatedString(items, conjunction, useOxfordComma) {
        if (!items.length) {
            return "";
        }
        if (items.length === 1) {
            return items[0];
        }
        if (items.length === 2) {
            return items[0] + " " + conjunction + " " + items[1];
        }

        var head = items.slice(0, -1).join(", ");
        var glue = useOxfordComma ? ", " + conjunction + " " : " " + conjunction + " ";
        return head + glue + items[items.length - 1];
    }

    function buildConsentDocument(settings, snippets) {
        var lang = settings.language;
        var andText = snippets.getText("andListing", lang);
        var orText = snippets.getText("orListing", lang);
        var institutionParts;

        if (settings.institution === "other") {
            institutionParts = window.ConsentGeneratorState.parseInstitutionParts(settings.otherInstitution).parts;
        } else {
            institutionParts = window.ConsentGeneratorState.parseInstitutionParts(snippets.getOption("institutions", lang, settings.institution)).parts;
        }

        var institutionName = institutionParts[0] || "";
        var institutionStreet = institutionParts[1] || "";
        var institutionCity = institutionParts[2] || "";
        var institutionCountry = institutionParts[3] || "";
        var studyTypeText = snippets.getOption("studytype", lang, settings.studyType);
        var durationUnitText = snippets.getOption("durationunits", lang, settings.studyDurationUnit);
        var researcherNames = window.ConsentGeneratorState.parseCommaSeparated(settings.researcherNames);
        var researcherEmails = window.ConsentGeneratorState.parseCommaSeparated(settings.researcherEmails);
        var records = [];
        var rawData = [];
        var responsibilities = [settings.principalInvestigator];
        var researcherList = [];
        var displayDateFormat = lang === "de" ? "DD.MM.YYYY" : "YYYY-MM-DD";
        var startMoment = moment(settings.startDate, "MM/DD/YYYY");
        var endMoment = moment(settings.endDate, "MM/DD/YYYY");

        if (settings.recordInput) { records.push(snippets.getText("list_recordInput", lang)); }
        if (settings.recordPhotos) { records.push(snippets.getText("list_recordPhotos", lang)); }
        if (settings.recordVideos) { records.push(snippets.getText("list_recordVideos", lang)); }
        if (settings.recordAudio) { records.push(snippets.getText("list_recordAudio", lang)); }
        if (settings.recordMotion) { records.push(snippets.getText("list_recordMotion", lang)); }
        if (settings.recordEye) { records.push(snippets.getText("list_recordEye", lang)); }
        if (settings.recordPhysio) { records.push(snippets.getText("list_recordPhysio", lang)); }
        if (settings.recordScreen) { records.push(snippets.getText("list_recordScreen", lang)); }
        if (settings.recordBodyMetrics) { records.push(snippets.getText("list_recordBodyMetrics", lang)); }
        if (settings.recordNotes) { records.push(snippets.getText("list_recordNotes", lang)); }

        if (settings.recordInput || settings.recordMotion || settings.recordEye || settings.recordPhysio || settings.recordBodyMetrics) {
            rawData.push(snippets.getText("data_raw_data", lang));
        }
        if (settings.recordPhotos || settings.recordVideos || settings.recordAudio || settings.recordScreen) {
            rawData.push(snippets.getText("data_media_data", lang));
        }
        if (settings.recordNotes || settings.studyType === "qualitativestudy" || settings.studyType === "fieldstudy" || settings.uncomfortableQuestions) {
            rawData.push(snippets.getText("data_interview_protocols", lang));
        }
        if (settings.recordNotes || settings.studyType === "qualitativestudy" || settings.studyType === "fieldstudy") {
            rawData.push(snippets.getText("data_observation_protocols", lang));
        }

        if (settings.ethicalComittee) {
            responsibilities.push(snippets.getText("ethicalCommiteeOf", lang) + " " + settings.ethicalComittee);
        }

        researcherNames.forEach(function(name, index) {
            if (researcherEmails[index]) {
                researcherList.push(name + " (" + researcherEmails[index] + ")");
            }
        });

        var researcherNamesText = researcherNames.length ? makeCommaSeparatedString(researcherNames, andText, lang === "en") : settings.principalInvestigator;
        var dateDeleteRawData = settings.dateOfDataEnd !== "0" ? replaceTokens(snippets.getText("data_time_limit", lang), { NUMBER_YEARS: settings.dateOfDataEnd }) : snippets.getText("data_no_time_limit", lang);
        var accessDataText = replaceTokens(snippets.getText("data_" + settings.publication + "_public_access", lang), {
            RAW_DATA: makeCommaSeparatedString(rawData, andText, lang === "en")
        });

        if (settings.anonymization !== "no") {
            if (settings.recordPhotos || settings.recordVideos || settings.recordAudio || settings.recordScreen) {
                accessDataText += " " + snippets.getText("data_images_confidentiality", lang);
            }
            if (settings.recordNotes || settings.studyType === "qualitativestudy" || settings.studyType === "fieldstudy" || settings.uncomfortableQuestions) {
                accessDataText += " " + snippets.getText("data_interviews_confidentiality", lang);
            }
        }

        accessDataText += " " + snippets.getText(settings.recordContactData ? "data_yes_contact" : "data_no_contact", lang);
        accessDataText = replaceTokens(accessDataText, {
            DATA_ANONYMIZED: snippets.getText("standard_use_" + settings.anonymization + "_anonymity", lang),
            CONCLUSION_DRAWN: snippets.getText("list_" + settings.anonymization + "_conclusions", lang)
        });

        var title = snippets.getText("title", lang);
        var introParagraph = [
            replaceTokens(snippets.getText("invitation", lang), {
                STUDY_TYPE: studyTypeText,
                STUDY_TITLE: '"' + settings.studyTitle + '"'
            }),
            replaceTokens(snippets.getText("experimenter", lang), {
                STUDY_TYPE: studyTypeText,
                RESEARCHER_NAMES: researcherNamesText,
                PRINCIPAL_INVESTIGATOR: settings.principalInvestigator,
                INSTITUTION_NAME: institutionName
            }),
            replaceTokens(snippets.getText("list_daterange", lang), {
                SAMPLE_SIZE: settings.participants,
                STUDY_DATE_BEGIN: startMoment.locale(lang).format(displayDateFormat),
                STUDY_DATE_END: endMoment.locale(lang).format(displayDateFormat)
            }),
            settings.funding ? replaceTokens(snippets.getText("funding", lang), { FUNDING_ORGANIZATION: settings.funding }) : "",
            snippets.getText("pleasenote", lang)
        ].filter(Boolean).join(" ");

        var introBullets = [
            snippets.getText("list_voluntary", lang),
            replaceTokens(snippets.getText("study_duration", lang), { STUDY_TYPE: studyTypeText }) + " " + settings.studyDuration + " " + durationUnitText,
            snippets.getText(settings.compensation, lang),
            snippets.getText("list_demographics", lang) + (settings.recordContactData ? ", " + snippets.getText("list_contact_data", lang) : ""),
            records.length ? snippets.getText("list_start_wewill", lang) + " " + makeCommaSeparatedString(records, andText, lang === "en") : "",
            replaceTokens(snippets.getText("list_data_anonymization", lang), {
                DSGVO_RELATED: snippets.getText("list_" + (settings.anonymization !== "full" ? "GDPR" : "no_GDPR"), lang),
                DATA_ANONYMIZED: snippets.getText("list_" + settings.anonymization + "_anonymization", lang),
                DATASET_PUBLISHED: snippets.getText("list_" + settings.publication + "_publication", lang),
                CONCLUSION_DRAWN: snippets.getText("list_" + settings.anonymization + "_conclusions", lang)
            })
        ].filter(Boolean);

        var documentModel = {
            language: lang,
            title: title,
            headerAffiliation: institutionName,
            introParagraph: introParagraph,
            introBullets: introBullets,
            responsibilityParagraph: replaceTokens(snippets.getText("alternative_and_informations", lang), {
                ETHICS_RESPONSIBILIES: makeCommaSeparatedString(responsibilities, orText, lang === "en")
            }),
            sections: [
                {
                    heading: snippets.getText("section_purpose_and_goal", lang),
                    paragraphs: [settings.studyPurpose + " " + settings.studyGoal + " " + snippets.getText("achieving_the_goal", lang)]
                },
                {
                    heading: snippets.getText("section_participation_and_compensation", lang),
                    paragraphs: [[
                        replaceTokens(snippets.getText("takenout", lang), { STUDY_TYPE: studyTypeText }),
                        settings.compensation !== "compensation_none" ? snippets.getText("compensation_stillreceive", lang) : "",
                        (settings.studyType === "userstudy" || settings.studyType === "qualitativestudy") ? replaceTokens(snippets.getText("house_and_hygenie", lang), { INSTITUTION_NAME: institutionName }) : "",
                        settings.repeatedParticipationAllowed ? "" : snippets.getText("repeated_participation", lang)
                    ].filter(Boolean).join(" ")]
                },
                {
                    heading: snippets.getText("section_procedure", lang),
                    paragraphs: [snippets.getText("begin_procedure", lang)],
                    orderedList: settings.procedureSteps.filter(Boolean),
                    postListParagraphs: [snippets.getText("study_confirmation", lang)]
                },
                {
                    heading: snippets.getText("risks_and_benefits", lang),
                    paragraphs: [[
                        replaceTokens(snippets.getText("study_risks", lang), { STUDY_TYPE: studyTypeText }),
                        settings.uncomfortableQuestions ? snippets.getText("questions_discomfort", lang) : ((settings.studyType !== "onlinestudy") ? snippets.getText("unlikely_discomfort", lang) : ""),
                        settings.studyType !== "onlinestudy" ? snippets.getText("if_discomfort", lang) : "",
                        settings.studyType !== "onlinestudy" ? replaceTokens(snippets.getText("injuries_and_insurances", lang), { INSTITUTION_NAME: institutionName }) : "",
                        replaceTokens(snippets.getText("risk_of_dataleaks", lang), { INSTITUTION_NAME: institutionName }),
                        replaceTokens(snippets.getText("study_benefits", lang), { STUDY_TYPE: studyTypeText })
                    ].filter(Boolean).join(" ")]
                },
                {
                    heading: snippets.getText("dataprototection_and_confidentiality", lang),
                    paragraphs: [[
                        snippets.getText("data_publication", lang),
                        replaceTokens(snippets.getText("legal_basis", lang), {
                            DELETE_DATA: dateDeleteRawData,
                            RECORDING_LIST: makeCommaSeparatedString(records, andText, lang === "en")
                        }),
                        dateDeleteRawData,
                        accessDataText
                    ].filter(Boolean).join(" ")]
                },
                {
                    heading: snippets.getText("section_identification", lang),
                    paragraphs: [snippets.getText("questions_to_researchers", lang)],
                    columns: [
                        {
                            title: snippets.getText("student_researcher", lang),
                            lines: (researcherList.length ? researcherList : [settings.principalInvestigator]).concat([institutionName])
                        },
                        {
                            title: snippets.getText("principal_investigator", lang),
                            lines: [settings.principalInvestigator, settings.principalInvestigatorEmail, institutionName, institutionStreet, institutionCity + ", " + institutionCountry].filter(Boolean)
                        }
                    ]
                }
            ]
        };

        if (settings.studyType !== "onlinestudy") {
            documentModel.sections.push({
                heading: snippets.getText("section_agreement", lang),
                paragraphs: [snippets.getText("retaining_consent", lang)],
                checklist: [
                    replaceTokens(snippets.getText("understanding_consent", lang), { STUDY_TYPE: studyTypeText }),
                    replaceTokens(snippets.getText("agreeing_consent_" + settings.anonymization + "_anonymous", lang), {
                        STUDY_TYPE: studyTypeText,
                        RECORDING_LIST: makeCommaSeparatedString(records, andText, lang === "en")
                    })
                ],
                signature: {
                    leftLabel: snippets.getText("printed_name", lang),
                    rightLabel: snippets.getText("subject_signature", lang),
                    dateLabel: snippets.getText("location_date", lang)
                }
            });
        }

        return documentModel;
    }

    window.ConsentGeneratorContent = {
        createSnippetStore: createSnippetStore,
        makeCommaSeparatedString: makeCommaSeparatedString,
        buildConsentDocument: buildConsentDocument,
        repairMojibake: repairMojibake
    };
})(window);
