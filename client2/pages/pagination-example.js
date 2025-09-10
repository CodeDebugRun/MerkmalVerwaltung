import { useState } from 'react';
import Head from 'next/head';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';

export default function PaginationExample() {
  const [filters, setFilters] = useState({});
  const [searchVisible, setSearchVisible] = useState(false);
  const [tempFilters, setTempFilters] = useState({
    identnr: '',
    merkmal: '',
    auspraegung: '',
    drucktext: '',
    sondermerkmal: '',
    position: '',
    sonderAbt: '',
    fertigungsliste: ''
  });

  const {
    data,
    pagination,
    loading,
    error,
    goToPage,
    nextPage,
    previousPage,
    changePageSize,
    refresh,
    search,
    isEmpty,
    isFirstPage,
    isLastPage,
    totalItems,
    hasData
  } = usePagination('/merkmalstexte', 50, filters);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setTempFilters(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSearch = () => {
    const activeFilters = Object.keys(tempFilters).reduce((acc, key) => {
      if (tempFilters[key] && tempFilters[key].trim() !== '') {
        acc[key] = tempFilters[key].trim();
      }
      return acc;
    }, {});
    
    setFilters(activeFilters);
    search(activeFilters);
  };

  const handleClearFilters = () => {
    setTempFilters({
      identnr: '',
      merkmal: '',
      auspraegung: '',
      drucktext: '',
      sondermerkmal: '',
      position: '',
      sonderAbt: '',
      fertigungsliste: ''
    });
    setFilters({});
    search({});
  };

  const handlePageSizeChange = (e) => {
    const newSize = parseInt(e.target.value);
    changePageSize(newSize);
  };

  if (error) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h1>Error</h1>
        <p style={{ color: 'red' }}>{error}</p>
        <button onClick={refresh}>Retry</button>
      </div>
    );
  }

  return (
    <>
      <Head>
        <title>Pagination Example - LEBO</title>
        <meta name="description" content="Pagination example with merkmalstexte data" />
      </Head>
      
      <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
        <h1>Merkmalstexte mit Pagination</h1>
        
        {/* Controls */}
        <div style={{ marginBottom: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap', alignItems: 'center' }}>
          <button 
            onClick={() => setSearchVisible(!searchVisible)}
            style={{
              padding: '8px 16px',
              backgroundColor: searchVisible ? '#007bff' : '#6c757d',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {searchVisible ? 'Hide Filters' : 'Show Filters'}
          </button>
          
          <button 
            onClick={refresh}
            disabled={loading}
            style={{
              padding: '8px 16px',
              backgroundColor: '#28a745',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <label>Items per page:</label>
            <select 
              value={pagination.pageSize} 
              onChange={handlePageSizeChange}
              disabled={loading}
              style={{ padding: '4px 8px' }}
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        </div>

        {/* Search Filters */}
        {searchVisible && (
          <div style={{ 
            background: '#f8f9fa', 
            padding: '20px', 
            borderRadius: '4px', 
            marginBottom: '20px' 
          }}>
            <h3>Search Filters</h3>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '10px',
              marginBottom: '15px'
            }}>
              <input
                name="identnr"
                placeholder="Ident Nr."
                value={tempFilters.identnr}
                onChange={handleFilterChange}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <input
                name="merkmal"
                placeholder="Merkmal"
                value={tempFilters.merkmal}
                onChange={handleFilterChange}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <input
                name="auspraegung"
                placeholder="Ausprägung"
                value={tempFilters.auspraegung}
                onChange={handleFilterChange}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <input
                name="drucktext"
                placeholder="Drucktext"
                value={tempFilters.drucktext}
                onChange={handleFilterChange}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <input
                name="sondermerkmal"
                placeholder="Sondermerkmal"
                value={tempFilters.sondermerkmal}
                onChange={handleFilterChange}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <input
                name="position"
                placeholder="Position"
                type="number"
                value={tempFilters.position}
                onChange={handleFilterChange}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button 
                onClick={handleSearch}
                disabled={loading}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  opacity: loading ? 0.6 : 1
                }}
              >
                Search
              </button>
              <button 
                onClick={handleClearFilters}
                style={{
                  padding: '8px 16px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer'
                }}
              >
                Clear
              </button>
            </div>
          </div>
        )}

        {/* Data Info */}
        <div style={{ marginBottom: '20px', color: '#6c757d' }}>
          {loading ? (
            <p>Loading data...</p>
          ) : (
            <p>
              Showing {data.length} of {totalItems} items 
              (Page {pagination.currentPage} of {pagination.totalPages})
            </p>
          )}
        </div>

        {/* Data Table */}
        {isEmpty && !loading && (
          <div style={{ 
            textAlign: 'center', 
            padding: '40px', 
            backgroundColor: '#f8f9fa', 
            borderRadius: '4px' 
          }}>
            <p>No data found</p>
          </div>
        )}

        {hasData && (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ 
              width: '100%', 
              borderCollapse: 'collapse',
              backgroundColor: 'white',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}>
              <thead>
                <tr style={{ backgroundColor: '#f8f9fa' }}>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    Ident Nr.
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    Merkmal
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    Ausprägung
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    Drucktext
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    Position
                  </th>
                  <th style={{ padding: '12px', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>
                    Sonder Abt.
                  </th>
                </tr>
              </thead>
              <tbody>
                {data.map((item, index) => (
                  <tr 
                    key={item.id || index}
                    style={{ 
                      borderBottom: '1px solid #dee2e6',
                      '&:hover': { backgroundColor: '#f8f9fa' }
                    }}
                  >
                    <td style={{ padding: '12px' }}>{item.identnr}</td>
                    <td style={{ padding: '12px' }}>{item.merkmal}</td>
                    <td style={{ padding: '12px' }}>{item.auspraegung}</td>
                    <td style={{ padding: '12px' }}>{item.drucktext}</td>
                    <td style={{ padding: '12px' }}>{item.position}</td>
                    <td style={{ padding: '12px' }}>{item.sonderAbt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Component */}
        <Pagination
          currentPage={pagination.currentPage}
          totalCount={totalItems}
          pageSize={pagination.pageSize}
          onPageChange={goToPage}
        />

        {/* Additional Navigation Buttons for Testing */}
        <div style={{ 
          marginTop: '20px', 
          display: 'flex', 
          gap: '10px', 
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <button 
            onClick={previousPage}
            disabled={isFirstPage || loading}
            style={{
              padding: '8px 16px',
              backgroundColor: isFirstPage ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (isFirstPage || loading) ? 'not-allowed' : 'pointer',
              opacity: (isFirstPage || loading) ? 0.6 : 1
            }}
          >
            Previous Page (Hook)
          </button>
          <button 
            onClick={nextPage}
            disabled={isLastPage || loading}
            style={{
              padding: '8px 16px',
              backgroundColor: isLastPage ? '#6c757d' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: (isLastPage || loading) ? 'not-allowed' : 'pointer',
              opacity: (isLastPage || loading) ? 0.6 : 1
            }}
          >
            Next Page (Hook)
          </button>
        </div>
      </div>
    </>
  );
}