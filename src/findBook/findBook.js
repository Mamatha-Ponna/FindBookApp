import React, { useEffect, useMemo, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";



const PLACEHOLDER = "https://via.placeholder.com/150x220?text=No+Cover";

function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : initialValue;
    } catch {
      return initialValue;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {}
  }, [key, value]);
  return [value, setValue];
}

export const  BookFinder=()=> {
  // Search state
  const [query, setQuery] = useState("");
  const [field, setField] = useState("all"); // all | title | author | subject | isbn
  const [ebookOnly, setEbookOnly] = useState(false);
  const [lang, setLang] = useState(""); // e.g., eng, spa, hin
  const [sort, setSort] = useState("relevance"); // relevance | year_asc | year_desc

  // Results state
  const [books, setBooks] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1); // Open Library pages are 1-indexed via `page` param
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null); // for details modal

  // Saved list
  const [saved, setSaved] = useLocalStorage("bookfinder.saved", []);

  const pageSize = 20; // Open Library default

  // Build the API URL safely based on chosen field + filters
  const buildUrl = () => {
    const params = new URLSearchParams();
    params.set("page", String(page));

    if (!query.trim()) {
      params.set("q", "");
    } else if (field === "title") {
      params.set("title", query.trim());
    } else if (field === "author") {
      params.set("author", query.trim());
    } else if (field === "subject") {
      params.set("subject", query.trim());
    } else if (field === "isbn") {
      params.set("isbn", query.trim());
    } else {
      params.set("q", query.trim());
    }

    if (ebookOnly) params.set("has_fulltext", "true");
    if (lang) params.set("language", lang);

    // limit fields to reduce response size
    params.set(
      "fields",
      [
        "key",
        "title",
        "author_name",
        "cover_i",
        "first_publish_year",
        "ebook_access",
        "has_fulltext",
        "language",
        "edition_count",
        "subject",
      ].join(",")
    );

    return `https://openlibrary.org/search.json?${params.toString()}`;
  };

  // Fetch function
  async function fetchBooks() {
    setLoading(true);
    setError("");
    try {
      const url = buildUrl();
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      let docs = Array.isArray(data.docs) ? data.docs : [];
      if (sort === "year_asc") {
        docs = [...docs].sort((a, b) => (a.first_publish_year || 0) - (b.first_publish_year || 0));
      } else if (sort === "year_desc") {
        docs = [...docs].sort((a, b) => (b.first_publish_year || 0) - (a.first_publish_year || 0));
      }

      setBooks(docs);
      setTotal(Number(data.numFound || data.num_found || 0));
      if (!docs.length) setError("No books found.");
    } catch (e) {
      setError("Network error. Please try again.");
      setBooks([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }

  // Debounce search on query/filters/page changes
  useEffect(() => {
    const handle = setTimeout(() => {
      // avoid making a search when query is empty (initial load) unless user explicitly searches
      if (!query.trim()) {
        setBooks([]);
        setTotal(0);
        setError("");
        setLoading(false);
        return;
      }
      fetchBooks();
    }, 300);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, field, ebookOnly, lang, sort, page]);

  // Reset to page 1 when query or filters change (not when page changes)
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, field, ebookOnly, lang, sort]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(total / pageSize)), [total]);

  function toggleSave(book) {
    const id = book.key;
    setSaved((prev) => {
      const exists = prev.find((b) => b.key === id);
      if (exists) return prev.filter((b) => b.key !== id);
      return [...prev, book];
    });
  }

  const isSaved = (book) => saved.some((b) => b.key === book.key);

  return (
    <div className="container py-4">
      {/* Header */}
      <header className="mb-4 text-center">
        <h1 className="fw-bold">📚 Book Finder</h1>
        <p className="text-muted mb-0">Search by title, author, subject, or ISBN. Filter by language and eBook availability.</p>
      </header>

      {/* Controls */}
      <div className="card mb-3 shadow-sm">
        <div className="card-body">
          <div className="row g-2 align-items-center">
            <div className="col-12 col-md-4">
              <div className="input-group">
                <span className="input-group-text">In</span>
                <select className="form-select" value={field} onChange={(e) => setField(e.target.value)}>
                  <option value="all">All fields</option>
                  <option value="title">Title</option>
                  <option value="author">Author</option>
                  <option value="subject">Subject</option>
                  <option value="isbn">ISBN</option>
                </select>
              </div>
            </div>
            <div className="col-12 col-md-8">
              <div className="input-group">
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g., data structures, Tolkien, machine learning, 9780131103627"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') fetchBooks(); }}
                />
                <button className="btn btn-primary" onClick={() => fetchBooks()} disabled={loading}>
                  Search
                </button>
              </div>
            </div>
          </div>

          <div className="row g-2 mt-2">
            <div className="col-6 col-md-3">
              <div className="form-check">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="ebookOnly"
                  checked={ebookOnly}
                  onChange={(e) => setEbookOnly(e.target.checked)}
                />
                <label className="form-check-label" htmlFor="ebookOnly">
                  eBook only
                </label>
              </div>
            </div>
            <div className="col-6 col-md-3">
              <select className="form-select" value={lang} onChange={(e) => setLang(e.target.value)}>
                <option value="">Any language</option>
                <option value="eng">English</option>
                <option value="spa">Spanish</option>
                <option value="fra">French</option>
                <option value="deu">German</option>
                <option value="hin">Hindi</option>
                <option value="jpn">Japanese</option>
                <option value="zho">Chinese</option>
              </select>
            </div>
            <div className="col-12 col-md-6">
              <div className="input-group">
                <span className="input-group-text">Sort</span>
                <select className="form-select" value={sort} onChange={(e) => setSort(e.target.value)}>
                  <option value="relevance">Relevance</option>
                  <option value="year_asc">Year ↑</option>
                  <option value="year_desc">Year ↓</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status row */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <small className="text-muted">{loading ? "Searching…" : total ? `${total.toLocaleString()} results` : query ? "No results" : ""}</small>
        {totalPages > 1 && (
          <nav aria-label="pagination">
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${page === 1 ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => setPage((p) => Math.max(1, p - 1))}>
                  Prev
                </button>
              </li>
              <li className="page-item disabled">
                <span className="page-link">{page} / {totalPages}</span>
              </li>
              <li className={`page-item ${page >= totalPages ? "disabled" : ""}`}>
                <button className="page-link" onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>
                  Next
                </button>
              </li>
            </ul>
          </nav>
        )}
      </div>

      {/* Error banner */}
      {error && (
        <div className="alert alert-warning" role="alert">
          {error}
        </div>
      )}

      {/* Results grid */}
      <div className="row">
        {loading && !books.length && (
          <div className="col-12 text-center py-5">Loading…</div>
        )}
        {books.map((book) => (
          <div className="col-12 col-sm-6 col-lg-4 mb-4" key={book.key}>
            <div className="card h-100 shadow-sm">
              <img
                src={book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : PLACEHOLDER}
                alt={book.title}
                className="card-img-top"
                style={{ objectFit: "cover", height: 220 }}
              />
              <div className="card-body d-flex flex-column">
                <h5 className="card-title mb-1">{book.title}</h5>
                <p className="card-text text-muted mb-1" title={(book.author_name || []).join(", ")}> {(book.author_name || []).join(", ") || "Unknown author"}</p>
                <p className="card-text mb-2"><small className="text-muted">First published: {book.first_publish_year || "N/A"}</small></p>
                <div className="d-flex gap-2 mb-2 flex-wrap">
                  {(book.ebook_access === "public" || book.has_fulltext) && (
                    <span className="badge bg-success">eBook</span>
                  )}
                  {Array.isArray(book.language) && book.language.length > 0 && (
                    <span className="badge bg-secondary">{book.language[0]}</span>
                  )}
                  {book.edition_count ? (
                    <span className="badge bg-info text-dark">{book.edition_count} ed.</span>
                  ) : null}
                </div>
                <div className="mt-auto d-flex gap-2">
                  <a
                    className="btn btn-outline-primary btn-sm"
                    href={`https://openlibrary.org${book.key}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open Library
                  </a>
                  <button className="btn btn-outline-secondary btn-sm" onClick={() => setSelected(book)}>
                    Details
                  </button>
                  <button
                    className={`btn btn-sm ${isSaved(book) ? "btn-success" : "btn-outline-success"}`}
                    onClick={() => toggleSave(book)}
                  >
                    {isSaved(book) ? "Saved" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Saved drawer */}
      <section className="mt-4">
        <h5 className="mb-2">⭐ Saved ({saved.length})</h5>
        {saved.length === 0 ? (
          <p className="text-muted">Use the Save button on any card to keep it here.</p>
        ) : (
          <div className="row">
            {saved.map((book) => (
              <div className="col-6 col-md-4 col-lg-3 mb-3" key={`saved-${book.key}`}>
                <div className="card h-100 border-success">
                  <img
                    src={book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-S.jpg` : PLACEHOLDER}
                    alt={book.title}
                    className="card-img-top"
                    style={{ objectFit: "cover", height: 140 }}
                  />
                  <div className="card-body p-2 d-flex flex-column">
                    <div className="small fw-semibold text-truncate" title={book.title}>{book.title}</div>
                    <div className="small text-muted text-truncate" title={(book.author_name || []).join(", ")}>{(book.author_name || []).join(", ")}</div>
                    <button className="btn btn-sm btn-outline-danger mt-auto" onClick={() => toggleSave(book)}>
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Details Modal */}
      {selected && (
        <div className="modal d-block" role="dialog" onClick={() => setSelected(null)}>
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{selected.title}</h5>
                <button type="button" className="btn-close" onClick={() => setSelected(null)} aria-label="Close"></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12 col-md-4">
                    <img
                      src={selected.cover_i ? `https://covers.openlibrary.org/b/id/${selected.cover_i}-L.jpg` : PLACEHOLDER}
                      alt={selected.title}
                      className="img-fluid rounded"
                    />
                  </div>
                  <div className="col-12 col-md-8">
                    <p className="mb-1"><strong>Authors:</strong> {(selected.author_name || []).join(", ") || "Unknown"}</p>
                    <p className="mb-1"><strong>First published:</strong> {selected.first_publish_year || "N/A"}</p>
                    <p className="mb-2"><strong>Languages:</strong> {Array.isArray(selected.language) ? selected.language.join(", ") : "N/A"}</p>
                    {Array.isArray(selected.subject) && selected.subject.length > 0 && (
                      <div className="mb-2">
                        <strong>Subjects:</strong>
                        <div className="mt-1 d-flex flex-wrap gap-1">
                          {selected.subject.slice(0, 15).map((s, i) => (
                            <span key={i} className="badge bg-light text-dark border">{s}</span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <a className="btn btn-primary" href={`https://openlibrary.org${selected.key}`} target="_blank" rel="noreferrer">View on Open Library</a>
                <button className="btn btn-secondary" onClick={() => setSelected(null)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-5 text-center text-muted small">
        Built for Alex • React + Bootstrap • Open Library API
      </footer>
    </div>
  );
}

// import React, { useState } from "react";
// import 'bootstrap/dist/css/bootstrap.min.css';

// export  const BookFinder=()=>{
//   const [query, setQuery] = useState("");
//   const [books, setBooks] = useState([]);
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState("");

//   // Fetch books from Open Library API
//   const searchBooks = async () => {
//     if (!query.trim()) return;
//     setLoading(true);
//     setError("");
//     try {
//       const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`);
//       const data = await res.json();
//       if (data.docs.length === 0) {
//         setError("No books found.");
//       }
//       setBooks(data.docs);
//     } catch (err) {
//       setError("Network error. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div className="container py-4">
//       <h1 className="text-center mb-4">📚 Book Finder</h1>

//       {/* Search Bar */}
//       <div className="input-group mb-4">
//         <input
//           type="text"
//           className="form-control"
//           placeholder="Search by title, author, subject, ISBN..."
//           value={query}
//           onChange={(e) => setQuery(e.target.value)}
//           onKeyDown={(e) => e.key === "Enter" && searchBooks()}
//         />
//         <button className="btn btn-primary" onClick={searchBooks} disabled={loading}>
//           Search
//         </button>
//       </div>

//       {/* Loading & Errors */}
//       {loading && <p className="text-center">Loading...</p>}
//       {error && <p className="text-center text-danger">{error}</p>}

//       {/* Results */}
//       <div className="row">
//         {books.map((book, i) => (
//           <div className="col-md-6 col-lg-4 mb-4" key={i}>
//             <div className="card h-100 shadow-sm">
//               <img
//                 src={book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : "https://via.placeholder.com/150x220?text=No+Cover"}
//                 className="card-img-top"
//                 alt={book.title}
//               />
//               <div className="card-body d-flex flex-column">
//                 <h5 className="card-title">{book.title}</h5>
//                 <p className="card-text text-muted">
//                   {book.author_name?.join(", ") || "Unknown Author"}
//                 </p>
//                 <p className="card-text">First published: {book.first_publish_year || "N/A"}</p>
//                 {book.ebook_access === "public" && (
//                   <span className="badge bg-success mb-2">eBook Available</span>
//                 )}
//                 <a
//                   href={`https://openlibrary.org${book.key}`}
//                   target="_blank"
//                   rel="noopener noreferrer"
//                   className="btn btn-outline-primary mt-auto"
//                 >
//                   View on OpenLibrary
//                 </a>
//               </div>
//             </div>
//           </div>
//         ))}
//       </div>
//     </div>
//   );
// }
