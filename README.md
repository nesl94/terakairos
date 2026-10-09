# Tera Kairos responsive website — v4

This version applies the latest review changes:

- Home hero now uses a rotating **Chapter** image set and the handwritten “New Places / Bigger Possibilities / A Brighter You” overlay is removed.
- Language Course no longer has a photo carousel. The right side is now a larger **German levels explained (CEFR)** panel.
- Clicking A1–C2 opens a mini quiz matched to that level, with an extra question available for each level.
- **German Tip** is expanded into an 8-question quick-practice quiz.
- Study banner now rotates through **Austria, Germany, Switzerland and EU** destination imagery.
- Switzerland has been added to the destination tabs, destination cards and contact form.
- The universities section now uses a **Connection Map** visual with animated route lines.
- Footer uses real locally hosted SVG brand icons. Instagram, TikTok and Facebook use the provided links. WhatsApp and LinkedIn are ready for links when supplied.
- Contact email remains **tera.kairos@yahoo.com**.

## Image note
The conversation currently does not contain uploads literally named `Chapter`, `Austria`, `German/Germany`, `Switzerland`, `EU`, or `Connection Map`. To keep the site complete, v4 uses the closest existing Tera Kairos imagery already available in the project and copies it into semantically named assets (`chapter-*`, `study-*`, `connection-map.png`). When the exact labelled files are uploaded, those assets can be swapped directly without changing the layout or code.

## Files
- `index.html` — page structure/content
- `styles.css` — responsive layout and styling
- `script.js` — carousels, quizzes, destination selector, form behavior
- `assets/` — logo, photos and locally hosted social icons

## Form
The enquiry form still opens the visitor’s default email app and addresses the message to `tera.kairos@yahoo.com`. For production, it can later be connected to a form endpoint or backend so enquiries send without opening an email client.


## v5 image updates
- Landing-page hero carousel now uses the three newly supplied images: `chapter-01.jpg`, `chapter-02.jpg`, and `chapter-03.jpg`.
- Study destination connection panel now uses the newly supplied `connection.jpg` image.
- All other v4 layout, interactions, quizzes, forms, social links, and content are unchanged.
