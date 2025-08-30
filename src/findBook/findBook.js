import React, { useState } from "react";
import 'bootstrap/dist/css/bootstrap.min.css';

export  const BookFinder=()=>{
  const [query, setQuery] = useState("");
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch books from Open Library API
  const searchBooks = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (data.docs.length === 0) {
        setError("No books found.");
      }
      setBooks(data.docs);
    } catch (err) {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container py-4">
      <h1 className="text-center mb-4">📚 Book Finder</h1>

      {/* Search Bar */}
      <div className="input-group mb-4">
        <input
          type="text"
          className="form-control"
          placeholder="Search by title, author, subject, ISBN..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && searchBooks()}
        />
        <button className="btn btn-primary" onClick={searchBooks} disabled={loading}>
          Search
        </button>
      </div>

      {/* Loading & Errors */}
      {loading && <p className="text-center">Loading...</p>}
      {error && <p className="text-center text-danger">{error}</p>}

      {/* Results */}
      <div className="row">
        {books.map((book, i) => (
          <div className="col-md-6 col-lg-4 mb-4" key={i}>
            <div className="card h-100 shadow-sm">
              <img
                src={book.cover_i ? `https://covers.openlibrary.org/b/id/${book.cover_i}-M.jpg` : "https://via.placeholder.com/150x220?text=No+Cover"}
                className="card-img-top"
                alt={book.title}
              />
              <div className="card-body d-flex flex-column">
                <h5 className="card-title">{book.title}</h5>
                <p className="card-text text-muted">
                  {book.author_name?.join(", ") || "Unknown Author"}
                </p>
                <p className="card-text">First published: {book.first_publish_year || "N/A"}</p>
                {book.ebook_access === "public" && (
                  <span className="badge bg-success mb-2">eBook Available</span>
                )}
                <a
                  href={`https://openlibrary.org${book.key}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary mt-auto"
                >
                  View on OpenLibrary
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
