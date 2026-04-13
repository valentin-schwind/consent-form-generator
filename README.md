# Informed Consent Generator

Browser-based generator for informed consent forms in HCI studies. The tool runs fully in the browser, keeps save/load support for consent settings, renders an in-browser HTML preview and produces a PDF locally with `jsPDF` without requiring a backend service.

## What the tool does

The generator lets users:

- describe their institution, study type, language and study schedule
- document compensation, procedure steps and collected data
- explain anonymization, retention and publication choices
- generate a structured informed-consent document in HTML and PDF
- save current settings to disk and load them again later

## Project structure

- [index.html](./index.html): static application shell and semantic layout
- [_css/bootstrap-icons.css](./_css/bootstrap-icons.css): icon set aligned with the modern toolkit apps
- [_css/bootstrap.min.css](./_css/bootstrap.min.css) and [_css/daterangepicker.css](./_css/daterangepicker.css): runtime vendor styles used by the form
- [_css/style.css](./_css/style.css): toolkit-aligned styling and responsive layout
- [_img](./_img): lightweight runtime image assets used by the page shell
- [_js/jquery-3.3.1.min.js](./_js/jquery-3.3.1.min.js), [_js/bootstrap.bundle.min.js](./_js/bootstrap.bundle.min.js), [_js/bootstrap-input-spinner.js](./_js/bootstrap-input-spinner.js), [_js/moment.min.js](./_js/moment.min.js), [_js/daterangepicker.min.js](./_js/daterangepicker.min.js), and [_js/FileSaver.min.js](./_js/FileSaver.min.js): minimal browser-side third-party runtime dependencies
- [_js/consent-app.js](./_js/consent-app.js): UI flow, form binding and preview/export actions
- [_js/consent-state.js](./_js/consent-state.js): defaults, normalization and validation
- [_js/consent-content.js](./_js/consent-content.js): text snippets, placeholder replacement and document model generation
- [_js/consent-renderer-jsPDF.js](./_js/consent-renderer-jsPDF.js): safe HTML preview rendering and browser-side `jsPDF` export
- [_js/textsnippets-data.js](./_js/textsnippets-data.js): local embedded text-snippet source generated from `textsnippets.xml`
- [_fonts/Roboto-Regular-normal.js](./_fonts/Roboto-Regular-normal.js) and [_fonts/Roboto-Medium-normal.js](./_fonts/Roboto-Medium-normal.js): embedded `jsPDF` font registrations for PDF output
- [scripts/test_runtime.js](./scripts/test_runtime.js): minimal jsdom-based runtime regression test

## Local usage

No build step is required for the app itself. Open `index.html` directly in a browser to use the generator offline.

## Optional checks

Install the small test dependency set once:

```bash
npm install
```

Run the runtime regression test:

```bash
npm test
```

## Notes for contributors

- The production app is intentionally static and server-independent.
- Save/load remains JSON-based and compatible with the historic settings shape.
- HTML preview and PDF output are generated from the same document model.
- The active PDF path is `jsPDF`; legacy `html2pdf` code is no longer part of the shipped runtime.

## Source code

The current source code is available on GitHub:

- [https://github.com/valentin-schwind/consent-form-generator](https://github.com/valentin-schwind/consent-form-generator)

## Citation statement

If you use this tool in teaching, student supervision, or research workflows, please cite the HCI User Studies Toolkit publication below.

## Citation

```bibtex
@inproceedings{10.1145/3544549.3585890,
	author = {Schwind, Valentin and Resch, Stefan and Sehrt, Jessica},
	title = {The HCI User Studies Toolkit: Supporting Study Designing and Planning for Undergraduates and Novice Researchers in Human-Computer Interaction},
	year = {2023},
	isbn = {9781450394222},
	publisher = {Association for Computing Machinery},
	address = {New York, NY, USA},
	url = {https://doi.org/10.1145/3544549.3585890},
	doi = {10.1145/3544549.3585890},
	booktitle = {Extended Abstracts of the 2023 CHI Conference on Human Factors in Computing Systems},
	articleno = {272},
	numpages = {7},
	keywords = {HCI Toolkit, Organization, Study Design Planning, User Studies},
	location = {Hamburg, Germany},
	series = {CHI EA '23}
}
```
