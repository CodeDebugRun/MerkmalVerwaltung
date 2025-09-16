import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MerkmalTable from '../components/MerkmalTable';
import FilterPanel from '../components/FilterPanel';
import SettingsModal from '../components/SettingsModal';
import MerkmalForm from '../components/MerkmalForm';

export default function Home() {
  // Data state
  const [merkmalstexte, setMerkmalstexte] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [totalRecords, setTotalRecords] = useState(0);

  // Core state
  const [editingItem, setEditingItem] = useState(null);
  const [operationLoading, setOperationLoading] = useState({
    create: false,
    update: false,
    delete: false
  });

  // Form state - sadece inline edit için
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

  // UI state
  const [successMessage, setSuccessMessage] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Settings state
  const [showSettings, setShowSettings] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [selectedIdentnrs, setSelectedIdentnrs] = useState([]);
  const [showIdentnrDropdown, setShowIdentnrDropdown] = useState(false);
  const [customIdentnr, setCustomIdentnr] = useState('');

  // Filter state
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
  const [selectedFilterIdentnrs, setSelectedFilterIdentnrs] = useState([]);
  const [showFilterIdentnrDropdown, setShowFilterIdentnrDropdown] = useState(false);
  const [customFilterIdentnr, setCustomFilterIdentnr] = useState('');
  const [allIdentnrs, setAllIdentnrs] = useState([]); // Will load from API

  // API Base
  const API_BASE = 'http://localhost:3001/api/merkmalstexte';

  // Mock data for testing
  const mockData = [
    {
      id: 1,
      identnr: 'TEST001',
      merkmal: 'Farbe',
      auspraegung: 'Rot',
      drucktext: 'Rot lackiert',
      sondermerkmal: 'UV-beständig',
      merkmalsposition: 1,
      maka: 3,
      fertigungsliste: 1
    },
    {
      id: 2,
      identnr: 'TEST002',
      merkmal: 'Material',
      auspraegung: 'Aluminium',
      drucktext: 'Aluminium eloxiert',
      sondermerkmal: '',
      merkmalsposition: 2,
      maka: 0,
      fertigungsliste: 0
    },
    {
      id: 3,
      identnr: 'TEST003',
      merkmal: 'Größe',
      auspraegung: '100x200',
      drucktext: 'Standardgröße 100x200mm',
      sondermerkmal: 'Sondermaß',
      merkmalsposition: 3,
      maka: 1,
      fertigungsliste: 1
    }
  ];

  // Data fetching with fallback to mock data
  const fetchMerkmalstexte = async () => {
    try {
      setLoading(true);
      setError('');

      // Try real API first - use grouped endpoint
      const response = await fetch(`http://localhost:3001/api/grouped/merkmalstexte?page=1&pageSize=100`);
      const data = await response.json();

      if (data.success) {
        setMerkmalstexte(data.data || []);
        setTotalRecords(data.pagination?.totalRecords || 0);
      } else {
        // Fallback to mock data
        console.warn('API failed, using mock data');
        setMerkmalstexte(mockData);
        setError('⚠️ Demo-Modus: Verwende Testdaten (Database nicht verfügbar)');
      }
    } catch (err) {
      // Fallback to mock data
      console.warn('Connection failed, using mock data:', err.message);
      setMerkmalstexte(mockData);
      setError('⚠️ Demo-Modus: Verwende Testdaten (Server nicht erreichbar)');
    } finally {
      setLoading(false);
    }
  };

  // Computed values
  const hasData = merkmalstexte && merkmalstexte.length > 0;
  const sortedMerkmalstexte = React.useMemo(() => {
    if (!merkmalstexte || !sortConfig.key) return merkmalstexte;

    return [...merkmalstexte].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';

      if (sortConfig.direction === 'asc') {
        return aVal.toString().localeCompare(bVal.toString());
      } else {
        return bVal.toString().localeCompare(aVal.toString());
      }
    });
  }, [merkmalstexte, sortConfig]);

  // Fetch all identnrs from API
  const fetchAllIdentnrs = async () => {
    try {
      const response = await fetch(`${API_BASE}/list/identnrs`);
      const data = await response.json();

      if (data.success) {
        setAllIdentnrs(data.data || []);
      } else {
        console.warn('Failed to fetch identnrs, using empty array');
        setAllIdentnrs([]);
      }
    } catch (err) {
      console.warn('Error fetching identnrs:', err.message);
      setAllIdentnrs([]);
    }
  };

  // Initialize data and settings
  useEffect(() => {
    fetchMerkmalstexte();
    fetchAllIdentnrs();

    // Load saved settings from localStorage
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    }
  }, []);

  // Auto-hide success message
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Utility functions
  const showSuccess = (message) => setSuccessMessage(message);

  const handleApiError = (err, defaultMessage) => {
    const message = err.response?.data?.message || err.message || defaultMessage;
    console.error(message, err);
    alert(message);
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
  };

  const getSonderAbtDisplay = (value) => {
    const sonderAbtMap = {
      0: 'Keine',
      1: '1 - schwarz',
      2: '2 - blau',
      3: '3 - rot',
      4: '4 - orange',
      5: '5 - grün',
      6: '6 - weiss',
      7: '7 - gelb'
    };
    return sonderAbtMap[value] || 'Unbekannt';
  };

  const copyToClipboard = async (text, type) => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(`${type} erfolgreich kopiert: ${text}`);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // Event handlers
  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleEdit = (item) => {
    if (editingItem && editingItem.id === item.id) {
      resetForm();
      return;
    }

    setEditingItem(item);
    setFormData({
      identnr: item.identnr,
      merkmal: item.merkmal,
      auspraegung: item.auspraegung,
      drucktext: item.drucktext,
      sondermerkmal: item.sondermerkmal || '',
      position: item.position || '',
      sonderAbt: item.sonderAbt?.toString() || '0',
      fertigungsliste: item.fertigungsliste?.toString() || '0'
    });
  };

  const handleDelete = async (id, identnr) => {
    if (!window.confirm(`Möchten Sie den Datensatz mit der ID ${id} (Ident-Nr: ${identnr}) wirklich löschen?`)) {
      return;
    }

    try {
      setOperationLoading(prev => ({ ...prev, delete: true }));
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error('Delete failed');
      }

      showSuccess(`✅ Datensatz ${id} erfolgreich gelöscht`);
      await fetchMerkmalstexte(); // Refresh data
    } catch (err) {
      handleApiError(err, 'Fehler beim Löschen');
    } finally {
      setOperationLoading(prev => ({ ...prev, delete: false }));
    }
  };

  // Dummy handlers for inline edit (will be implemented later)
  const handleInlineSubmit = (e) => {
    e.preventDefault();
    console.log('Inline submit - will implement later');
    resetForm();
  };

  const handleInlineDropdownToggle = () => {
    console.log('Inline dropdown toggle - will implement later');
  };

  // Filter handlers
  const handleFilterChange = (field, value) => {
    setFilterData(prev => ({ ...prev, [field]: value }));
  };

  const handleFilterIdentnrDropdownToggle = () => {
    setShowFilterIdentnrDropdown(!showFilterIdentnrDropdown);
  };

  const handleCustomFilterIdentnrChange = (value) => {
    setCustomFilterIdentnr(value);
  };

  const handleToggleFilterIdentnrSelection = (identnr) => {
    // Only allow single selection for simplicity
    if (selectedFilterIdentnrs.includes(identnr)) {
      setSelectedFilterIdentnrs([]);
    } else {
      setSelectedFilterIdentnrs([identnr]);
    }
  };

  const handleRemoveFilterIdentnr = () => {
    setSelectedFilterIdentnrs([]);
  };

  const handleFilterSearch = async () => {
    try {
      setLoading(true);
      setError('');

      // Build query parameters
      const params = new URLSearchParams();

      // Add filter parameters
      if (filterData.merkmal) params.append('merkmal', filterData.merkmal);
      if (filterData.auspraegung) params.append('auspraegung', filterData.auspraegung);
      if (filterData.drucktext) params.append('drucktext', filterData.drucktext);
      if (filterData.sondermerkmal) params.append('sondermerkmal', filterData.sondermerkmal);
      if (filterData.position) params.append('position', filterData.position);
      if (filterData.sonderAbt) params.append('sonderAbt', filterData.sonderAbt);
      if (filterData.fertigungsliste) params.append('fertigungsliste', filterData.fertigungsliste);

      // Add selected Ident-Nr if any
      if (selectedFilterIdentnrs.length > 0) {
        params.append('identnr', selectedFilterIdentnrs[0]); // Only one allowed
      }

      params.append('limit', '100'); // Default limit

      const response = await fetch(`${API_BASE}/filter?${params.toString()}`);
      const data = await response.json();

      if (data.success) {
        setMerkmalstexte(data.data.data || []);
        const count = data.data.pagination?.totalCount || 0;
        setTotalRecords(count);
        showSuccess(`🔍 ${count} Datensätze gefunden`);
      } else {
        setError('Filter-Suche fehlgeschlagen');
      }
    } catch (err) {
      console.error('Filter error:', err);
      setError('Fehler beim Filtern der Daten');
    } finally {
      setLoading(false);
    }
  };

  const handleClearFilters = () => {
    // Clear all filter states
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
    setSelectedFilterIdentnrs([]);
    setCustomFilterIdentnr('');

    // Reload all data
    fetchMerkmalstexte();
    showSuccess('🗑️ Filter gelöscht - Alle Daten geladen');
  };

  // Computed filter values
  const filteredFilterIdentnrs = customFilterIdentnr
    ? allIdentnrs.filter(identnr =>
        identnr.toLowerCase().includes(customFilterIdentnr.toLowerCase())
      )
    : allIdentnrs;

  // Settings handlers
  const handleToggleDarkMode = () => {
    const newDarkMode = !darkMode;
    setDarkMode(newDarkMode);
    localStorage.setItem('darkMode', JSON.stringify(newDarkMode));
    showSuccess(newDarkMode ? '🌙 Dark Mode aktiviert' : '☀️ Light Mode aktiviert');
  };


  const handleCloseSettings = () => {
    setShowSettings(false);
  };

  // Form handlers
  const handleShowCreateForm = () => {
    setEditingItem(null);
    resetForm();
    setSelectedIdentnrs([]);
    setCustomIdentnr('');
    setShowForm(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    // Validation
    if (!formData.merkmal || !formData.auspraegung || !formData.drucktext || selectedIdentnrs.length === 0) {
      alert('Bitte füllen Sie alle Pflichtfelder aus: Ident-Nr., Merkmal, Ausprägung und Drucktext');
      return;
    }

    try {
      setOperationLoading(prev => ({ ...prev, create: true }));

      // Create record for each selected Ident-Nr
      for (const identnr of selectedIdentnrs) {
        const response = await fetch(`${API_BASE}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identnr: identnr,
            merkmal: formData.merkmal,
            auspraegung: formData.auspraegung,
            drucktext: formData.drucktext,
            sondermerkmal: formData.sondermerkmal || '',
            position: formData.position || '',
            sonderAbt: formData.sonderAbt || '0',
            fertigungsliste: formData.fertigungsliste || '0'
          })
        });

        if (!response.ok) {
          throw new Error(`Failed to create record for ${identnr}`);
        }
      }

      // Success
      const count = selectedIdentnrs.length;
      const identnrList = selectedIdentnrs.join(', ');
      showSuccess(`✅ ${count} Datensatz${count > 1 ? 'e' : ''} erfolgreich erstellt für: ${identnrList}`);

      setShowForm(false);
      resetForm();
      setSelectedIdentnrs([]);
      setCustomIdentnr('');

      // Refresh data
      await fetchMerkmalstexte();

    } catch (err) {
      handleApiError(err, 'Fehler beim Erstellen der Datensätze');
    } finally {
      setOperationLoading(prev => ({ ...prev, create: false }));
    }
  };

  const handleFormCancel = () => {
    setShowForm(false);
    resetForm();
    setSelectedIdentnrs([]);
    setCustomIdentnr('');
  };

  const handleIdentnrDropdownToggle = () => {
    setShowIdentnrDropdown(!showIdentnrDropdown);
  };

  const handleCustomIdentnrChange = (value) => {
    setCustomIdentnr(value);
  };

  const handleCustomIdentnrKeyDown = (e) => {
    if (e.key === 'Enter' && customIdentnr.trim()) {
      e.preventDefault();
      handleAddCustomIdentnr();
    }
  };

  const handleAddCustomIdentnr = () => {
    const newIdentnr = customIdentnr.trim();
    if (newIdentnr && !selectedIdentnrs.includes(newIdentnr)) {
      setSelectedIdentnrs([...selectedIdentnrs, newIdentnr]);
      setCustomIdentnr('');
    }
  };

  const handleToggleIdentnrSelection = (identnr) => {
    if (selectedIdentnrs.includes(identnr)) {
      setSelectedIdentnrs(selectedIdentnrs.filter(id => id !== identnr));
    } else {
      setSelectedIdentnrs([...selectedIdentnrs, identnr]);
    }
  };

  // Computed form values - show all identnrs, selected ones will be checked
  const filteredIdentnrs = customIdentnr
    ? allIdentnrs.filter(identnr =>
        identnr.toLowerCase().includes(customIdentnr.toLowerCase())
      )
    : allIdentnrs;

  return (
    <div className="container">
      <Head>
        <title>Merkmalstexte Verwaltung</title>
        <meta name="description" content="Merkmalstexte CRUD Anwendung" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="app-header">
        <h1>Merkmalstexte Verwaltung</h1>
        <div className="header-controls">
          <div className="action-buttons">
            <button
              className="btn btn-success"
              onClick={handleShowCreateForm}
              title="Neuen Datensatz erstellen"
            >
              ➕
            </button>

            <button
              className="btn btn-info"
              onClick={() => setShowFilters(!showFilters)}
              title="Filter Panel"
            >
              🔍
            </button>

            <button
              className="btn btn-info"
              onClick={fetchMerkmalstexte}
              disabled={loading}
              title="Daten aktualisieren"
            >
              🔄
            </button>

            <button
              className="btn btn-info"
              onClick={() => setShowSettings(!showSettings)}
              title="Einstellungen"
            >
              ⚙️
            </button>

          </div>
        </div>
      </header>

      <main className="app-main">
        {error && (
          <div className="error-message">
            ❌ Fehler: {error}
            <button onClick={fetchMerkmalstexte} className="btn-small btn-secondary" style={{marginLeft: '10px'}}>
              🔄 Erneut versuchen
            </button>
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        <FilterPanel
          showFilters={showFilters}
          filterData={filterData}
          selectedFilterIdentnrs={selectedFilterIdentnrs}
          showFilterIdentnrDropdown={showFilterIdentnrDropdown}
          customFilterIdentnr={customFilterIdentnr}
          filteredFilterIdentnrs={filteredFilterIdentnrs}
          loading={loading}
          onFilterChange={handleFilterChange}
          onDropdownToggle={handleFilterIdentnrDropdownToggle}
          onCustomFilterIdentnrChange={handleCustomFilterIdentnrChange}
          onToggleFilterIdentnrSelection={handleToggleFilterIdentnrSelection}
          onRemoveFilterIdentnr={handleRemoveFilterIdentnr}
          onSearch={handleFilterSearch}
          onClearFilters={handleClearFilters}
        />

        <SettingsModal
          showSettings={showSettings}
          darkMode={darkMode}
          onToggleDarkMode={handleToggleDarkMode}
          onClose={handleCloseSettings}
        />

        <MerkmalForm
          showForm={showForm}
          editingItem={editingItem}
          formData={formData}
          selectedIdentnrs={selectedIdentnrs}
          showIdentnrDropdown={showIdentnrDropdown}
          customIdentnr={customIdentnr}
          filteredIdentnrs={filteredIdentnrs}
          originalRecord={editingItem}
          operationLoading={operationLoading}
          onSubmit={handleFormSubmit}
          onInputChange={handleInputChange}
          onDropdownToggle={handleIdentnrDropdownToggle}
          onCustomIdentnrChange={handleCustomIdentnrChange}
          onCustomIdentnrKeyDown={handleCustomIdentnrKeyDown}
          onAddCustomIdentnr={handleAddCustomIdentnr}
          onToggleIdentnrSelection={handleToggleIdentnrSelection}
          onCancel={handleFormCancel}
        />

        <section className="data-section">
          <div className="data-header">
            <h3>Datensätze</h3>
            {!loading && (
              <p className="data-info">
                {hasData
                  ? `${totalRecords.toLocaleString()} Datensätze (${merkmalstexte.length} angezeigt)`
                  : 'Keine Daten verfügbar'
                }
              </p>
            )}
          </div>

          {loading && (
            <div className="loading">
              <div className="loading-spinner"></div>
              <p>Lade Daten...</p>
            </div>
          )}

          {!loading && !hasData && !error && (
            <div className="no-data">
              <p>📭 Keine Datensätze gefunden.</p>
            </div>
          )}

          <MerkmalTable
            data={sortedMerkmalstexte}
            loading={loading}
            hasData={hasData}
            sortConfig={sortConfig}
            editingItem={editingItem}
            formData={formData}
            onSort={handleSort}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCopyToClipboard={copyToClipboard}
            onInputChange={handleInputChange}
            onResetForm={resetForm}
            getSonderAbtDisplay={getSonderAbtDisplay}
          />

{/* Pagination removed to fix loop issues */}
        </section>
      </main>
    </div>
  );
}