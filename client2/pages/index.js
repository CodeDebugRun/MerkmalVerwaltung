import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import MerkmalTable from '../components/MerkmalTable';
import FilterPanel from '../components/FilterPanel';
import SettingsModal from '../components/SettingsModal';
import MerkmalForm from '../components/MerkmalForm';
import { useDarkMode } from '../hooks/useDarkMode';

export default function Home() {
  // Dark mode hook
  const { isDarkMode, toggleDarkMode } = useDarkMode();

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

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageInput, setPageInput] = useState('');
  const recordsPerPage = 50;

  // Column filters state (for quick filtering in table headers)
  const [columnFilters, setColumnFilters] = useState({
    merkmal: '',
    auspraegung: '',
    drucktext: '',
    sondermerkmal: '',
    position: '',
    sonderAbt: '',
    fertigungsliste: ''
  });

  // Applied column filters (actually used for filtering)
  const [appliedColumnFilters, setAppliedColumnFilters] = useState({
    merkmal: '',
    auspraegung: '',
    drucktext: '',
    sondermerkmal: '',
    position: '',
    sonderAbt: '',
    fertigungsliste: ''
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

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [selectedIdentnrs, setSelectedIdentnrs] = useState([]);
  const [showIdentnrDropdown, setShowIdentnrDropdown] = useState(false);
  const [customIdentnr, setCustomIdentnr] = useState('');

  // Inline edit state
  const [selectedInlineIdentnrs, setSelectedInlineIdentnrs] = useState([]);
  const [showInlineDropdown, setShowInlineDropdown] = useState(false);
  const [customInlineIdentnr, setCustomInlineIdentnr] = useState('');

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
      const response = await fetch(`http://localhost:3001/api/grouped/merkmalstexte`);
      const data = await response.json();


      if (data.success) {
        setMerkmalstexte(data.data.data || []);
        setTotalRecords(data.data.totalCount || 0);
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

  // Apply column filters first
  const filteredMerkmalstexte = React.useMemo(() => {
    if (!merkmalstexte) return [];

    return merkmalstexte.filter(item => {
      return Object.entries(appliedColumnFilters).every(([field, filterValue]) => {
        if (!filterValue) return true; // No filter applied for this field

        // Special handling for sonderAbt and fertigungsliste - exact match
        if (field === 'sonderAbt') {
          const itemSonderAbt = (item.sonderAbt || item.maka)?.toString();
          return itemSonderAbt === filterValue;
        }

        if (field === 'fertigungsliste') {
          const itemFertigungsliste = item.fertigungsliste?.toString();
          return itemFertigungsliste === filterValue;
        }

        // Text search for other fields
        const itemValue = item[field]?.toString().toLowerCase() || '';
        return itemValue.includes(filterValue.toLowerCase());
      });
    });
  }, [merkmalstexte, appliedColumnFilters]);

  // Then apply sorting
  const sortedMerkmalstexte = React.useMemo(() => {
    if (!filteredMerkmalstexte || !sortConfig.key) return filteredMerkmalstexte;

    return [...filteredMerkmalstexte].sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';

      if (sortConfig.direction === 'asc') {
        return aVal.toString().localeCompare(bVal.toString());
      } else {
        return bVal.toString().localeCompare(aVal.toString());
      }
    });
  }, [filteredMerkmalstexte, sortConfig]);

  // Pagination logic (based on filtered data)
  const filteredTotalRecords = sortedMerkmalstexte?.length || 0;
  const totalPages = Math.ceil(filteredTotalRecords / recordsPerPage);
  const currentData = React.useMemo(() => {
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    return sortedMerkmalstexte?.slice(startIndex, endIndex) || [];
  }, [sortedMerkmalstexte, currentPage, recordsPerPage]);

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

    // Dark mode is handled by the useDarkMode hook
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
    setSelectedInlineIdentnrs([]);
    setShowInlineDropdown(false);
    setCustomInlineIdentnr('');
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

  // Pagination handlers
  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handlePreviousPage = () => {
    handlePageChange(currentPage - 1);
  };

  const handleNextPage = () => {
    handlePageChange(currentPage + 1);
  };

  // Generate pagination numbers with ellipsis
  const getPaginationNumbers = () => {
    const numbers = [];
    const delta = 2; // How many pages to show around current page

    if (totalPages <= 7) {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        numbers.push(i);
      }
    } else {
      // Always show first page
      numbers.push(1);

      if (currentPage > delta + 2) {
        numbers.push('...');
      }

      // Show pages around current page
      const start = Math.max(2, currentPage - delta);
      const end = Math.min(totalPages - 1, currentPage + delta);

      for (let i = start; i <= end; i++) {
        numbers.push(i);
      }

      if (currentPage < totalPages - delta - 1) {
        numbers.push('...');
      }

      // Always show last page
      if (totalPages > 1) {
        numbers.push(totalPages);
      }
    }

    return numbers;
  };

  // Handle page input
  const handlePageInputChange = (value) => {
    setPageInput(value);
  };

  const handlePageInputSubmit = (e) => {
    e.preventDefault();
    const pageNum = parseInt(pageInput);
    if (pageNum >= 1 && pageNum <= totalPages) {
      handlePageChange(pageNum);
      setPageInput('');
    } else {
      alert(`Bitte geben Sie eine Seitenzahl zwischen 1 und ${totalPages} ein.`);
    }
  };

  const handlePageInputKeyPress = (e) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit(e);
    }
  };

  // Column filter handlers
  const handleColumnFilterChange = (field, value) => {
    if (field === 'apply') {
      // Apply filters - copy current inputs to applied filters
      setAppliedColumnFilters({ ...columnFilters });
      setCurrentPage(1);
    } else if (field === 'clear') {
      // Clear all filters
      setColumnFilters({
        merkmal: '',
        auspraegung: '',
        drucktext: '',
        sondermerkmal: '',
        position: '',
        sonderAbt: '',
        fertigungsliste: ''
      });
      setAppliedColumnFilters({
        merkmal: '',
        auspraegung: '',
        drucktext: '',
        sondermerkmal: '',
        position: '',
        sonderAbt: '',
        fertigungsliste: ''
      });
      setCurrentPage(1);
    } else {
      // Just update input values, don't apply filtering yet
      setColumnFilters(prev => ({ ...prev, [field]: value }));
    }
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

    // Set selected identnrs for this group from _groupData
    if (item._groupData && item._groupData.identnr_list) {
      const identnrs = item._groupData.identnr_list.split(',').map(id => id.trim());
      setSelectedInlineIdentnrs(identnrs);
    } else {
      setSelectedInlineIdentnrs([]);
    }
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

  // Inline edit handlers
  const handleInlineDropdownToggle = () => {
    setShowInlineDropdown(!showInlineDropdown);
  };

  const handleCustomInlineIdentnrChange = (value) => {
    setCustomInlineIdentnr(value);
  };

  const handleAddCustomInlineIdentnr = () => {
    const newIdentnr = customInlineIdentnr.trim();
    if (newIdentnr && !selectedInlineIdentnrs.includes(newIdentnr)) {
      setSelectedInlineIdentnrs([...selectedInlineIdentnrs, newIdentnr]);
      setCustomInlineIdentnr('');
    }
  };

  const handleToggleInlineIdentnrSelection = (identnr) => {
    if (selectedInlineIdentnrs.includes(identnr)) {
      setSelectedInlineIdentnrs(selectedInlineIdentnrs.filter(id => id !== identnr));
    } else {
      setSelectedInlineIdentnrs([...selectedInlineIdentnrs, identnr]);
    }
  };

  const handleUpdateRecord = async () => {
    if (!editingItem) return;

    try {
      setOperationLoading(prev => ({ ...prev, update: true }));

      // Get original identnrs from group data
      const originalIdentnrs = editingItem._groupData?.identnr_list
        ? editingItem._groupData.identnr_list.split(',').map(id => id.trim())
        : [];

      const currentIdentnrs = selectedInlineIdentnrs;

      // Find identnrs to add (selected but not in original)
      const identnrsToAdd = currentIdentnrs.filter(id => !originalIdentnrs.includes(id));

      // Find identnrs to remove (in original but not selected)
      const identnrsToRemove = originalIdentnrs.filter(id => !currentIdentnrs.includes(id));

      // Find identnrs to update (in both lists)
      const identnrsToUpdate = currentIdentnrs.filter(id => originalIdentnrs.includes(id));

      console.log('🔄 Bulk operations plan:');
      console.log('➕ Add identnrs:', identnrsToAdd);
      console.log('🗑️ Remove identnrs:', identnrsToRemove);
      console.log('✏️ Update identnrs:', identnrsToUpdate);

      // 1. Create new records for added identnrs
      // Use the same position as the existing group to ensure they stay grouped together
      const groupPosition = editingItem.position; // Use original group's position

      for (const identnr of identnrsToAdd) {
        console.log(`➕ Creating record for identnr: ${identnr} with position: ${groupPosition}`);

        const createResponse = await fetch(`${API_BASE}/identnr/${identnr}`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            merkmal: formData.merkmal,
            auspraegung: formData.auspraegung,
            drucktext: formData.drucktext,
            sondermerkmal: formData.sondermerkmal || '',
            position: groupPosition || null, // Use group's position, not form's position
            sonderAbt: parseInt(formData.sonderAbt) || 0,
            fertigungsliste: parseInt(formData.fertigungsliste) || 0
          })
        });

        if (!createResponse.ok) {
          throw new Error(`Failed to create record for identnr: ${identnr}`);
        }
      }

      // 2. Delete records for removed identnrs
      for (const identnr of identnrsToRemove) {
        const deleteResponse = await fetch(`${API_BASE}/identnr/${identnr}`, {
          method: 'DELETE'
        });

        if (!deleteResponse.ok) {
          throw new Error(`Failed to delete records for identnr: ${identnr}`);
        }
      }

      // 3. Update existing records (bulk update all records with same merkmal/auspraegung/drucktext)
      if (identnrsToUpdate.length > 0) {
        // Use the getSimilarDatasets endpoint to get all related records
        const similarResponse = await fetch(`${API_BASE}/${editingItem.id}/similar`);
        if (similarResponse.ok) {
          const similarData = await similarResponse.json();
          console.log('📊 Similar data response:', similarData);

          if (similarData.success && similarData.data) {
            // Ensure data is an array
            const records = Array.isArray(similarData.data) ? similarData.data : [similarData.data];
            console.log('📊 Records to process:', records);

            // Update each related record
            for (const record of records) {
              // Only update if the identnr is in the selected list
              if (identnrsToUpdate.includes(record.identnr)) {
                console.log(`🔄 Updating record ID ${record.id} for identnr ${record.identnr}`);

                const updateResponse = await fetch(`${API_BASE}/${record.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    merkmal: formData.merkmal,
                    auspraegung: formData.auspraegung,
                    drucktext: formData.drucktext,
                    sondermerkmal: formData.sondermerkmal || '',
                    position: formData.position ? parseInt(formData.position) : null,
                    sonderAbt: parseInt(formData.sonderAbt) || 0,
                    fertigungsliste: parseInt(formData.fertigungsliste) || 0
                  })
                });

                if (!updateResponse.ok) {
                  throw new Error(`Failed to update record ID: ${record.id}`);
                }
              }
            }
          }
        }
      }

      // Success message
      const totalOps = identnrsToAdd.length + identnrsToRemove.length + identnrsToUpdate.length;
      showSuccess(`✅ Bulk operation erfolgreich: ${identnrsToAdd.length} hinzugefügt, ${identnrsToRemove.length} gelöscht, ${identnrsToUpdate.length} aktualisiert`);

      resetForm();
      await fetchMerkmalstexte(); // Refresh data

    } catch (err) {
      handleApiError(err, 'Fehler bei Bulk-Operation');
    } finally {
      setOperationLoading(prev => ({ ...prev, update: false }));
    }
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
    toggleDarkMode();
    showSuccess(isDarkMode ? '☀️ Light Mode aktiviert' : '🌙 Dark Mode aktiviert');
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
          darkMode={isDarkMode}
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
            data={currentData}
            loading={loading}
            hasData={hasData}
            sortConfig={sortConfig}
            editingItem={editingItem}
            formData={formData}
            columnFilters={columnFilters}
            selectedIdentnrs={selectedInlineIdentnrs}
            showInlineDropdown={showInlineDropdown}
            allIdentnrs={allIdentnrs}
            customIdentnr={customInlineIdentnr}
            operationLoading={operationLoading}
            onSort={handleSort}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onCopyToClipboard={copyToClipboard}
            onInputChange={handleInputChange}
            onResetForm={resetForm}
            onColumnFilterChange={handleColumnFilterChange}
            onInlineDropdownToggle={handleInlineDropdownToggle}
            onCustomIdentnrChange={handleCustomInlineIdentnrChange}
            onToggleIdentnrSelection={handleToggleInlineIdentnrSelection}
            onAddCustomIdentnr={handleAddCustomInlineIdentnr}
            onUpdateRecord={handleUpdateRecord}
            getSonderAbtDisplay={getSonderAbtDisplay}
          />

          {/* Data Info */}
          {hasData && (
            <div style={{textAlign: 'center', margin: '15px 0', padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '5px'}}>
              <p style={{margin: 0, color: '#666'}}>
                Zeige {((currentPage - 1) * recordsPerPage) + 1}-{Math.min(currentPage * recordsPerPage, filteredTotalRecords)} von {filteredTotalRecords.toLocaleString()} gefilterten Datensätzen
                {filteredTotalRecords !== totalRecords && ` (${totalRecords.toLocaleString()} gesamt)`}
                ({recordsPerPage} pro Seite)
              </p>
            </div>
          )}

          {/* Pagination Controls */}
          {hasData && totalPages > 1 && (
            <div style={{display: 'flex', justifyContent: 'center', alignItems: 'center', margin: '20px 0'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '5px'}}>
                {/* Previous Arrow */}
                <button
                  onClick={handlePreviousPage}
                  disabled={currentPage === 1}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    backgroundColor: currentPage === 1 ? '#f5f5f5' : '#fff',
                    color: currentPage === 1 ? '#ccc' : '#333',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    borderRadius: '4px'
                  }}
                  title="Vorherige Seite"
                >
                  ◀️
                </button>

                {/* Page Numbers */}
                {getPaginationNumbers().map((pageNum, index) => (
                  pageNum === '...' ? (
                    <span key={`ellipsis-${index}`} style={{padding: '8px 4px', color: '#666'}}>...</span>
                  ) : (
                    <button
                      key={pageNum}
                      onClick={() => handlePageChange(pageNum)}
                      style={{
                        padding: '8px 12px',
                        border: '1px solid #ddd',
                        backgroundColor: pageNum === currentPage ? '#007bff' : '#fff',
                        color: pageNum === currentPage ? '#fff' : '#333',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        fontWeight: pageNum === currentPage ? 'bold' : 'normal'
                      }}
                      title={`Seite ${pageNum}`}
                    >
                      {pageNum}
                    </button>
                  )
                ))}

                {/* Next Arrow */}
                <button
                  onClick={handleNextPage}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ddd',
                    backgroundColor: currentPage === totalPages ? '#f5f5f5' : '#fff',
                    color: currentPage === totalPages ? '#ccc' : '#333',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    borderRadius: '4px'
                  }}
                  title="Nächste Seite"
                >
                  ▶️
                </button>

                {/* Page Input */}
                <div style={{marginLeft: '20px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span style={{fontSize: '14px', color: '#666'}}>Gehe zu Seite:</span>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={pageInput}
                    onChange={(e) => handlePageInputChange(e.target.value)}
                    onKeyPress={handlePageInputKeyPress}
                    placeholder={currentPage.toString()}
                    style={{
                      width: '60px',
                      padding: '6px 8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      textAlign: 'center',
                      fontSize: '14px'
                    }}
                    title={`Seitenzahl eingeben (1-${totalPages})`}
                  />
                  <button
                    onClick={handlePageInputSubmit}
                    style={{
                      padding: '6px 12px',
                      border: '1px solid #007bff',
                      backgroundColor: '#007bff',
                      color: '#fff',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '14px'
                    }}
                    title="Zur Seite gehen"
                  >
                    →
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}