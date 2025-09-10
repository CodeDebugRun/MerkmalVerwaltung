import { useState, useEffect } from 'react';
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
  const [searchTerm, setSearchTerm] = useState('');
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
  const [darkMode, setDarkMode] = useState(false);

  // Dark mode localStorage'dan yükle
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  // Dark mode toggle function
  const toggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
  };

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

  // Schnelle Suche durchführen
  const handleQuickSearch = () => {
    if (searchTerm.trim()) {
      // Suche in mehreren Feldern gleichzeitig
      const searchFilter = {
        quickSearch: searchTerm.trim()
      };
      search(searchFilter);
      showSuccess(`🔍 Suche nach "${searchTerm.trim()}"`);
    } else {
      // Leere Suche = alle Daten laden
      search({});
      showSuccess('✅ Alle Daten geladen');
    }
  };

  // Suche durchführen (erweiterte Filter)
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
    setSearchTerm(''); // Arama terimini de temizle
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
    <div className={`App ${darkMode ? 'dark-mode' : ''}`}>
      <Head>
        <title>Merkmalstexte Verwaltung - LEBO</title>
        <meta name="description" content="LEBO Merkmalstexte Management System" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <header className="App-header">
        <div className="header-top">
          <h1>Lebo Merkmaltexte Verwaltung</h1>
        </div>
        <div className="header-center">
          <div className="search-container">
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleQuickSearch();
                }
              }}
              className="search-input"
              disabled={loading}
            />
            <button 
              className="search-button"
              onClick={handleQuickSearch}
              disabled={loading}
              title="Suchen"
            >
              🔍
            </button>
          </div>
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
          <button 
            className="btn btn-secondary" 
            onClick={toggleDarkMode}
            title={darkMode ? "Light Mode aktivieren" : "Dark Mode aktivieren"}
          >
            {darkMode ? '◐' : '●'}
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
                placeholder="Merkmalposition"
                value={filterData.position}
                onChange={(e) => handleFilterChange('position', e.target.value)}
                className="filter-input"
              />
              <select
                value={filterData.sonderAbt}
                onChange={(e) => handleFilterChange('sonderAbt', e.target.value)}
                className="filter-input"
              >
                <option value="">Sonder Abt.: Alle</option>
                <option value="1">1 - schwarz</option>
                <option value="2">2 - blau</option>
                <option value="3">3 - rot</option>
                <option value="4">4 - orange</option>
                <option value="5">5 - grün</option>
                <option value="6">6 - weiss</option>
                <option value="7">7 - gelb</option>
              </select>
              <select
                value={filterData.fertigungsliste}
                onChange={(e) => handleFilterChange('fertigungsliste', e.target.value)}
                className="filter-input"
              >
                <option value="">Fertigungsliste: Alle</option>
                <option value="1">Fertigungsliste: Ja</option>
                <option value="0">Fertigungsliste: Nein</option>
              </select>
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
                      <td>
                        <span style={{ color: item.fertigungsliste === 1 ? '#586069' : '#8b949e' }}>
                          {item.fertigungsliste === 1 ? '✓' : '✗'}
                        </span>
                      </td>
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
        /* PASTEL COLOR SCHEME - EYE-FRIENDLY DESIGN */
        :root {
          --primary-bg: #fafbfc;
          --secondary-bg: #ffffff;
          --accent-bg: #f6f8fa;
          --border-color: #e1e4e8;
          --text-primary: #586069;
          --text-secondary: #8b949e;
          --text-muted: #6a737d;
          --pastel-blue: #dbeafe;
          --pastel-green: #dcfce7;
          --pastel-yellow: #fef3c7;
          --pastel-red: #fecaca;
          --pastel-purple: #e9d5ff;
          --pastel-indigo: #e0e7ff;
          --soft-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          --medium-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
        }

        .App {
          text-align: center;
          background: linear-gradient(135deg, #fafbfc 0%, #f6f8fa 100%);
          min-height: 100vh;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .App-header {
          background: linear-gradient(135deg, #ffffff 0%, #f6f8fa 100%);
          padding: 24px 20px;
          color: var(--text-primary);
          box-shadow: var(--soft-shadow);
          border-bottom: 1px solid var(--border-color);
        }

        .header-top {
          margin-bottom: 20px;
        }

        .header-top h1 {
          margin: 0;
          font-size: 1.6em;
          font-weight: 500;
          color: #586069;
          letter-spacing: -0.5px;
        }

        .header-center {
          margin: 20px 0;
        }

        .search-container {
          display: flex;
          align-items: center;
          justify-content: center;
          max-width: 400px;
          margin: 0 auto;
          position: relative;
        }

        .search-input {
          flex: 1;
          padding: 12px 45px 12px 16px;
          border: 2px solid #e1e4e8;
          border-radius: 24px;
          background: #ffffff;
          color: #586069;
          font-size: 14px;
          transition: all 0.3s ease;
        }

        .search-input::placeholder {
          color: #6a737d;
        }

        .search-input:focus {
          outline: none;
          border-color: #a5b4fc;
          background: #ffffff;
          box-shadow: 0 0 0 3px rgba(165, 180, 252, 0.1);
        }

        .search-button {
          position: absolute;
          right: 6px;
          padding: 8px 12px;
          background: #e0e7ff;
          border: 1px solid #c7d2fe;
          border-radius: 18px;
          cursor: pointer;
          transition: all 0.3s ease;
          font-size: 14px;
          color: #586069;
        }

        .search-button:hover:not(:disabled) {
          background: #c7d2fe;
          transform: translateY(-1px);
        }

        .search-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .header-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          flex-wrap: wrap;
        }

        .App-main {
          max-width: 1400px;
          margin: 0 auto;
          padding: 24px 20px;
        }

        .btn {
          padding: 10px 20px;
          border: 1px solid transparent;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.3s ease;
          font-size: 14px;
          line-height: 1.4;
        }

        .btn:hover:not(:disabled) {
          transform: translateY(-1px);
          box-shadow: var(--medium-shadow);
        }

        .btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }

        .btn-primary {
          background: #dbeafe;
          color: #1e40af;
          border-color: #bfdbfe;
        }

        .btn-primary:hover:not(:disabled) {
          background: #bfdbfe;
          border-color: #93c5fd;
        }

        .btn-secondary {
          background: #f6f8fa;
          color: #586069;
          border-color: #e1e4e8;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #f1f3f4;
          border-color: #d0d7de;
        }

        .btn-info {
          background: #e0e7ff;
          color: #4338ca;
          border-color: #c7d2fe;
        }

        .btn-info:hover:not(:disabled) {
          background: #c7d2fe;
          border-color: #a5b4fc;
        }

        .btn-success {
          background: #dcfce7;
          color: #15803d;
          border-color: #bbf7d0;
        }

        .btn-success:hover:not(:disabled) {
          background: #bbf7d0;
          border-color: #86efac;
        }

        .btn-small {
          padding: 6px 12px;
          font-size: 12px;
          border: 1px solid transparent;
          border-radius: 6px;
          cursor: pointer;
          margin: 2px;
          font-weight: 500;
          transition: all 0.3s ease;
        }

        .btn-edit {
          background: transparent;
          color: #586069;
          border: none;
        }

        .btn-edit:hover:not(:disabled) {
          background: #f6f8fa;
          color: #586069;
          border: none;
          transform: translateY(-1px);
        }

        .btn-delete {
          background: transparent;
          color: #586069;
          border: none;
        }

        .btn-delete:hover:not(:disabled) {
          background: #f6f8fa;
          color: #586069;
          border: none;
          transform: translateY(-1px);
        }

        .success-message, .error-message {
          background: #dcfce7;
          border: 1px solid #bbf7d0;
          color: #15803d;
          padding: 16px 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
        }

        .error-message {
          background: #fecaca;
          border-color: #fca5a5;
          color: #dc2626;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 18px;
          cursor: pointer;
          padding: 4px 8px;
          margin-left: 12px;
          border-radius: 4px;
          color: inherit;
          opacity: 0.7;
          transition: all 0.3s ease;
        }

        .close-btn:hover {
          opacity: 1;
          background: rgba(0, 0, 0, 0.05);
        }

        .filter-section, .form-section, .data-section {
          background: #ffffff;
          border-radius: 16px;
          padding: 28px;
          margin-bottom: 24px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          border: 2px solid #e1e4e8;
          animation: slideInDown 0.4s ease-out;
          transform-origin: top;
        }

        @keyframes slideInDown {
          0% {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .filter-section h3, .form-section h3, .data-section h3 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #586069;
          font-size: 1.3em;
          font-weight: 500;
          animation: fadeInUp 0.4s ease-out;
          animation-fill-mode: both;
          animation-delay: 0.1s;
        }

        .filter-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 16px;
          margin-bottom: 24px;
        }

        .filter-grid .filter-input:nth-child(1) { animation-delay: 0.1s; }
        .filter-grid .filter-input:nth-child(2) { animation-delay: 0.15s; }
        .filter-grid .filter-input:nth-child(3) { animation-delay: 0.2s; }
        .filter-grid .filter-input:nth-child(4) { animation-delay: 0.25s; }
        .filter-grid .filter-input:nth-child(5) { animation-delay: 0.3s; }
        .filter-grid .filter-input:nth-child(6) { animation-delay: 0.35s; }

        .filter-input, .form-input {
          padding: 12px 16px;
          border: 2px solid #e1e4e8;
          border-radius: 8px;
          font-size: 14px;
          transition: all 0.3s ease;
          background: #ffffff;
          color: #586069;
          animation: fadeInUp 0.5s ease-out;
          animation-fill-mode: both;
        }

        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .filter-input:focus, .form-input:focus {
          outline: none;
          border-color: #a5b4fc;
          box-shadow: 0 0 0 3px rgba(165, 180, 252, 0.1);
        }

        .filter-input::placeholder, .form-input::placeholder {
          color: #6a737d;
        }

        .filter-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: both;
          animation-delay: 0.2s;
        }

        .form-buttons {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin-top: 28px;
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: both;
          animation-delay: 0.3s;
        }

        .data-form {
          max-width: 800px;
          margin: 0 auto;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 16px;
        }


        .data-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .data-info {
          color: #8b949e;
          margin: 0;
          font-size: 14px;
          font-weight: 400;
        }

        .loading-container {
          text-align: center;
          padding: 60px 20px;
          color: #8b949e;
        }

        .loading-spinner {
          font-size: 2.5em;
          margin-bottom: 16px;
          animation: spin 2s linear infinite;
          color: #6a737d;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #8b949e;
        }

        .empty-icon {
          font-size: 3.5em;
          margin-bottom: 20px;
          color: #6a737d;
        }

        .table-container {
          overflow-x: auto;
          border-radius: 12px;
          border: 2px solid #e1e4e8;
          background: #ffffff;
        }

        .data-table {
          width: 100%;
          border-collapse: collapse;
          background: #ffffff;
        }

        .data-table th {
          background: #f6f8fa;
          padding: 16px 12px;
          text-align: left;
          font-weight: 500;
          color: #586069;
          border-bottom: 2px solid #e1e4e8;
          font-size: 14px;
        }

        .data-table td {
          padding: 14px 12px;
          border-bottom: 1px solid #e1e4e8;
          vertical-align: middle;
          color: #586069;
          font-size: 14px;
        }

        .data-table tr:hover {
          background: #f6f8fa;
        }

        .action-buttons {
          display: flex;
          gap: 6px;
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

        /* Dark Mode Styles */
        .App.dark-mode {
          background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
          color: #e1e4e8;
        }

        .App.dark-mode .App-header {
          background: linear-gradient(135deg, #2d2d2d 0%, #3a3a3a 100%);
          border-bottom: 1px solid #444;
        }

        .App.dark-mode .header-top h1 {
          color: #e1e4e8;
        }

        .App.dark-mode .search-input {
          background: #3a3a3a;
          border-color: #555;
          color: #e1e4e8;
        }

        .App.dark-mode .search-input::placeholder {
          color: #888;
        }

        .App.dark-mode .search-button {
          background: #4a4a4a;
          border-color: #555;
          color: #e1e4e8;
        }

        .App.dark-mode .btn {
          background: #4a4a4a;
          border-color: #555;
          color: #e1e4e8;
        }

        .App.dark-mode .btn:hover:not(:disabled) {
          background: #555;
          border-color: #666;
        }

        .App.dark-mode .btn-primary {
          background: #1e3a8a;
          border-color: #1e40af;
          color: #dbeafe;
        }

        .App.dark-mode .btn-primary:hover:not(:disabled) {
          background: #1e40af;
          border-color: #3b82f6;
        }

        .App.dark-mode .filter-section, .App.dark-mode .form-section, .App.dark-mode .data-section {
          background: #2d2d2d;
          border-color: #444;
        }

        .App.dark-mode .filter-section h3, .App.dark-mode .form-section h3, .App.dark-mode .data-section h3 {
          color: #e1e4e8;
        }

        .App.dark-mode .filter-input, .App.dark-mode .form-input {
          background: #3a3a3a;
          border-color: #555;
          color: #e1e4e8;
        }

        .App.dark-mode .filter-input::placeholder, .App.dark-mode .form-input::placeholder {
          color: #888;
        }

        .App.dark-mode .table-container {
          border-color: #444;
          background: #2d2d2d;
        }

        .App.dark-mode .data-table {
          background: #2d2d2d;
        }

        .App.dark-mode .data-table th {
          background: #3a3a3a;
          border-color: #444;
          color: #e1e4e8;
        }

        .App.dark-mode .data-table td {
          border-color: #444;
          color: #e1e4e8;
        }

        .App.dark-mode .data-table tr:hover {
          background: #3a3a3a;
        }

        .App.dark-mode .success-message {
          background: #1a4d3a;
          border-color: #2d7d5a;
          color: #86efac;
        }

        .App.dark-mode .error-message {
          background: #4d1a1a;
          border-color: #7d2d2d;
          color: #fca5a5;
        }

        .App.dark-mode .loading-container {
          color: #888;
        }

        .App.dark-mode .empty-state {
          color: #888;
        }

        .App.dark-mode .data-info {
          color: #888;
        }
      `}</style>
    </div>
  );
}