/* ------------------------------------------------------------
   Library settings and book list.

   To add a book for ALL students:
   1. Copy the PDF into the "books" folder.
   2. Add a new line to BOOKS below.
   ------------------------------------------------------------ */

/* School details used in the footer and the legal pages.
   Fill in the empty fields. Nothing is shown to visitors until you do,
   and the legal pages show "to be added" until then. */
window.SCHOOL = {
  name: "Krishnaveni School",
  tagline: "Thamasoma Jyothirgamaya",
  location: "Peerzadiguda",
  address: "",            // full postal address
  email: "",              // contact e-mail (also used for privacy / grievance requests)
  phone: "",              // contact phone
  grievanceOfficer: "",   // name and designation (required for the DPDP Act privacy page)
  updated: "21 October 2026"   // "last updated" date shown on the legal pages
};

window.LIBRARY_CONFIG = {
  // Admin password for the upload form. CHANGE THIS!
  // Note: this is a front-end only check (no server), so it keeps
  // students out of the form but is not bank-level security.
  adminPassword: "admin123",
  maxUploadMB: 50
};

window.CATEGORIES = [
  { id: "Maths",    icon: "plus", color: "#2a6fdb" },
  { id: "Science",  icon: "flask", color: "#10a37f" },
  { id: "English",  icon: "type", color: "#e8590c" },
  { id: "Stories",  icon: "feather", color: "#9c36b5" },
  { id: "Social",   icon: "globe", color: "#d6336c" },
  { id: "Computer", icon: "monitor", color: "#0b7285" }
];

// Academic years shown in the Year filter and the admin form
window.YEARS = ["2024-25", "2025-26", "2026-27"];
window.CURRENT_YEAR = "2026-27";

window.GRADES = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];

window.BOOKS = [
  { id: "maths-1",   title: "Mathematics",            author: "",category: "Maths",    grade: "6", year: "2026-27", file: "books/mathematics.pdf",
    desc: "Numbers, shapes and fun problems to solve." },
  { id: "solar-1",   title: "Our Solar System",       author: "Sample Book",     category: "Science",  grade: "4", year: "2026-27", file: "books/our-solar-system.pdf",
    desc: "Travel through the Sun, planets and stars." },
  { id: "crow-1",    title: "The Clever Crow",        author: "Sample Book",     category: "Stories",  grade: "2", year: "2026-27", file: "books/the-clever-crow.pdf",
    desc: "A thirsty crow and a very smart idea." },
  { id: "comp-1",    title: "My First Computer Book", author: "Sample Book",     category: "Computer", grade: "3", year: "2026-27", file: "books/my-first-computer-book.pdf",
    desc: "Learn about computers and staying safe online." },
  { id: "india-1",   title: "India - Our Country",    author: "Sample Book",     category: "Social",   grade: "5", year: "2026-27", file: "books/india-our-country.pdf",
    desc: "Symbols, leaders and the story of India." },
  { id: "gram-1",    title: "English Grammar Fun",    author: "Sample Book",     category: "English",  grade: "4", year: "2025-26", file: "books/english-grammar-fun.pdf",
    desc: "Nouns, verbs and adjectives made easy." }
];
