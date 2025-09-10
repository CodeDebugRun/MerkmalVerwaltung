import { useState, useEffect } from 'react';

const Pagination = ({ 
  currentPage, 
  totalCount, 
  pageSize = 50, 
  onPageChange,
  maxPageNumbers = 7 
}) => {
  const [safePage, setSafePage] = useState(1);
  
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  
  useEffect(() => {
    const validPage = Math.max(1, Math.min(currentPage || 1, totalPages));
    setSafePage(validPage);
    
    if (currentPage !== validPage && onPageChange) {
      onPageChange(validPage);
    }
  }, [currentPage, totalPages, onPageChange]);

  const handlePageChange = (page) => {
    const validPage = Math.max(1, Math.min(page, totalPages));
    setSafePage(validPage);
    if (onPageChange) {
      onPageChange(validPage);
    }
  };

  const generatePageNumbers = () => {
    if (totalPages <= maxPageNumbers) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const halfRange = Math.floor(maxPageNumbers / 2);
    let startPage = Math.max(1, safePage - halfRange);
    let endPage = Math.min(totalPages, startPage + maxPageNumbers - 1);

    if (endPage - startPage + 1 < maxPageNumbers) {
      startPage = Math.max(1, endPage - maxPageNumbers + 1);
    }

    if (startPage > 1) {
      pages.push(1);
      if (startPage > 2) {
        pages.push('...');
      }
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }

    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        pages.push('...');
      }
      pages.push(totalPages);
    }

    return pages;
  };

  if (totalCount <= 0 || totalPages <= 1) {
    return null;
  }

  const pageNumbers = generatePageNumbers();
  const isFirstPage = safePage === 1;
  const isLastPage = safePage === totalPages;

  return (
    <div className="pagination-container">
      <button
        className={`pagination-btn ${isFirstPage ? 'disabled' : ''}`}
        onClick={() => handlePageChange(safePage - 1)}
        disabled={isFirstPage}
        aria-label="Previous page"
      >
        &#8249;
      </button>

      <div className="page-numbers">
        {pageNumbers.map((page, index) => (
          <span key={`${page}-${index}`}>
            {page === '...' ? (
              <span className="pagination-ellipsis">...</span>
            ) : (
              <button
                className={`pagination-btn ${page === safePage ? 'active' : ''}`}
                onClick={() => handlePageChange(page)}
                aria-label={`Go to page ${page}`}
                aria-current={page === safePage ? 'page' : undefined}
              >
                {page}
              </button>
            )}
          </span>
        ))}
      </div>

      <button
        className={`pagination-btn ${isLastPage ? 'disabled' : ''}`}
        onClick={() => handlePageChange(safePage + 1)}
        disabled={isLastPage}
        aria-label="Next page"
      >
        &#8250;
      </button>

      <style jsx>{`
        .pagination-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin: 20px 0;
          user-select: none;
        }

        .page-numbers {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .pagination-btn {
          padding: 8px 12px;
          border: 1px solid #ddd;
          background: white;
          cursor: pointer;
          border-radius: 4px;
          font-size: 14px;
          min-width: 40px;
          height: 36px;
          transition: all 0.2s;
        }

        .pagination-btn:hover:not(.disabled) {
          background: #f5f5f5;
          border-color: #999;
        }

        .pagination-btn:focus {
          outline: 2px solid #0066cc;
          outline-offset: 2px;
        }

        .pagination-btn.active {
          background: #0066cc;
          color: white;
          border-color: #0066cc;
        }

        .pagination-btn.disabled {
          background: #f5f5f5;
          color: #ccc;
          cursor: not-allowed;
          border-color: #eee;
        }

        .pagination-ellipsis {
          padding: 8px 4px;
          color: #666;
          font-size: 14px;
        }

        @media (max-width: 640px) {
          .pagination-container {
            gap: 4px;
          }
          
          .pagination-btn {
            padding: 6px 8px;
            min-width: 32px;
            height: 32px;
            font-size: 12px;
          }
        }
      `}</style>
    </div>
  );
};

export default Pagination;