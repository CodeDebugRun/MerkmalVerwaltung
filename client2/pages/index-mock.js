import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import Pagination from '../components/Pagination';
import MerkmalTable from '../components/MerkmalTable';

// Mock data for testing
const mockData = [
  {
    id: 1,
    identnr: 'TEST001',
    merkmal: 'Merkmal 1',
    auspraegung: 'Ausprägung 1',
    drucktext: 'Drucktext für Test 1',
    sondermerkmal: 'Sonder 1',
    position: 1,
    sonderAbt: 1,
    fertigungsliste: 1
  },
  {
    id: 2,
    identnr: 'TEST002',
    merkmal: 'Merkmal 2',
    auspraegung: 'Ausprägung 2',
    drucktext: 'Drucktext für Test 2',
    sondermerkmal: 'Sonder 2',
    position: 2,
    sonderAbt: 2,
    fertigungsliste: 0
  },
  {
    id: 3,
    identnr: 'TEST003',
    merkmal: 'Merkmal 3',
    auspraegung: 'Ausprägung 3',
    drucktext: 'Drucktext für Test 3',
    sondermerkmal: '',
    position: 3,
    sonderAbt: 0,
    fertigungsliste: 1
  }
];

export default function Home() {
  // Core state
  const [editingItem, setEditingItem] = useState(null);
  const [operationLoading, setOperationLoading] = useState({
    create: false,
    update: false,
    delete: false
  });

  // Form state
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
  const [showIdentnrColumn, setShowIdentnrColumn] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  // Mock pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const mockPagination = {
    currentPage: 1,
    totalPages: 1,
    totalCount: 3,
    pageSize: 25
  };

  // Mock data - always available
  const merkmalstexte = mockData;
  const hasData = true;
  const loading = false;
  const error = null;

  // Computed values
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

  // Initialize settings from localStorage
  useEffect(() => {
    const savedShowIdentnrColumn = localStorage.getItem('showIdentnrColumn');
    if (savedShowIdentnrColumn) {
      setShowIdentnrColumn(JSON.parse(savedShowIdentnrColumn));
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
    showSuccess(`✅ Mock: Datensatz ${id} würde gelöscht werden`);
  };

  // Mock handlers
  const handleInlineSubmit = (e) => {
    e.preventDefault();
    showSuccess('✅ Mock: Inline Edit würde gespeichert werden');
    resetForm();
  };

  const handleInlineDropdownToggle = () => {
    console.log('Mock: Inline dropdown toggle');
  };

  const refresh = () => {
    showSuccess('🔄 Mock: Daten würden aktualisiert werden');
  };

  const goToPage = (page) => {
    setCurrentPage(page);
    showSuccess(`📄 Mock: Gehe zu Seite ${page}`);
  };

  return (
    <div className="container">
      <Head>
        <title>Merkmalstexte Verwaltung (Mock)</title>
        <meta name="description" content="Merkmalstexte CRUD Anwendung - Mock Version" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <header className="app-header">
        <h1>📋 Merkmalstexte Verwaltung (Mock Data)</h1>
        <div className="header-controls">
          <div className="action-buttons">
            <button
              className="btn btn-info"
              onClick={refresh}
              disabled={loading}
              title="Daten aktualisieren"
            >
              🔄 {loading ? 'Lädt...' : 'Aktualisieren'}
            </button>

            <label style={{ marginLeft: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={showIdentnrColumn}
                onChange={(e) => {
                  const newValue = e.target.checked;
                  setShowIdentnrColumn(newValue);
                  localStorage.setItem('showIdentnrColumn', JSON.stringify(newValue));
                }}
              />
              👁️ Ident-Nr. Spalte anzeigen
            </label>
          </div>
        </div>
      </header>

      <main className="app-main">
        <div style={{
          background: '#fff3cd',
          border: '1px solid #ffeaa7',
          padding: '10px',
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          ⚠️ <strong>Mock Mode:</strong> Verwendet Test-Daten da Datenbankverbindung nicht verfügbar ist.
        </div>

        {error && (
          <div className="error-message">
            ❌ Fehler: {error}
          </div>
        )}

        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        <section className="data-section">
          <div className="data-header">
            <h3>📋 Datensätze</h3>
            <p className="data-info">
              Mock Daten: Seite {mockPagination.currentPage} von {mockPagination.totalPages} ({mockPagination.totalCount} Datensätze)
            </p>
          </div>

          <MerkmalTable
            data={sortedMerkmalstexte}
            loading={loading}
            hasData={hasData}
            showIdentnrColumn={showIdentnrColumn}
            sortConfig={sortConfig}
            editingItem={editingItem}
            operationLoading={operationLoading}
            formData={formData}
            selectedIdentnrs={[]} // Empty for now
            showInlineDropdown={false} // Disabled for now
            dropdownTriggerRef={{current: null}} // Dummy ref
            onSort={handleSort}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCopyToClipboard={copyToClipboard}
            onInputChange={handleInputChange}
            onInlineSubmit={handleInlineSubmit}
            onInlineDropdownToggle={handleInlineDropdownToggle}
            onResetForm={resetForm}
            getSonderAbtDisplay={getSonderAbtDisplay}
          />

          <Pagination
            currentPage={mockPagination.currentPage}
            totalCount={mockPagination.totalCount}
            pageSize={mockPagination.pageSize}
            onPageChange={goToPage}
          />
        </section>
      </main>
    </div>
  );
}