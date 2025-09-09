import { useState, useEffect } from 'react';
import axios from 'axios';
import Head from 'next/head';

export default function Home() {
  const [merkmalstexte, setMerkmalstexte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
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

  // API endpoint
  const API_BASE = '/api/merkmalstexte';

  // Utility function to handle API errors
  const handleApiError = (err, defaultMessage) => {
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
    
    setError(errorMessage);
    setTimeout(() => setError(null), 5000); // Auto-clear after 5 seconds
  };

  // Show success message with auto-clear
  const showSuccess = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  // Fetch all records
  useEffect(() => {
    fetchMerkmalstexte();
  }, []);

  const fetchMerkmalstexte = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await axios.get(API_BASE);
      
      // Handle new API response format
      if (response.data.success && response.data.data) {
        setMerkmalstexte(response.data.data);
      } else {
        // Fallback for old format
        setMerkmalstexte(Array.isArray(response.data) ? response.data : []);
      }
    } catch (err) {
      handleApiError(err, 'Fehler beim Laden der Daten');
      setMerkmalstexte([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Form validation
    if (!formData.identnr || !formData.merkmal || !formData.auspraegung || !formData.drucktext) {
      setError('Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }
    
    const isUpdate = !!editingItem;
    const operationType = isUpdate ? 'update' : 'create';
    
    try {
      setOperationLoading(prev => ({ ...prev, [operationType]: true }));
      setError(null);
      
      let response;
      if (isUpdate) {
        response = await axios.put(`${API_BASE}/${editingItem.id}`, formData);
      } else {
        response = await axios.post(API_BASE, formData);
      }
      
      // Handle success message from API
      if (response.data.success && response.data.message) {
        showSuccess(response.data.message);
      } else {
        showSuccess(isUpdate ? 'Datensatz erfolgreich aktualisiert' : 'Datensatz erfolgreich erstellt');
      }
      
      await fetchMerkmalstexte();
      resetForm();
    } catch (err) {
      handleApiError(err, isUpdate ? 'Fehler beim Aktualisieren' : 'Fehler beim Erstellen');
    } finally {
      setOperationLoading(prev => ({ ...prev, [operationType]: false }));
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Sind Sie sicher, dass Sie diesen Datensatz löschen möchten?')) {
      return;
    }
    
    try {
      setOperationLoading(prev => ({ ...prev, delete: true }));
      setError(null);
      
      const response = await axios.delete(`${API_BASE}/${id}`);
      
      if (response.data.success && response.data.message) {
        showSuccess(response.data.message);
      } else {
        showSuccess('Datensatz erfolgreich gelöscht');
      }
      
      await fetchMerkmalstexte();
    } catch (err) {
      handleApiError(err, 'Fehler beim Löschen des Datensatzes');
    } finally {
      setOperationLoading(prev => ({ ...prev, delete: false }));
    }
  };

  const handleEdit = (item) => {
    setEditingItem(item);
    setFormData({
      identnr: item.identnr || '',
      merkmal: item.merkmal || '',
      auspraegung: item.auspraegung || '',
      drucktext: item.drucktext || '',
      sondermerkmal: item.sondermerkmal || '',
      position: item.position || '',
      sonderAbt: item.sonderAbt ? item.sonderAbt.toString() : '0',
      fertigungsliste: (item.fertigungsliste && item.fertigungsliste !== 0) ? '1' : '0'
    });
    setShowForm(true);
    setError(null);
  };

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
    setShowForm(false);
    setError(null);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  // Color mapping function for Sonder Abt (maka) field
  const getSonderAbtColor = (makaValue) => {
    if (!makaValue || makaValue === 0) return '';
    
    switch (parseInt(makaValue)) {
      case 1: return 'schwarz';
      case 2: return 'blau';
      case 3: return 'rot';
      case 4: return 'orange';
      case 5: return 'grün';
      case 6: return 'weiss';
      case 7: return 'gelb';
      default: return '';
    }
  };

  // Filter records based on search term
  const filteredMerkmalstexte = merkmalstexte.filter(item => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      item.identnr?.toLowerCase().includes(searchLower) ||
      item.merkmal?.toLowerCase().includes(searchLower) ||
      item.auspraegung?.toLowerCase().includes(searchLower) ||
      item.drucktext?.toLowerCase().includes(searchLower) ||
      item.sondermerkmal?.toLowerCase().includes(searchLower) ||
      item.position?.toString().includes(searchLower) ||
      item.sonderAbt?.toString().includes(searchLower) ||
      item.fertigungsliste?.toString().includes(searchLower) ||
      item.id?.toString().includes(searchTerm)
    );
  });

  return (
    <div className="App">
      <Head>
        <title>LEBO Merkmalstexte Verwaltung</title>
        <meta name="description" content="LEBO Merkmalstexte Verwaltungssystem" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="App-header">
        <div className="header-left">
          <h1>LEBO Merkmalstexte Verwaltung</h1>
        </div>
        <div className="header-center">
          <div className="search-container">
            <input
              type="text"
              placeholder="Suchen..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="search-input"
            />
            <div className="search-icon">🔍</div>
          </div>
        </div>
        <div className="header-buttons">
          <button 
            className="btn btn-primary" 
            onClick={() => setShowForm(!showForm)}
            disabled={operationLoading.create || operationLoading.update}
          >
            {showForm ? 'Abbrechen' : 'Neu hinzufügen'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={fetchMerkmalstexte}
            disabled={loading}
          >
            {loading ? 'Lädt...' : 'Aktualisieren'}
          </button>
        </div>
      </header>

      <main className="App-main">
        {/* Success Message */}
        {successMessage && (
          <div className="success-message" role="alert">
            <span>✅</span>
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

        {/* Error Message */}
        {error && (
          <div className="error-message" role="alert">
            <span>❌</span>
            <span>{error}</span>
            <button 
              onClick={() => setError(null)}
              className="close-btn"
              aria-label="Fehlermeldung schließen"
            >
              ×
            </button>
          </div>
        )}

        {/* Form */}
        {showForm && (
          <div className="form-container">
            <h2>{editingItem ? 'Datensatz bearbeiten' : 'Neuen Datensatz hinzufügen'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>Ident Nr: <span className="required">*</span></label>
                  <input
                    type="text"
                    name="identnr"
                    value={formData.identnr}
                    onChange={handleInputChange}
                    required
                    maxLength={50}
                    disabled={operationLoading.create || operationLoading.update}
                  />
                </div>
                <div className="form-group">
                  <label>Merkmal: <span className="required">*</span></label>
                  <input
                    type="text"
                    name="merkmal"
                    value={formData.merkmal}
                    onChange={handleInputChange}
                    required
                    maxLength={100}
                    disabled={operationLoading.create || operationLoading.update}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Ausprägung: <span className="required">*</span></label>
                  <input
                    type="text"
                    name="auspraegung"
                    value={formData.auspraegung}
                    onChange={handleInputChange}
                    required
                    maxLength={100}
                    disabled={operationLoading.create || operationLoading.update}
                  />
                </div>
                <div className="form-group">
                  <label>Drucktext: <span className="required">*</span></label>
                  <input
                    type="text"
                    name="drucktext"
                    value={formData.drucktext}
                    onChange={handleInputChange}
                    required
                    maxLength={255}
                    disabled={operationLoading.create || operationLoading.update}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label>Sondermerkmal:</label>
                  <input
                    type="text"
                    name="sondermerkmal"
                    value={formData.sondermerkmal}
                    onChange={handleInputChange}
                    maxLength={100}
                    disabled={operationLoading.create || operationLoading.update}
                  />
                </div>
                <div className="form-group">
                  <label>Position:</label>
                  <input
                    type="number"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    min="0"
                    disabled={operationLoading.create || operationLoading.update}
                  />
                </div>
              </div>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="sonderAbt">Sonder Abt.</label>
                  <select
                    id="sonderAbt"
                    name="sonderAbt"
                    value={formData.sonderAbt}
                    onChange={handleInputChange}
                    disabled={operationLoading.create || operationLoading.update}
                  >
                    <option value="0">Keine Auswahl</option>
                    <option value="1">Schwarz</option>
                    <option value="2">Blau</option>
                    <option value="3">Rot</option>
                    <option value="4">Orange</option>
                    <option value="5">Grün</option>
                    <option value="6">Weiss</option>
                    <option value="7">Gelb</option>
                  </select>
                </div>
                <div className="form-group checkbox-group">
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      name="fertigungsliste"
                      checked={formData.fertigungsliste === '1' || formData.fertigungsliste === 1}
                      onChange={(e) => setFormData({
                        ...formData,
                        fertigungsliste: e.target.checked ? '1' : '0'
                      })}
                      disabled={operationLoading.create || operationLoading.update}
                    />
                    <span className="checkmark"></span>
                    Fertigungsliste
                  </label>
                </div>
              </div>
              
              <div className="form-buttons">
                <button 
                  type="submit" 
                  className="btn btn-primary"
                  disabled={operationLoading.create || operationLoading.update}
                >
                  {operationLoading.create || operationLoading.update ? 
                    'Wird gespeichert...' : 
                    (editingItem ? 'Aktualisieren' : 'Erstellen')
                  }
                </button>
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={resetForm}
                  disabled={operationLoading.create || operationLoading.update}
                >
                  Abbrechen
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Data Table */}
        <div className="data-section">
          <h2>
            Datensätze ({filteredMerkmalstexte.length} 
            {searchTerm && ` von ${merkmalstexte.length} gefiltert`})
          </h2>
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
              <span>Daten werden geladen...</span>
            </div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Identnr</th>
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
                  {filteredMerkmalstexte.slice(0, 50).map((item) => (
                    <tr key={item.id}>
                      <td>{item.identnr}</td>
                      <td>{item.merkmal}</td>
                      <td>{item.auspraegung}</td>
                      <td>{item.drucktext}</td>
                      <td>{item.sondermerkmal || '-'}</td>
                      <td>{item.position || '-'}</td>
                      <td className="checkbox-cell">{getSonderAbtColor(item.sonderAbt) || '❌'}</td>
                      <td className="checkbox-cell">{item.fertigungsliste && item.fertigungsliste !== 0 ? '✅' : '❌'}</td>
                      <td className="actions">
                        <button 
                          className="btn btn-icon btn-edit" 
                          onClick={() => handleEdit(item)}
                          disabled={operationLoading.create || operationLoading.update || operationLoading.delete}
                          title="Bearbeiten"
                        >
                          ✏️
                        </button>
                        <button 
                          className="btn btn-icon btn-delete" 
                          onClick={() => handleDelete(item.id)}
                          disabled={operationLoading.create || operationLoading.update || operationLoading.delete}
                          title={operationLoading.delete ? 'Löscht...' : 'Löschen'}
                        >
                          {operationLoading.delete ? '⏳' : '🗑️'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMerkmalstexte.length === 0 && searchTerm && (
                <p className="table-note">Keine Ergebnisse für "{searchTerm}" gefunden.</p>
              )}
              {filteredMerkmalstexte.length === 0 && !searchTerm && !loading && (
                <p className="table-note">Keine Datensätze verfügbar.</p>
              )}
              {filteredMerkmalstexte.length > 50 && (
                <p className="table-note">
                  Die ersten 50 Datensätze von {filteredMerkmalstexte.length} werden angezeigt
                  {searchTerm && ` (gefiltert von ${merkmalstexte.length} Gesamtdatensätzen)`}
                </p>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}