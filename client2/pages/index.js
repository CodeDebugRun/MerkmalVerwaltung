import { useState } from 'react';
import axios from 'axios';
import Head from 'next/head';
import { usePagination } from '../hooks/usePagination';
import Pagination from '../components/Pagination';

export default function Home() {
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [operationLoading, setOperationLoading] = useState({
    create: false,
    update: false,
    delete: false
  });
  const [formData, setFormData] = useState({
    identnr: '',
    merkmal: '',
    auspraegung: '',
    drucktext: '',
    sondermerkmal: '',
    position: '',
    sonderAbt: '0',
    fertigungsliste: '0'
  });
  const [successMessage, setSuccessMessage] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterData, setFilterData] = useState({
    identnr: '',
    merkmal: '',
    auspraegung: '',
    drucktext: '',
    sondermerkmal: '',
    position: '',
    sonderAbt: '',
    fertigungsliste: ''
  });

  // Pagination Hook verwenden
  const {
    data: merkmalstexte,
    pagination,
    loading,
    error,
    goToPage,
    refresh,
    search,
    isEmpty,
    hasData
  } = usePagination('/merkmalstexte', 50);

  // API Base URL
  const API_BASE = 'http://localhost:3001/api/merkmalstexte';

  // Erfolgsnachricht anzeigen (mit automatischem Ausblenden)
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Fehlerbehandlung
  const handleApiError = (err, defaultMessage) => {
    console.error('API Fehler:', err);
    let errorMessage = defaultMessage;
    
    if (err.response?.data) {
      const responseData = err.response.data;
      if (responseData.message) {
        errorMessage = responseData.message;
      } else if (responseData.errors && Array.isArray(responseData.errors)) {
        errorMessage = responseData.errors.join(', ');
      }
    } else if (err.message) {
      errorMessage = `Netzwerkfehler: ${err.message}`;
    }
    
    showSuccess(`❌ ${errorMessage}`);
  };

  // Filter-Eingabe-Änderungen verarbeiten
  const handleFilterChange = (field, value) => {
    setFilterData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Suche durchführen
  const handleSearch = () => {
    const activeFilters = Object.keys(filterData).reduce((acc, key) => {
      if (filterData[key] && filterData[key].toString().trim() !== '') {
        acc[key] = filterData[key].toString().trim();
      }
      return acc;
    }, {});
    
    search(activeFilters);
    if (Object.keys(activeFilters).length > 0) {
      showSuccess('✅ Filter angewendet');
    }
  };

  // Alle Filter löschen
  const clearFilters = () => {
    setFilterData({
      identnr: '',
      merkmal: '',
      auspraegung: '',
      drucktext: '',
      sondermerkmal: '',
      position: '',
      sonderAbt: '',
      fertigungsliste: ''
    });
    search({}); // Alle Daten neu laden
    showSuccess('✅ Filter gelöscht');
  };

  // Formular zurücksetzen
  const resetForm = () => {
    setFormData({
      identnr: '',
      merkmal: '',
      auspraegung: '',
      drucktext: '',
      sondermerkmal: '',
      position: '',
      sonderAbt: '0',
      fertigungsliste: '0'
    });
    setEditingItem(null);
  };

  // Formular absenden
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Formular-Validierung
    if (!formData.identnr || !formData.merkmal || !formData.auspraegung || !formData.drucktext) {
      showSuccess('❌ Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }
    
    const isUpdate = !!editingItem;
    const operationType = isUpdate ? 'update' : 'create';
    
    try {
      setOperationLoading(prev => ({ ...prev, [operationType]: true }));
      
      let response;
      if (isUpdate) {
        response = await axios.put(`${API_BASE}/${editingItem.id}`, formData);
      } else {
        response = await axios.post(API_BASE, formData);
      }
      
      // Erfolgsmeldung vom API
      if (response.data.success) {
        showSuccess(`✅ ${response.data.message || (isUpdate ? 'Datensatz aktualisiert' : 'Datensatz erstellt')}`);
        resetForm();
        setShowForm(false);
        refresh(); // Daten neu laden
      } else {
        throw new Error(response.data.message || 'Unbekannter Fehler');
      }
    } catch (err) {
      handleApiError(err, isUpdate ? 'Fehler beim Aktualisieren' : 'Fehler beim Erstellen');
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationType]: false }));
    }
  };

  // Datensatz bearbeiten
  const handleEdit = (item) => {
    setFormData({
      identnr: item.identnr || '',
      merkmal: item.merkmal || '',
      auspraegung: item.auspraegung || '',
      drucktext: item.drucktext || '',
      sondermerkmal: item.sondermerkmal || '',
      position: item.position || '',
      sonderAbt: item.sonderAbt?.toString() || '0',
      fertigungsliste: item.fertigungsliste?.toString() || '0'
    });
    setEditingItem(item);
    setShowForm(true);
  };

  // Datensatz löschen
  const handleDelete = async (id, identnr) => {
    if (!window.confirm(`Möchten Sie den Datensatz "${identnr}" wirklich löschen?`)) {
      return;
    }
    
    try {
      setOperationLoading(prev => ({ ...prev, delete: true }));
      
      const response = await axios.delete(`${API_BASE}/${id}`);
      
      if (response.data.success) {
        showSuccess(`✅ ${response.data.message || 'Datensatz gelöscht'}`);
        refresh(); // Daten neu laden
      } else {
        throw new Error(response.data.message || 'Unbekannter Fehler');
      }
    } catch (err) {
      handleApiError(err, 'Fehler beim Löschen');
    } finally {
      setOperationLoading(prev => ({ ...prev, delete: false }));
    }
  };

  // Formular-Input ändern
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Sonder Abt. Renk adı gösterme fonksiyonu
  const getSonderAbtDisplay = (sonderAbtValue) => {
    if (!sonderAbtValue || sonderAbtValue === 0) {
      return '-';
    }
    
    const colorNames = {
      1: 'schwarz',
      2: 'blau',
      3: 'rot',
      4: 'orange',
      5: 'grün',
      6: 'weiss',
      7: 'gelb'
    };
    
    return colorNames[sonderAbtValue] || '-';
  };

  return (
    <div className="App">
      <Head>
        <title>Merkmalstexte Verwaltung - LEBO</title>
        <meta name="description" content="LEBO Merkmalstexte Management System" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="App-header">
        <div className="header-top">
          <h1>📊 Merkmalstexte Verwaltung</h1>
        </div>
        <div className="header-buttons">
          <button 
            className="btn btn-primary" 
            onClick={() => {
              if (showForm) {
                resetForm();
              }
              setShowForm(!showForm);
            }}
            disabled={loading || operationLoading.create || operationLoading.update}
          >
            {showForm ? '❌ Abbrechen' : '➕ Neu hinzufügen'}
          </button>
          <button 
            className="btn btn-info" 
            onClick={() => setShowFilters(!showFilters)}
            disabled={loading}
          >
            {showFilters ? '🔽 Filter ausblenden' : '🔍 Filter einblenden'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={refresh}
            disabled={loading}
          >
            {loading ? '⏳ Lädt...' : '🔄 Aktualisieren'}
          </button>
        </div>
      </header>

      <main className="App-main">
        {/* Erfolgsnachricht */}
        {successMessage && (
          <div className="success-message" role="alert">
            <span>{successMessage}</span>
            <button 
              onClick={() => setSuccessMessage('')}
              className="close-btn"
              aria-label="Nachricht schließen"
            >
              ×
            </button>
          </div>
        )}

        {/* Fehlernachricht */}
        {error && (
          <div className="error-message" role="alert">
            <span>❌ {error}</span>
            <button 
              onClick={() => window.location.reload()}
              className="close-btn"
              aria-label="Seite neu laden"
            >
              🔄
            </button>
          </div>
        )}

        {/* Erweiterte Filter */}
        {showFilters && (
          <section className="filter-section">
            <h3>🔍 Erweiterte Filter</h3>
            <div className="filter-grid">
              <input
                type="text"
                placeholder="Ident-Nr."
                value={filterData.identnr}
                onChange={(e) => handleFilterChange('identnr', e.target.value)}
                className="filter-input"
              />
              <input
                type="text"
                placeholder="Merkmal"
                value={filterData.merkmal}
                onChange={(e) => handleFilterChange('merkmal', e.target.value)}
                className="filter-input"
              />
              <input
                type="text"
                placeholder="Ausprägung"
                value={filterData.auspraegung}
                onChange={(e) => handleFilterChange('auspraegung', e.target.value)}
                className="filter-input"
              />
              <input
                type="text"
                placeholder="Drucktext"
                value={filterData.drucktext}
                onChange={(e) => handleFilterChange('drucktext', e.target.value)}
                className="filter-input"
              />
              <input
                type="text"
                placeholder="Sondermerkmal"
                value={filterData.sondermerkmal}
                onChange={(e) => handleFilterChange('sondermerkmal', e.target.value)}
                className="filter-input"
              />
              <input
                type="number"
                placeholder="Position"
                value={filterData.position}
                onChange={(e) => handleFilterChange('position', e.target.value)}
                className="filter-input"
              />
            </div>
            <div className="filter-buttons">
              <button 
                className="btn btn-primary" 
                onClick={handleSearch}
                disabled={loading}
              >
                🔍 Suchen
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={clearFilters}
                disabled={loading}
              >
                🗑️ Filter löschen
              </button>
            </div>
          </section>
        )}

        {/* Formular */}
        {showForm && (
          <section className="form-section">
            <h3>{editingItem ? '✏️ Datensatz bearbeiten' : '➕ Neuen Datensatz hinzufügen'}</h3>
            <form onSubmit={handleSubmit} className="data-form">
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Ident-Nr. *"
                  value={formData.identnr}
                  onChange={(e) => handleInputChange('identnr', e.target.value)}
                  required
                  className="form-input"
                />
                <input
                  type="text"
                  placeholder="Merkmal *"
                  value={formData.merkmal}
                  onChange={(e) => handleInputChange('merkmal', e.target.value)}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Ausprägung *"
                  value={formData.auspraegung}
                  onChange={(e) => handleInputChange('auspraegung', e.target.value)}
                  required
                  className="form-input"
                />
                <input
                  type="text"
                  placeholder="Drucktext *"
                  value={formData.drucktext}
                  onChange={(e) => handleInputChange('drucktext', e.target.value)}
                  required
                  className="form-input"
                />
              </div>
              <div className="form-row">
                <input
                  type="text"
                  placeholder="Sondermerkmal"
                  value={formData.sondermerkmal}
                  onChange={(e) => handleInputChange('sondermerkmal', e.target.value)}
                  className="form-input"
                />
                <input
                  type="number"
                  placeholder="Position"
                  value={formData.position}
                  onChange={(e) => handleInputChange('position', e.target.value)}
                  className="form-input"
                />
              </div>
              <div className="form-row">
                <select
                  value={formData.sonderAbt}
                  onChange={(e) => handleInputChange('sonderAbt', e.target.value)}
                  className="form-input"
                >
                  <option value="0">Sonder Abt.: Keine Auswahl</option>
                  <option value="1">1 - schwarz</option>
                  <option value="2">2 - blau</option>
                  <option value="3">3 - rot</option>
                  <option value="4">4 - orange</option>
                  <option value="5">5 - grün</option>
                  <option value="6">6 - weiss</option>
                  <option value="7">7 - gelb</option>
                </select>
                <select
                  value={formData.fertigungsliste}
                  onChange={(e) => handleInputChange('fertigungsliste', e.target.value)}
                  className="form-input"
                >
                  <option value="0">Fertigungsliste: Nein</option>
                  <option value="1">Fertigungsliste: Ja</option>
                </select>
              </div>
              <div className="form-buttons">
                <button 
                  type="submit" 
                  className="btn btn-success"
                  disabled={operationLoading.create || operationLoading.update}
                >
                  {operationLoading.create || operationLoading.update 
                    ? '⏳ Verarbeitung...' 
                    : (editingItem ? '💾 Aktualisieren' : '➕ Hinzufügen')
                  }
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary"
                  onClick={() => {
                    resetForm();
                    setShowForm(false);
                  }}
                  disabled={operationLoading.create || operationLoading.update}
                >
                  ❌ Abbrechen
                </button>
              </div>
            </form>
          </section>
        )}

        {/* Datenübersicht */}
        <section className="data-section">
          <div className="data-header">
            <h3>📋 Datensätze</h3>
            {!loading && (
              <p className="data-info">
                {hasData 
                  ? `Seite ${pagination.currentPage} von ${pagination.totalPages} (${pagination.totalCount} Datensätze insgesamt)`
                  : 'Keine Daten verfügbar'
                }
              </p>
            )}
          </div>

          {/* Ladebildschirm */}
          {loading && (
            <div className="loading-container">
              <div className="loading-spinner">⏳</div>
              <p>Daten werden geladen...</p>
            </div>
          )}

          {/* Keine Daten */}
          {isEmpty && !loading && (
            <div className="empty-state">
              <div className="empty-icon">📭</div>
              <h4>Keine Datensätze gefunden</h4>
              <p>Es wurden keine Datensätze mit den aktuellen Filtern gefunden.</p>
              {Object.values(filterData).some(v => v) && (
                <button className="btn btn-primary" onClick={clearFilters}>
                  🗑️ Filter zurücksetzen
                </button>
              )}
            </div>
          )}

          {/* Datentabelle */}
          {hasData && !loading && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Ident-Nr.</th>
                    <th>Merkmal</th>
                    <th>Ausprägung</th>
                    <th>Drucktext</th>
                    <th>Sondermerkmal</th>
                    <th>Position</th>
                    <th>Sonder Abt.</th>
                    <th>F-Liste</th>
                    <th>Aktionen</th>
                  </tr>
                </thead>
                <tbody>
                  {merkmalstexte.map((item) => (
                    <tr key={item.id}>
                      <td>{item.identnr}</td>
                      <td>{item.merkmal}</td>
                      <td>{item.auspraegung}</td>
                      <td title={item.drucktext}>
                        {item.drucktext?.length > 30 
                          ? `${item.drucktext.substring(0, 30)}...` 
                          : item.drucktext
                        }
                      </td>
                      <td>{item.sondermerkmal || '-'}</td>
                      <td>{item.position || '-'}</td>
                      <td>{getSonderAbtDisplay(item.sonderAbt || item.maka)}</td>
                      <td>{item.fertigungsliste === 1 ? '✅' : '❌'}</td>
                      <td>
                        <div className="action-buttons">
                          <button
                            className="btn-small btn-edit"
                            onClick={() => handleEdit(item)}
                            disabled={operationLoading.update}
                            title="Bearbeiten"
                          >
                            ✏️
                          </button>
                          <button
                            className="btn-small btn-delete"
                            onClick={() => handleDelete(item.id, item.identnr)}
                            disabled={operationLoading.delete}
                            title="Löschen"
                          >
                            🗑️
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {hasData && !loading && (
            <Pagination
              currentPage={pagination.currentPage}
              totalCount={pagination.totalCount}
              pageSize={pagination.pageSize}
              onPageChange={goToPage}
            />
          )}
        </section>
      </main>

      <style jsx>{`
        .App {
          text-align: center;
          background-color: #f5f5f5;
          min-height: 100vh;
        }

        .App-header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          padding: 20px;
          color: white;
          box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }

        .header-top {
          margin-bottom: 20px;
        }

        .header-top h1 {
          margin: 0;
          font-size: 2.2em;
          font-weight: 600;
        }

        .header-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .App-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 30px 20px;
        }

        .btn {
          padding: 12px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 600;
          transition: all 0.3s ease;
          font-size: 14px;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
          transform: none;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-info {
          background: #17a2b8;
          color: white;
        }

        .btn-success {
          background: #28a745;
          color: white;
        }

        .btn-small {
          padding: 8px 12px;
          font-size: 12px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          margin: 2px;
        }

        .btn-edit {
          background: #ffc107;
          color: #212529;
        }

        .btn-delete {
          background: #dc3545;
          color: white;
        }

        .success-message, .error-message {
          background: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .error-message {
          background: #f8d7da;
          border-color: #f5c6cb;
          color: #721c24;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          padding: 0 5px;
          margin-left: 10px;
        }

        .filter-section, .form-section, .data-section {
          background: white;
          border-radius: 12px;
          padding: 25px;
          margin-bottom: 25px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }

        .filter-section h3, .form-section h3, .data-section h3 {
          margin-top: 0;
          color: #333;
          font-size: 1.4em;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 15px;
          margin-bottom: 20px;
        }

        .filter-input, .form-input {
          padding: 12px;
          border: 2px solid #e9ecef;
          border-radius: 8px;
          font-size: 14px;
          transition: border-color 0.3s ease;
        }

        .filter-input:focus, .form-input:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 3px rgba(0,123,255,0.1);
        }

        .filter-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
        }

        .data-form {
          max-width: 800px;
          margin: 0 auto;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 15px;
          margin-bottom: 15px;
        }

        .form-buttons {
          display: flex;
          gap: 15px;
          justify-content: center;
          margin-top: 25px;
        }

        .data-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .data-info {
          color: #6c757d;
          margin: 0;
          font-size: 14px;
        }

        .loading-container {
          text-align: center;
          padding: 60px 20px;
          color: #6c757d;
        }

        .loading-spinner {
          font-size: 3em;
          margin-bottom: 15px;
          animation: spin 2s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #6c757d;
        }

        .empty-icon {
          font-size: 4em;
          margin-bottom: 20px;
        }

        .table-container {
          overflow-x: auto;
          border-radius: 8px;
          border: 1px solid #dee2e6;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          background: white;
        }

        .data-table th {
          background: #f8f9fa;
          padding: 15px 10px;
          text-align: left;
          font-weight: 600;
          color: #495057;
          border-bottom: 2px solid #dee2e6;
        }

        .data-table td {
          padding: 15px 10px;
          border-bottom: 1px solid #dee2e6;
          vertical-align: middle;
        }

        .data-table tr:hover {
          background: #f8f9fa;
        }

        .action-buttons {
          display: flex;
          gap: 5px;
          justify-content: center;
        }

        @media (max-width: 768px) {
          .header-buttons {
            flex-direction: column;
            align-items: center;
          }
          
          .form-row {
            grid-template-columns: 1fr;
          }
          
          .filter-grid {
            grid-template-columns: 1fr;
          }
          
          .data-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>
    </div>
  );
}