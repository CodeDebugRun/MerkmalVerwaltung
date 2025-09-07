import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

function App() {
  const [merkmalstexte, setMerkmalstexte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    identnr: '',
    merkmal: '',
    auspraegung: '',
    drucktext: '',
    sondermerkmal: '',
    position: '',
    sonderAbt: '',
    fListe: ''
  });
  const [searchTerm, setSearchTerm] = useState('');

  // API endpoint
  const API_BASE = '/api/merkmalstexte';

  // Fetch all records
  useEffect(() => {
    fetchMerkmalstexte();
  }, []);

  const fetchMerkmalstexte = async () => {
    try {
      setLoading(true);
      const response = await axios.get(API_BASE);
      setMerkmalstexte(response.data);
      setError(null);
    } catch (err) {
      setError('Error loading data: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await axios.put(`${API_BASE}/${editingItem.id}`, formData);
      } else {
        await axios.post(API_BASE, formData);
      }
      await fetchMerkmalstexte();
      resetForm();
    } catch (err) {
      setError('Error saving data: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      try {
        await axios.delete(`${API_BASE}/${id}`);
        await fetchMerkmalstexte();
      } catch (err) {
        setError('Error deleting record: ' + err.message);
      }
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
      sonderAbt: item.sonderAbt || '',
      fListe: item.fListe || ''
    });
    setShowForm(true);
  };

  const resetForm = () => {
    setFormData({
      identnr: '',
      merkmal: '',
      auspraegung: '',
      drucktext: '',
      sondermerkmal: '',
      position: '',
      sonderAbt: '',
      fListe: ''
    });
    setEditingItem(null);
    setShowForm(false);
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
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
      item.position?.toLowerCase().includes(searchLower) ||
      item.sonderAbt?.toLowerCase().includes(searchLower) ||
      item.fListe?.toLowerCase().includes(searchLower) ||
      item.id?.toString().includes(searchTerm)
    );
  });

  return (
    <div className="App">
      <header className="App-header">
        <div className="header-left">
          <h1>LEBO Merkmalstexte Management</h1>
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
          >
            {showForm ? 'Abbrechen' : 'Neu hinzufügen'}
          </button>
          <button 
            className="btn btn-secondary" 
            onClick={fetchMerkmalstexte}
            disabled={loading}
          >
            Aktualisieren
          </button>
        </div>
      </header>

      <main className="App-main">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {showForm && (
          <div className="form-container">
            <h2>{editingItem ? 'Edit Record' : 'Add New Record'}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Ident Nr:</label>
                <input
                  type="text"
                  name="identnr"
                  value={formData.identnr}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Merkmal:</label>
                <input
                  type="text"
                  name="merkmal"
                  value={formData.merkmal}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Ausprägung:</label>
                <input
                  type="text"
                  name="auspraegung"
                  value={formData.auspraegung}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Drucktext:</label>
                <input
                  type="text"
                  name="drucktext"
                  value={formData.drucktext}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Sondermerkmal:</label>
                <input
                  type="text"
                  name="sondermerkmal"
                  value={formData.sondermerkmal}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Position:</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>Sonder Abt.:</label>
                <input
                  type="text"
                  name="sonderAbt"
                  value={formData.sonderAbt}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-group">
                <label>F-Liste:</label>
                <input
                  type="text"
                  name="fListe"
                  value={formData.fListe}
                  onChange={handleInputChange}
                />
              </div>
              <div className="form-buttons">
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Update' : 'Create'}
                </button>
                <button type="button" className="btn btn-secondary" onClick={resetForm}>
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        <div className="data-section">
          <h2>
            Datensätze ({filteredMerkmalstexte.length} 
            {searchTerm && ` von ${merkmalstexte.length} gefiltert`})
          </h2>
          {loading ? (
            <div className="loading">Laden...</div>
          ) : (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
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
                      <td>{item.id}</td>
                      <td>{item.identnr}</td>
                      <td>{item.merkmal}</td>
                      <td>{item.auspraegung}</td>
                      <td>{item.drucktext}</td>
                      <td>{item.sondermerkmal}</td>
                      <td>{item.position}</td>
                      <td>{item.sonderAbt}</td>
                      <td>{item.fListe}</td>
                      <td className="actions">
                        <button 
                          className="btn btn-edit" 
                          onClick={() => handleEdit(item)}
                        >
                          Bearbeiten
                        </button>
                        <button 
                          className="btn btn-delete" 
                          onClick={() => handleDelete(item.id)}
                        >
                          Löschen
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredMerkmalstexte.length === 0 && searchTerm && (
                <p className="table-note">Keine Ergebnisse für "{searchTerm}" gefunden.</p>
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

export default App;
