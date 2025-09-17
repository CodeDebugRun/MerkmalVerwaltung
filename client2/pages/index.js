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

  // Handle click outside to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside inline dropdown
      if (showInlineDropdown) {
        const dropdownElement = event.target.closest('.identnr-dropdown-trigger, .identnr-dropdown-menu');
        if (!dropdownElement) {
          setShowInlineDropdown(false);
        }
      }

      // Check if click is outside filter dropdown
      if (showFilterIdentnrDropdown) {
        const filterDropdownElement = event.target.closest('.filter-identnr-dropdown-trigger, .filter-identnr-dropdown-menu');
        if (!filterDropdownElement) {
          setShowFilterIdentnrDropdown(false);
        }
      }

      // Check if click is outside form dropdown
      if (showIdentnrDropdown) {
        const formDropdownElement = event.target.closest('.form-identnr-dropdown-trigger, .form-identnr-dropdown-menu');
        if (!formDropdownElement) {
          setShowIdentnrDropdown(false);
        }
      }
    };

    // Add event listener when any dropdown is open
    if (showInlineDropdown || showFilterIdentnrDropdown || showIdentnrDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    // Cleanup
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showInlineDropdown, showFilterIdentnrDropdown, showIdentnrDropdown]);

  // Utility functions
  const showSuccess = (message) => {
    console.log('🎉 SUCCESS MESSAGE:', message);
    setSuccessMessage(message);

    // Auto-clear success message after 5 seconds
    setTimeout(() => {
      setSuccessMessage('');
    }, 5000);
  };

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
      const newFilters = { ...columnFilters };
      setAppliedColumnFilters(newFilters);
      setCurrentPage(1);

      // Close any open editing modals when filters change
      if (editingItem) {
        resetForm();
      }

      // Log filter results to console
      console.log('🔍 Column Filter Applied:', newFilters);

      // Use setTimeout to log results after state update
      setTimeout(() => {
        const currentPageData = filteredMerkmalstexte.slice(
          (currentPage - 1) * recordsPerPage,
          currentPage * recordsPerPage
        );

        console.log('📊 Filter Results:', {
          totalRecords: merkmalstexte.length,
          filteredRecords: filteredMerkmalstexte.length,
          currentPage: currentPage,
          recordsPerPage: recordsPerPage,
          currentPageGroups: currentPageData.length
        });

        console.log('👥 Group Details:', {
          groupCount: filteredMerkmalstexte.length,
          currentPageGroups: currentPageData.map(group => ({
            id: group.id,
            merkmal: group.merkmal,
            auspraegung: group.auspraegung,
            drucktext: group.drucktext,
            sondermerkmal: group.sondermerkmal,
            position: group.position,
            recordCount: group._groupData?.record_count || 1,
            identnrList: group._groupData?.identnr_list || group.identnr,
            idList: group._groupData?.id_list
          })),
          allFilteredGroups: filteredMerkmalstexte.map(group => ({
            merkmal: group.merkmal,
            auspraegung: group.auspraegung,
            recordCount: group._groupData?.record_count || 1
          }))
        });
      }, 0);

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

      // Close any open editing modals when filters are cleared
      if (editingItem) {
        resetForm();
      }

      console.log('🗑️ Column Filters Cleared - Showing all records:', merkmalstexte.length);

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

  const handleDelete = async (item) => {
    const { id, identnr, merkmal, auspraegung, drucktext } = item;
    const recordCount = item._groupData?.record_count || 1;
    const identnrList = item._groupData?.identnr_list || identnr;

    console.log('🗑️ Delete operation started:', {
      id,
      identnr,
      merkmal,
      auspraegung,
      drucktext,
      recordCount,
      identnrList
    });

    const confirmMessage = recordCount > 1
      ? `Möchten Sie die gesamte Gruppe "${merkmal} - ${auspraegung}" mit ${recordCount} Datensätzen (Ident-Nr: ${identnrList}) wirklich löschen?`
      : `Möchten Sie den Datensatz "${merkmal} - ${auspraegung}" (Ident-Nr: ${identnr}) wirklich löschen?`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setOperationLoading(prev => ({ ...prev, delete: true }));

      let response;

      if (recordCount === 1) {
        // Single record delete - use individual endpoint
        response = await fetch(`${API_BASE}/${id}`, {
          method: 'DELETE'
        });
      } else {
        // Multiple records delete - use bulk endpoint
        response = await fetch(`${API_BASE}/bulk-delete-group`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            merkmal: item.merkmal,
            auspraegung: item.auspraegung,
            drucktext: item.drucktext,
            sondermerkmal: item.sondermerkmal,
            position: item.position,
            sonderAbt: item.sonderAbt,
            fertigungsliste: item.fertigungsliste
          })
        });
      }

      if (!response.ok) {
        const errorData = await response.text();
        console.error('Delete failed:', response.status, errorData);
        throw new Error(`Delete failed: ${response.status} - ${errorData}`);
      }

      const result = await response.json();
      console.log('🔍 DELETE Response:', {
        resultData: result.data,
        backendDeletedCount: result.data?.deletedCount,
        frontendRecordCount: recordCount
      });
      const deletedCount = result.data?.deletedCount || recordCount;

      if (recordCount === 1) {
        showSuccess(`✅ Datensatz erfolgreich gelöscht`);
      } else {
        showSuccess(`✅ ${deletedCount} Datensätze der Gruppe erfolgreich gelöscht`);
      }

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

      console.log('🔄 Update operation started:', {
        editingItemId: editingItem.id,
        originalIdentnrs,
        currentIdentnrs,
        formData,
        groupData: editingItem._groupData
      });

      // Remove duplicates from arrays before calculation
      const uniqueOriginalIdentnrs = [...new Set(originalIdentnrs)];
      const uniqueCurrentIdentnrs = [...new Set(currentIdentnrs)];

      // Find identnrs to add (selected but not in original)
      const identnrsToAdd = uniqueCurrentIdentnrs.filter(id => !uniqueOriginalIdentnrs.includes(id));

      // Find identnrs to remove (in original but not selected)
      const identnrsToRemove = uniqueOriginalIdentnrs.filter(id => !uniqueCurrentIdentnrs.includes(id));

      // Find identnrs to update (in both lists)
      const identnrsToUpdate = uniqueCurrentIdentnrs.filter(id => uniqueOriginalIdentnrs.includes(id));

      console.log('🔄 Bulk operations plan:', {
        add: identnrsToAdd,
        remove: identnrsToRemove,
        update: identnrsToUpdate,
        hasChanges: identnrsToAdd.length > 0 || identnrsToRemove.length > 0 || identnrsToUpdate.length > 0
      });

      // 1. Create new records for added identnrs
      // Use the same position as the existing group to ensure they stay grouped together
      const groupPosition = editingItem.position; // Use original group's position

      // Use bulk copy endpoint to ensure same position for all identnrs
      if (identnrsToAdd.length > 0) {
        console.log(`➕ Creating records for identnrs: ${identnrsToAdd.join(', ')} using bulk copy`);

        const copyResponse = await fetch(`${API_BASE}/${editingItem.id}/copy-to-identnrs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            identnrs: identnrsToAdd // Only new identnrs to avoid duplicates
          })
        });

        if (!copyResponse.ok) {
          throw new Error(`Failed to copy record to new identnrs`);
        }
      }

      // 2. Delete records for removed identnrs
      for (const identnr of identnrsToRemove) {
        const deleteResponse = await fetch(`${API_BASE}/identnr/${identnr}`, {
          method: 'DELETE'
        });

        if (!deleteResponse.ok) {
          // 404 is acceptable - identnr might already be deleted or not exist
          if (deleteResponse.status !== 404) {
            const errorText = await deleteResponse.text();
            console.error(`❌ Delete failed for identnr ${identnr}:`, errorText);
            throw new Error(`Failed to delete records for identnr: ${identnr}`);
          }
          console.log(`⚠️ No records found for identnr ${identnr} (already deleted or non-existent)`);
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
            // Get records array from the response structure
            const records = similarData.data.records || [];
            console.log('📊 Records to process:', records);

            // Update each related record
            for (const record of records) {
              // Only update if the identnr is in the selected list
              if (identnrsToUpdate.includes(record.identnr)) {
                console.log(`🔄 Updating record ID ${record.id} for identnr ${record.identnr}`);

                const updateData = {
                  identnr: record.identnr, // Add required identnr field
                  merkmal: formData.merkmal,
                  auspraegung: formData.auspraegung,
                  drucktext: formData.drucktext,
                  sondermerkmal: formData.sondermerkmal || '',
                  position: formData.position ? parseInt(formData.position) : 0,
                  sonderAbt: parseInt(formData.sonderAbt) || 0,
                  fertigungsliste: parseInt(formData.fertigungsliste) || 0
                };

                console.log(`📤 Sending update for record ${record.id}:`, updateData);

                const updateResponse = await fetch(`${API_BASE}/${record.id}`, {
                  method: 'PUT',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify(updateData)
                });

                if (!updateResponse.ok) {
                  const errorText = await updateResponse.text();
                  console.error(`❌ Update failed for record ${record.id}:`, errorText);
                  throw new Error(`Failed to update record ID: ${record.id}`);
                }

                const updateResult = await updateResponse.json();
                console.log(`✅ Update successful for record ${record.id}:`, updateResult);
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

      params.append('limit', '300000'); // Very high limit to get all results

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

      // Create record for first identnr, then copy to others to ensure same position
      const [firstIdentnr, ...otherIdentnrs] = selectedIdentnrs;

      // Create the first record
      const firstResponse = await fetch(`${API_BASE}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identnr: firstIdentnr,
          merkmal: formData.merkmal,
          auspraegung: formData.auspraegung,
          drucktext: formData.drucktext,
          sondermerkmal: formData.sondermerkmal || '',
          position: formData.position ? parseInt(formData.position) : 0,
          sonderAbt: formData.sonderAbt || '0',
          fertigungsliste: formData.fertigungsliste || '0'
        })
      });

      if (!firstResponse.ok) {
        throw new Error(`Failed to create record for ${firstIdentnr}`);
      }

      const firstRecord = await firstResponse.json();
      const recordId = firstRecord.data.id;

      console.log('✅ First record created:', {
        id: recordId,
        identnr: firstIdentnr,
        merkmal: formData.merkmal,
        auspraegung: formData.auspraegung,
        position: formData.position || 'empty',
        allSelectedIdentnrs: selectedIdentnrs
      });

      // If there are other identnrs, copy the first record to them
      if (otherIdentnrs.length > 0) {
        const copyResponse = await fetch(`${API_BASE}/${recordId}/copy-to-identnrs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            identnrs: selectedIdentnrs // All identnrs including the first one
          })
        });

        if (!copyResponse.ok) {
          throw new Error(`Failed to copy record to other identnrs`);
        }

        const copyResult = await copyResponse.json();
        console.log('📋 Copy operation result:', {
          originalRecordId: recordId,
          targetIdentnrs: selectedIdentnrs,
          copiedRecords: copyResult.data?.copiedRecords || 'No details returned',
          totalCreated: selectedIdentnrs.length
        });
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
              onClick={() => {
                if (showFilters) {
                  // Filter panel kapatılıyorsa filtreleri temizle
                  handleClearFilters();
                }
                setShowFilters(!showFilters);
              }}
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

      {/* Fixed position toast notifications */}
      {error && (
        <div className="toast-message toast-error">
          ❌ Fehler: {error}
          <button onClick={fetchMerkmalstexte} className="btn-small btn-secondary" style={{marginLeft: '10px'}}>
            🔄 Erneut versuchen
          </button>
        </div>
      )}

      {successMessage && (
        <div className="toast-message toast-success">
          {successMessage}
        </div>
      )}

      <main className="app-main">

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
            <h3>Merkmal Gruppen</h3>
            {!loading && (
              <p className="data-info">
                {hasData
                  ? `${filteredTotalRecords.toLocaleString()} Datensätze (${currentData.length} angezeigt)${filteredTotalRecords !== totalRecords ? ` von ${totalRecords.toLocaleString()} gesamt` : ''}`
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