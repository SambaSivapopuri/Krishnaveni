Krishnaveni Digital Library
===========================
RUN
  Double-click start.bat (needs Python), then open http://localhost:8000
  Pages have clean addresses: /admin/  /privacy/  /terms/  /cookies/  /refund/  (no .html)
  (PDFs cannot load if index.html is opened directly from the folder.)
  Or upload the whole folder to any web hosting. Use HTTPS when it is live.

BEFORE GOING LIVE - please complete
  1. js/books.js  ->  SCHOOL: add address, e-mail, phone and Grievance Officer.
     The footer and the Privacy / Terms / Cookie / Refund pages use these.
  2. js/books.js  ->  LIBRARY_CONFIG.adminPassword: change "admin123".
  3. Replace the "Sample Book" PDFs with real books you have the right to share.
  4. Have the legal pages (/privacy/, /terms/, /cookies/, /refund/)
     reviewed by a legal adviser.

ADD A BOOK FOR EVERYONE
  Copy the PDF into /books and add a line in js/books.js.

ADMIN (/admin/)
  Add / edit / delete documents, subjects, classes and years.
  Years -> Classes -> Subjects are linked: a class belongs to chosen years, a subject to chosen classes.
  Admin changes are saved in that browser only (IndexedDB).

FOLDERS
  admin/ privacy/ terms/ cookies/ refund/   one folder per page (each holds index.html)
  assets/   school logo
  books/    PDF files
  css/      style.css, fonts.css
  js/       app.js (library), admin.js (admin), store.js (storage), site.js (cookie notice, focus), books.js (settings)
  vendor/   jQuery, PDF.js and fonts - hosted locally, so no third-party requests
