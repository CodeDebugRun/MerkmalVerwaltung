import React, { useState, useEffect } from 'react';
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
  const [allIdentnrs, setAllIdentnrs] = useState([]);
  const [selectedIdentnrs, setSelectedIdentnrs] = useState([]);
  const [showIdentnrDropdown, setShowIdentnrDropdown] = useState(false);
  const [similarDatasets, setSimilarDatasets] = useState([]);
  const [originalRecord, setOriginalRecord] = useState(null);
  const [customIdentnr, setCustomIdentnr] = useState('');
  const [filteredIdentnrs, setFilteredIdentnrs] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showIdentnrColumn, setShowIdentnrColumn] = useState(false); // Default: gizli
  const [showSettings, setShowSettings] = useState(false);
  const [selectedFilterIdentnrs, setSelectedFilterIdentnrs] = useState([]);
  const [showFilterIdentnrDropdown, setShowFilterIdentnrDropdown] = useState(false);
  const [customFilterIdentnr, setCustomFilterIdentnr] = useState('');
  const [filteredFilterIdentnrs, setFilteredFilterIdentnrs] = useState([]);

  // Ayarları localStorage'dan yükle - default değerler
  useEffect(() => {
    // Dark mode - default: false (gündüz modu)
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode) {
      setDarkMode(JSON.parse(savedDarkMode));
    } else {
      setDarkMode(false);
      localStorage.setItem('darkMode', JSON.stringify(false));
    }

    // Identnr sütun görünürlüğü - default: false (gizli)
    const savedShowIdentnrColumn = localStorage.getItem('showIdentnrColumn');
    if (savedShowIdentnrColumn) {
      setShowIdentnrColumn(JSON.parse(savedShowIdentnrColumn));
    } else {
      setShowIdentnrColumn(false);
      localStorage.setItem('showIdentnrColumn', JSON.stringify(false));
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

  // Tüm Ident-Nr'ları yükle
  const loadAllIdentnrs = async () => {
    try {
      const response = await axios.get(`${API_BASE}/list/identnrs`);
      if (response.data.success) {
        setAllIdentnrs(response.data.data);
      }
    } catch (err) {
      console.error('Fehler beim Laden der Ident-Nr Liste:', err);
    }
  };

  // Component mount olduğunda Ident-Nr'ları yükle
  useEffect(() => {
    loadAllIdentnrs();
  }, []);

  // Filter identnrs based on custom input
  useEffect(() => {
    if (customIdentnr.trim()) {
      const filtered = allIdentnrs.filter(identnr => 
        identnr.toLowerCase().includes(customIdentnr.toLowerCase())
      );
      setFilteredIdentnrs(filtered);
    } else {
      setFilteredIdentnrs(allIdentnrs);
    }
  }, [customIdentnr, allIdentnrs]);

  // Filter identnrs for filter dropdown based on custom input
  useEffect(() => {
    if (customFilterIdentnr.trim()) {
      const filtered = allIdentnrs.filter(identnr => 
        identnr.toLowerCase().includes(customFilterIdentnr.toLowerCase())
      );
      setFilteredFilterIdentnrs(filtered);
    } else {
      setFilteredFilterIdentnrs(allIdentnrs);
    }
  }, [customFilterIdentnr, allIdentnrs]);

  // Dropdown dışına tıklandığında veya ESC'e basıldığında kapat
  useEffect(() => {
    if (!showIdentnrDropdown && !showFilterIdentnrDropdown) return;

    const handleClickOutside = (event) => {
      if (!event.target.closest('.multi-select-container')) {
        setShowIdentnrDropdown(false);
        setShowFilterIdentnrDropdown(false);
      }
    };

    const handleEscKey = (event) => {
      if (event.key === 'Escape') {
        setShowIdentnrDropdown(false);
        setShowFilterIdentnrDropdown(false);
      }
    };

    const timer = setTimeout(() => {
      document.addEventListener('click', handleClickOutside);
      document.addEventListener('keydown', handleEscKey);
    }, 0);

    return () => {
      clearTimeout(timer);
      document.removeEventListener('click', handleClickOutside);
      document.removeEventListener('keydown', handleEscKey);
    };
  }, [showIdentnrDropdown, showFilterIdentnrDropdown]);

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
      if (key !== 'identnr' && filterData[key] && filterData[key].toString().trim() !== '') {
        acc[key] = filterData[key].toString().trim();
      }
      return acc;
    }, {});

    // Ident-Nr seçimini filteye ekle - tek değer olarak
    if (selectedFilterIdentnrs.length > 0) {
      // Backend çoklu değerleri desteklemediği için sadece ilk değeri gönder
      activeFilters.identnr = selectedFilterIdentnrs[0];
      
      // Debug için
      console.log('🔍 Filtering with single Ident-Nr value:', {
        selected: selectedFilterIdentnrs,
        sentToBackend: selectedFilterIdentnrs[0],
        note: 'Backend does not support multiple values'
      });
    }
    
    search(activeFilters);
    
    const filterCount = Object.keys(activeFilters).length;
    const identnrCount = selectedFilterIdentnrs.length;
    
    if (filterCount > 0 || identnrCount > 0) {
      let message = '✅ Filter angewendet';
      if (identnrCount > 0) {
        message += ` (${identnrCount} Ident-Nr ausgewählt)`;
      }
      showSuccess(message);
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
    setSelectedFilterIdentnrs([]);
    setCustomFilterIdentnr('');
    setFilteredFilterIdentnrs(allIdentnrs);
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
    setSelectedIdentnrs([]);
    setSimilarDatasets([]);
    setOriginalRecord(null);
    setShowIdentnrDropdown(false);
    setCustomIdentnr('');
    setFilteredIdentnrs(allIdentnrs);
  };

  // Formular absenden
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Formular-Validierung
    if (selectedIdentnrs.length === 0 || !formData.merkmal || !formData.auspraegung || !formData.drucktext) {
      showSuccess('❌ Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }
    
    const isUpdate = !!editingItem;
    
    try {
      setOperationLoading(prev => ({ ...prev, [isUpdate ? 'update' : 'create']: true }));
      
      if (isUpdate) {
        // Aktualisierung: Nur einen Datensatz aktualisieren
        const dataToUpdate = { ...formData, identnr: selectedIdentnrs[0] };
        const response = await axios.put(`${API_BASE}/${editingItem.id}`, dataToUpdate);
        showSuccess(`✅ ${response.data.message || 'Datensatz aktualisiert'}`);
      } else {
        // Neuer Datensatz: Für jede ausgewählte Ident-Nr einen separaten Datensatz erstellen
        for (const identnr of selectedIdentnrs) {
          const dataToSubmit = { ...formData, identnr };
          await axios.post(API_BASE, dataToSubmit);
        }
        showSuccess(`✅ ${selectedIdentnrs.length} Datensätze erfolgreich erstellt!`);
      }
      
      resetForm();
      setSelectedIdentnrs([]);
      setShowForm(false);
      refresh(); // Daten neu laden
    } catch (err) {
      handleApiError(err, isUpdate ? 'Fehler beim Aktualisieren' : 'Fehler beim Erstellen');
    } finally {
      setOperationLoading(prev => ({ ...prev, [isUpdate ? 'update' : 'create']: false }));
    }
  };

  // Inline-Bearbeitung absenden
  const handleInlineSubmit = async (e) => {
    e.preventDefault();
    
    // Formular-Validierung
    if (selectedIdentnrs.length === 0 || !formData.merkmal || !formData.auspraegung || !formData.drucktext) {
      showSuccess('❌ Bitte füllen Sie alle Pflichtfelder aus');
      return;
    }
    
    try {
      setOperationLoading(prev => ({ ...prev, update: true }));
      
      // Aktualisierung: Nur den bearbeiteten Datensatz
      const dataToUpdate = { ...formData, identnr: selectedIdentnrs[0] };
      const response = await axios.put(`${API_BASE}/${editingItem.id}`, dataToUpdate);
      showSuccess(`✅ ${response.data.message || 'Datensatz aktualisiert'}`);
      
      resetForm();
      refresh(); // Daten neu laden
    } catch (err) {
      handleApiError(err, 'Fehler beim Aktualisieren');
    } finally {
      setOperationLoading(prev => ({ ...prev, update: false }));
    }
  };




  // Aynı datensatz'a ait kayıtları yükle
  const loadSimilarDatasets = async (recordId) => {
    try {
      const response = await axios.get(`${API_BASE}/${recordId}/similar`);
      if (response.data.success) {
        setSimilarDatasets(response.data.data.records);
        setOriginalRecord(response.data.data.records.find(r => r.id === response.data.data.originalId));
        
        // Benzer kayıtların Ident-Nr'lerini seçili olarak ayarla
        const uniqueIdentnrs = [...new Set(response.data.data.records.map(record => record.identnr))];
        setSelectedIdentnrs(uniqueIdentnrs);
        
        return response.data.data.records;
      }
    } catch (err) {
      console.error('Fehler beim Laden ähnlicher Datensätze:', err);
      handleApiError(err, 'Fehler beim Laden ähnlicher Datensätze');
    }
    return [];
  };

  // Handle adding custom Ident-Nr
  const handleAddCustomIdentnr = async () => {
    const trimmedValue = customIdentnr.trim();
    if (!trimmedValue || selectedIdentnrs.includes(trimmedValue)) {
      setCustomIdentnr('');
      return;
    }

    try {
      // Call backend to save the new identnr
      const response = await axios.post(`${API_BASE}/add-identnr`, {
        identnr: trimmedValue
      });

      if (response.data.success) {
        // Add to selected list
        setSelectedIdentnrs(prev => [...prev, trimmedValue]);
        
        // Add to allIdentnrs if not already exists (for future filtering)
        if (!allIdentnrs.includes(trimmedValue)) {
          setAllIdentnrs(prev => [...prev, trimmedValue]);
        }

        // Show success message
        if (response.data.data.existed) {
          showSuccess(`✅ Ident-Nr ${trimmedValue} ist bereits vorhanden`);
        } else {
          showSuccess(`✅ Neue Ident-Nr ${trimmedValue} erfolgreich hinzugefügt`);
        }
      }
    } catch (err) {
      handleApiError(err, 'Fehler beim Hinzufügen der neuen Ident-Nr');
      
      // Still add to local list even if backend fails (fallback)
      setSelectedIdentnrs(prev => [...prev, trimmedValue]);
      if (!allIdentnrs.includes(trimmedValue)) {
        setAllIdentnrs(prev => [...prev, trimmedValue]);
      }
    }
    
    setCustomIdentnr('');
    setShowIdentnrDropdown(false);
  };

  // Handle Enter key press in custom input
  const handleCustomIdentnrKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddCustomIdentnr();
    } else if (e.key === 'Escape') {
      setShowIdentnrDropdown(false);
      setCustomIdentnr('');
    }
  };

  // Filter için Ident-Nr çoklu seçim fonksiyonları
  const toggleFilterIdentnrSelection = (identnr) => {
    setSelectedFilterIdentnrs(prev => {
      if (prev.includes(identnr)) {
        return prev.filter(id => id !== identnr);
      } else {
        // Backend çoklu filtreyi desteklemediği için tek seçim yap
        return [identnr]; // Sadece bu seçimi tut, diğerlerini kaldır
        
        // Çoklu seçim için: return [...prev, identnr];
      }
    });
  };


  // Ident-Nr çoklu seçim fonksiyonları
  const toggleIdentnrSelection = async (identnr) => {
    if (editingItem) {
      // Edit modunda: checkbox kaldırılırsa kayıt sil, eklenmişse yeni kayıt oluştur
      if (selectedIdentnrs.includes(identnr)) {
        // Checkbox kaldırıldı - bu Ident-Nr'deki kaydı sil
        const recordToDelete = similarDatasets.find(record => record.identnr === identnr);
        if (recordToDelete && recordToDelete.id) {
          try {
            setOperationLoading(prev => ({ ...prev, delete: true }));
            console.log('🗑️ Deleting record:', recordToDelete.id, 'for identnr:', identnr);
            console.log('🔍 Record to delete:', recordToDelete);
            console.log('🌐 Delete URL:', `${API_BASE}/${recordToDelete.id}`);
            
            const response = await axios.delete(`${API_BASE}/${recordToDelete.id}`);
            console.log('✅ Delete response:', response.data);
            
            showSuccess(`✅ Datensatz für ${identnr} wurde gelöscht`);
            
            // State'leri güncelle
            setSimilarDatasets(prev => prev.filter(record => record.identnr !== identnr));
            setSelectedIdentnrs(prev => prev.filter(id => id !== identnr));
            
            // Ana listeyi yenile
            refresh();
          } catch (err) {
            console.error('❌ Delete error details:', {
              status: err.response?.status,
              statusText: err.response?.statusText,
              data: err.response?.data,
              recordId: recordToDelete.id,
              url: `${API_BASE}/${recordToDelete.id}`
            });
            
            if (err.response?.status === 404) {
              // Record already deleted or doesn't exist
              showSuccess(`⚠️ Datensatz für ${identnr} war bereits gelöscht`);
              // Clean up the state anyway
              setSimilarDatasets(prev => prev.filter(record => record.identnr !== identnr));
              setSelectedIdentnrs(prev => prev.filter(id => id !== identnr));
              refresh();
            } else {
              handleApiError(err, 'Fehler beim Löschen des Datensatzes');
            }
          } finally {
            setOperationLoading(prev => ({ ...prev, delete: false }));
          }
        } else {
          // Henüz kaydedilmemiş seçimi kaldır veya geçersiz record
          console.log('⚠️ No valid record found to delete for identnr:', identnr);
          setSelectedIdentnrs(prev => prev.filter(id => id !== identnr));
          showSuccess(`⚠️ Kein gültiger Datensatz für ${identnr} gefunden`);
        }
      } else {
        // Checkbox seçildi - yeni kayıt oluştur
        try {
          setOperationLoading(prev => ({ ...prev, create: true }));
          // Position'ı otomatik olarak ayarlansın diye sıfırla
          const dataToSubmit = { 
            ...formData, 
            identnr,
            position: '' // Backend otomatik position belirleyecek
          };
          console.log('🔍 Creating new record for:', identnr, 'with data:', dataToSubmit);
          await axios.post(API_BASE, dataToSubmit);
          showSuccess(`✅ Neuer Datensatz für ${identnr} wurde erstellt`);
          
          // State'i güncelle
          setSelectedIdentnrs(prev => [...prev, identnr]);
          
          // Ana listeyi yenile
          refresh();
          
          // Benzer kayıtları yeniden yükle - mevcut item ID'sini kullan
          if (editingItem?.id) {
            await loadSimilarDatasets(editingItem.id);
          }
        } catch (err) {
          handleApiError(err, 'Fehler beim Erstellen des Datensatzes');
        } finally {
          setOperationLoading(prev => ({ ...prev, create: false }));
        }
      }
    } else {
      // Yeni kayıt modu: sadece seçimi değiştir
      setSelectedIdentnrs(prev => {
        if (prev.includes(identnr)) {
          return prev.filter(id => id !== identnr);
        } else {
          return [...prev, identnr];
        }
      });
    }
  };


  // Datensatz bearbeiten
  const handleEdit = async (item) => {
    // Falls dieser Datensatz bereits bearbeitet wird, Bearbeitungsmodus schließen
    if (editingItem && editingItem.id === item.id) {
      setEditingItem(null);
      resetForm();
      return;
    }
    
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
    
    // Im Bearbeitungsmodus ähnliche Datensätze laden
    await loadSimilarDatasets(item.id);
    
    // Hauptformular schließen, da Inline-Formular verwendet wird
    setShowForm(false);
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
      if (err.code === 'NETWORK_ERROR' || err.message === 'Network Error') {
        showError('🔌 Server ist nicht erreichbar. Bitte prüfen Sie die Verbindung.');
      } else {
        handleApiError(err, 'Fehler beim Löschen');
      }
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

  // Sıralama fonksiyonu
  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Custom sorting function for Identnr (alphanumeric)
  const customSort = (items, key, direction) => {
    if (!key) return items;

    return [...items].sort((a, b) => {
      let aValue = a[key];
      let bValue = b[key];

      if (key === 'identnr') {
        // Special handling for Identnr - alphanumeric sort
        const aStr = String(aValue || '');
        const bStr = String(bValue || '');
        
        // Check if both are purely numeric
        const aIsNumeric = /^\d+$/.test(aStr);
        const bIsNumeric = /^\d+$/.test(bStr);
        
        if (aIsNumeric && bIsNumeric) {
          // Both numeric - sort numerically
          const result = parseInt(aStr, 10) - parseInt(bStr, 10);
          return direction === 'asc' ? result : -result;
        } else if (aIsNumeric && !bIsNumeric) {
          // a is numeric, b is not - numeric comes first
          return direction === 'asc' ? -1 : 1;
        } else if (!aIsNumeric && bIsNumeric) {
          // b is numeric, a is not - numeric comes first
          return direction === 'asc' ? 1 : -1;
        } else {
          // Both are alphanumeric - natural sort
          const result = aStr.localeCompare(bStr, 'de', { 
            numeric: true, 
            sensitivity: 'base',
            caseFirst: 'lower'
          });
          return direction === 'asc' ? result : -result;
        }
      } else {
        // Default sorting for other columns
        const aVal = aValue || '';
        const bVal = bValue || '';
        
        const result = String(aVal).localeCompare(String(bVal), 'de', {
          numeric: true,
          sensitivity: 'base'
        });
        return direction === 'asc' ? result : -result;
      }
    });
  };

  // Sıralanmış veri
  const sortedMerkmalstexte = customSort(merkmalstexte, sortConfig.key, sortConfig.direction);

  // ID kopyalama fonksiyonu
  const copyToClipboard = async (text, type = 'ID') => {
    try {
      await navigator.clipboard.writeText(text);
      showSuccess(`✅ ${type} wurde in die Zwischenablage kopiert: ${text}`);
    } catch (err) {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        showSuccess(`✅ ${type} wurde in die Zwischenablage kopiert: ${text}`);
      } catch (fallbackErr) {
        showSuccess(`❌ Fehler beim Kopieren der ${type}`);
      }
      document.body.removeChild(textArea);
    }
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
            onClick={() => setShowSettings(!showSettings)}
            title="Einstellungen"
          >
            ⚙️ Einstellungen
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

        {/* Ayarlar Paneli */}
        {showSettings && (
          <section className="settings-section">
            <h3>⚙️ Einstellungen</h3>
            <div className="settings-grid">
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={darkMode}
                    onChange={toggleDarkMode}
                    className="setting-checkbox"
                  />
                  <span className="setting-text">
                    {darkMode ? '🌙' : '☀️'} Dark Mode
                  </span>
                </label>
              </div>
              <div className="setting-item">
                <label className="setting-label">
                  <input
                    type="checkbox"
                    checked={showIdentnrColumn}
                    onChange={(e) => {
                      const newValue = e.target.checked;
                      setShowIdentnrColumn(newValue);
                      localStorage.setItem('showIdentnrColumn', JSON.stringify(newValue));
                    }}
                    className="setting-checkbox"
                  />
                  <span className="setting-text">
                    👁️ Ident-Nr. Spalte anzeigen
                  </span>
                </label>
              </div>
            </div>
            <div className="settings-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowSettings(false)}
              >
                ✅ Schließen
              </button>
            </div>
          </section>
        )}

        {/* Erweiterte Filter */}
        {showFilters && (
          <section className="filter-section">
            <h3>🔍 Erweiterte Filter</h3>
            <div className="filter-grid">
              <div className="multi-select-container">
                <div 
                  className="multi-select-header filter-input"
                  onClick={() => setShowFilterIdentnrDropdown(!showFilterIdentnrDropdown)}
                >
                  {selectedFilterIdentnrs.length === 0 
                    ? 'Ident-Nr. auswählen' 
                    : `${selectedFilterIdentnrs[0]}`
                  }
                  <span className="dropdown-arrow">{showFilterIdentnrDropdown ? '▲' : '▼'}</span>
                </div>
                
                {showFilterIdentnrDropdown && (
                  <div className="multi-select-dropdown">
                    {/* Filter input for search */}
                    <div className="custom-input-container">
                      <input
                        type="text"
                        placeholder="Ident-Nr suchen..."
                        value={customFilterIdentnr}
                        onChange={(e) => setCustomFilterIdentnr(e.target.value)}
                        className="custom-identnr-input"
                        autoFocus
                      />
                    </div>
                    
                    {/* Selected items summary */}
                    {selectedFilterIdentnrs.length > 0 && (
                      <div className="selected-summary">
                        <strong>Ausgewählt:</strong>
                        <div className="selected-items">
                          <span className="selected-tag">
                            {selectedFilterIdentnrs[0]}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedFilterIdentnrs([]);
                              }}
                              className="remove-tag-btn"
                              title={`${selectedFilterIdentnrs[0]} entfernen`}
                            >
                              ×
                            </button>
                          </span>
                        </div>
                        <small style={{color: '#8b949e', marginTop: '4px', display: 'block'}}>
                          Hinweis: Nur eine Ident-Nr kann gleichzeitig gefiltert werden.
                        </small>
                      </div>
                    )}
                    
                    {/* Existing options */}
                    {filteredFilterIdentnrs.length > 0 ? (
                      filteredFilterIdentnrs.map(identnr => (
                        <label key={identnr} className="multi-select-item">
                          <input
                            type="checkbox"
                            checked={selectedFilterIdentnrs.includes(identnr)}
                            onChange={() => toggleFilterIdentnrSelection(identnr)}
                            className="multi-select-checkbox"
                          />
                          <span className="multi-select-text">
                            {identnr}
                          </span>
                        </label>
                      ))
                    ) : (
                      <div className="no-results">
                        <em>Keine passenden Ident-Nr gefunden</em>
                      </div>
                    )}
                  </div>
                )}
              </div>
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
                <div className="multi-select-container">
                  <div 
                    className="multi-select-header form-input"
                    onClick={() => setShowIdentnrDropdown(!showIdentnrDropdown)}
                  >
                    {selectedIdentnrs.length === 0 
                      ? 'Ident-Nr. auswählen oder eingeben *' 
                      : `${selectedIdentnrs.length} Ident-Nr ausgewählt (${selectedIdentnrs.join(', ')})`
                    }
                    <span className="dropdown-arrow">{showIdentnrDropdown ? '▲' : '▼'}</span>
                  </div>
                  
                  {showIdentnrDropdown && (
                    <div className="multi-select-dropdown">
                      {/* Custom input field */}
                      <div className="custom-input-container">
                        <input
                          type="text"
                          placeholder="Neue Ident-Nr eingeben..."
                          value={customIdentnr}
                          onChange={(e) => setCustomIdentnr(e.target.value)}
                          onKeyDown={handleCustomIdentnrKeyDown}
                          className="custom-identnr-input"
                          autoFocus
                        />
                        {customIdentnr.trim() && (
                          <button
                            type="button"
                            onClick={handleAddCustomIdentnr}
                            className="add-custom-btn"
                            title="Hinzufügen"
                          >
                            ✓
                          </button>
                        )}
                      </div>
                      
                      {/* Separator if there are existing options */}
                      {filteredIdentnrs.length > 0 && (
                        <div className="dropdown-separator">
                          <span>Bestehende Ident-Nr auswählen:</span>
                        </div>
                      )}
                      
                      {/* Existing options */}
                      {filteredIdentnrs.map(identnr => (
                        <label key={identnr} className="multi-select-item">
                          <input
                            type="checkbox"
                            checked={selectedIdentnrs.includes(identnr)}
                            onChange={() => toggleIdentnrSelection(identnr)}
                            className="multi-select-checkbox"
                          />
                          <span className="multi-select-text">
                            {identnr}
                            {editingItem && originalRecord?.identnr === identnr && (
                              <span className="star-badge"> ⭐</span>
                            )}
                          </span>
                          {editingItem && originalRecord?.identnr === identnr && (
                            <span className="original-badge">Original</span>
                          )}
                        </label>
                      ))}
                      
                      {/* No results message */}
                      {customIdentnr.trim() && filteredIdentnrs.length === 0 && (
                        <div className="no-results">
                          <em>Keine passenden Ident-Nr gefunden</em>
                          <br />
                          <small>Enter drücken um "{customIdentnr}" hinzuzufügen</small>
                        </div>
                      )}
                    </div>
                  )}
                </div>
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
                    {showIdentnrColumn && (
                      <th className="sortable" onClick={() => handleSort('identnr')}>
                        Ident-Nr. 
                        {sortConfig.key === 'identnr' && (
                          <span className="sort-arrow">
                            {sortConfig.direction === 'asc' ? ' ↑' : ' ↓'}
                          </span>
                        )}
                      </th>
                    )}
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
                  {sortedMerkmalstexte.map((item) => (
                    <React.Fragment key={item.id}>
                      <tr>
                        {showIdentnrColumn && <td>{item.identnr}</td>}
                        <td>
                          <div className="merkmal-cell">
                            <span className="merkmal-text">{item.merkmal}</span>
                            <button
                              className="copy-id-btn"
                              onClick={() => copyToClipboard(item.id, 'ID')}
                              title={`ID kopieren: ${item.id}`}
                            >
                              📋
                            </button>
                          </div>
                        </td>
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
                              {editingItem && editingItem.id === item.id ? '❌' : '✏️'}
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
                      {/* Inline-Bearbeitungsformular */}
                      {editingItem && editingItem.id === item.id && (
                        <tr className="inline-edit-row">
                          <td colSpan={showIdentnrColumn ? 9 : 8}>
                            <form onSubmit={handleInlineSubmit} className="inline-edit-form">
                              <div className="inline-form-header">
                                <h4>✏️ Datensatz bearbeiten: {item.identnr}</h4>
                              </div>
                              <div className="inline-form-grid">
                                <div className="multi-select-container">
                                  <div 
                                    className="multi-select-header inline-form-input"
                                    onClick={() => setShowIdentnrDropdown(!showIdentnrDropdown)}
                                  >
                                    {selectedIdentnrs.length === 0 
                                      ? 'Ident-Nr. auswählen oder eingeben *' 
                                      : `${selectedIdentnrs.length} Ident-Nr ausgewählt (${selectedIdentnrs.join(', ')})`
                                    }
                                    <span className="dropdown-arrow">{showIdentnrDropdown ? '▲' : '▼'}</span>
                                  </div>
                                  
                                  {showIdentnrDropdown && (
                                    <div className="multi-select-dropdown">
                                      {/* Custom input field */}
                                      <div className="custom-input-container">
                                        <input
                                          type="text"
                                          placeholder="Neue Ident-Nr eingeben..."
                                          value={customIdentnr}
                                          onChange={(e) => setCustomIdentnr(e.target.value)}
                                          onKeyDown={handleCustomIdentnrKeyDown}
                                          className="custom-identnr-input"
                                          autoFocus
                                        />
                                        {customIdentnr.trim() && (
                                          <button
                                            type="button"
                                            onClick={handleAddCustomIdentnr}
                                            className="add-custom-btn"
                                            title="Hinzufügen"
                                          >
                                            ✓
                                          </button>
                                        )}
                                      </div>
                                      
                                      {/* Separator if there are existing options */}
                                      {filteredIdentnrs.length > 0 && (
                                        <div className="dropdown-separator">
                                          <span>Bestehende Ident-Nr auswählen:</span>
                                        </div>
                                      )}
                                      
                                      {/* Existing options */}
                                      {filteredIdentnrs.map(identnr => (
                                        <label key={identnr} className="multi-select-item">
                                          <input
                                            type="checkbox"
                                            checked={selectedIdentnrs.includes(identnr)}
                                            onChange={() => toggleIdentnrSelection(identnr)}
                                            className="multi-select-checkbox"
                                          />
                                          <span className="multi-select-text">
                                            {identnr}
                                            {editingItem && originalRecord?.identnr === identnr && (
                                              <span className="star-badge"> ⭐</span>
                                            )}
                                          </span>
                                          {editingItem && originalRecord?.identnr === identnr && (
                                            <span className="original-badge">Original</span>
                                          )}
                                        </label>
                                      ))}
                                      
                                      {/* No results message */}
                                      {customIdentnr.trim() && filteredIdentnrs.length === 0 && (
                                        <div className="no-results">
                                          <em>Keine passenden Ident-Nr gefunden</em>
                                          <br />
                                          <small>Enter drücken um "{customIdentnr}" hinzuzufügen</small>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                                <input
                                  type="text"
                                  placeholder="Merkmal *"
                                  value={formData.merkmal}
                                  onChange={(e) => handleInputChange('merkmal', e.target.value)}
                                  required
                                  className="inline-form-input"
                                />
                                <input
                                  type="text"
                                  placeholder="Ausprägung *"
                                  value={formData.auspraegung}
                                  onChange={(e) => handleInputChange('auspraegung', e.target.value)}
                                  required
                                  className="inline-form-input"
                                />
                                <input
                                  type="text"
                                  placeholder="Drucktext *"
                                  value={formData.drucktext}
                                  onChange={(e) => handleInputChange('drucktext', e.target.value)}
                                  required
                                  className="inline-form-input"
                                />
                                <input
                                  type="text"
                                  placeholder="Sondermerkmal"
                                  value={formData.sondermerkmal}
                                  onChange={(e) => handleInputChange('sondermerkmal', e.target.value)}
                                  className="inline-form-input"
                                />
                                <input
                                  type="number"
                                  placeholder="Position"
                                  value={formData.position}
                                  onChange={(e) => handleInputChange('position', e.target.value)}
                                  className="inline-form-input"
                                />
                                <select
                                  value={formData.sonderAbt}
                                  onChange={(e) => handleInputChange('sonderAbt', e.target.value)}
                                  className="inline-form-input"
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
                                  className="inline-form-input"
                                >
                                  <option value="0">Fertigungsliste: Nein</option>
                                  <option value="1">Fertigungsliste: Ja</option>
                                </select>
                              </div>
                              <div className="inline-form-buttons">
                                <button 
                                  type="submit" 
                                  className="btn btn-success btn-small"
                                  disabled={operationLoading.update}
                                >
                                  {operationLoading.update ? '⏳ Speichert...' : '💾 Speichern'}
                                </button>
                                <button 
                                  type="button" 
                                  className="btn btn-secondary btn-small"
                                  onClick={() => {
                                    resetForm();
                                  }}
                                  disabled={operationLoading.update}
                                >
                                  ❌ Abbrechen
                                </button>
                              </div>
                            </form>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
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
          transform: translateY(-1px) scale(1.05);
          transition: all 0.3s ease;
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

        .filter-section, .form-section, .data-section, .settings-section {
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

        .filter-section h3, .form-section h3, .data-section h3, .settings-section h3 {
          margin-top: 0;
          margin-bottom: 20px;
          color: #586069;
          font-size: 1.3em;
          font-weight: 500;
          animation: fadeInUp 0.4s ease-out;
          animation-fill-mode: both;
          animation-delay: 0.1s;
        }

        .settings-grid {
          display: flex;
          flex-direction: column;
          gap: 16px;
          margin-bottom: 24px;
        }

        .setting-item {
          padding: 12px;
          border-radius: 8px;
          background: #f6f8fa;
          border: 1px solid #e1e4e8;
          transition: all 0.3s ease;
        }

        .setting-item:hover {
          background: #f1f3f4;
          border-color: #d0d7de;
        }

        .setting-label {
          display: flex;
          align-items: center;
          cursor: pointer;
          margin: 0;
          font-weight: 500;
        }

        .setting-checkbox {
          margin-right: 12px;
          transform: scale(1.2);
          cursor: pointer;
        }

        .setting-text {
          color: #586069;
          font-size: 14px;
          user-select: none;
        }

        .settings-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
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

        .data-table th.sortable {
          cursor: pointer;
          user-select: none;
          transition: background-color 0.2s ease;
        }

        .data-table th.sortable:hover {
          background: #f1f3f4;
        }

        .sort-arrow {
          display: inline-block;
          margin-left: 4px;
          color: #586069;
          font-weight: bold;
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

        .merkmal-cell {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
        }

        .merkmal-text {
          flex: 1;
        }

        .copy-id-btn {
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 4px 6px;
          border-radius: 4px;
          font-size: 12px;
          opacity: 0.6;
          transition: all 0.2s ease;
          color: #586069;
        }

        .copy-id-btn:hover {
          opacity: 1;
          background: #f6f8fa;
          transform: scale(1.1);
        }

        .copy-id-btn:active {
          transform: scale(0.95);
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

        .App.dark-mode .filter-section, .App.dark-mode .form-section, .App.dark-mode .data-section, .App.dark-mode .settings-section {
          background: #2d2d2d;
          border-color: #444;
        }

        .App.dark-mode .filter-section h3, .App.dark-mode .form-section h3, .App.dark-mode .data-section h3, .App.dark-mode .settings-section h3 {
          color: #e1e4e8;
        }

        .App.dark-mode .setting-item {
          background: #3a3a3a;
          border-color: #555;
        }

        .App.dark-mode .setting-item:hover {
          background: #4a4a4a;
          border-color: #666;
        }

        .App.dark-mode .setting-text {
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

        .App.dark-mode .data-table th.sortable:hover {
          background: #4a4a4a;
        }

        .App.dark-mode .sort-arrow {
          color: #e1e4e8;
        }

        .App.dark-mode .data-table td {
          border-color: #444;
          color: #e1e4e8;
        }

        .App.dark-mode .data-table tr:hover {
          background: #3a3a3a;
        }

        .App.dark-mode .copy-id-btn {
          color: #e1e4e8;
        }

        .App.dark-mode .copy-id-btn:hover {
          background: #4a4a4a;
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

        /* Multi-Select Dropdown Styles */
        .multi-select-container {
          position: relative;
          width: 100%;
        }

        .multi-select-header {
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          border: 2px solid #d1d5db;
          padding: 12px 16px;
          border-radius: 8px;
          transition: all 0.2s ease;
          color: #374151;
        }

        .multi-select-header:hover {
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .dropdown-arrow {
          font-size: 12px;
          color: var(--text-secondary);
          transition: transform 0.2s ease;
        }

        .multi-select-dropdown {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: #ffffff;
          border: 2px solid #3b82f6;
          border-radius: 8px;
          max-height: 400px;
          overflow-y: auto;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          margin-top: 4px;
        }

        .multi-select-item {
          display: flex;
          align-items: center;
          padding: 10px 15px;
          cursor: pointer;
          border-bottom: 1px solid #e5e7eb;
          transition: background-color 0.2s ease;
          background: #ffffff;
        }

        .multi-select-item:hover {
          background: #dbeafe;
        }

        .multi-select-item:last-child {
          border-bottom: none;
        }

        .multi-select-checkbox {
          margin-right: 8px;
          transform: scale(1.1);
        }

        .multi-select-text {
          flex: 1;
          font-size: 0.9em;
          color: #374151;
          font-weight: 500;
        }

        .original-badge {
          background: var(--pastel-indigo);
          color: #6366f1;
          padding: 2px 6px;
          border-radius: 4px;
          font-size: 0.7em;
          font-weight: 500;
          margin-left: 8px;
        }

        .star-badge {
          font-size: 0.9em;
          margin-left: 4px;
        }

        /* Dark mode multi-select styles */
        .App.dark-mode .multi-select-header {
          background: #2d2d2d;
          border-color: #444;
          color: #e1e4e8;
        }

        .App.dark-mode .multi-select-header:hover {
          border-color: #3b82f6;
        }

        .App.dark-mode .multi-select-dropdown {
          background: #2d2d2d;
          border-color: #444;
        }

        .App.dark-mode .multi-select-item {
          color: #e1e4e8;
          border-color: #3a3a3a;
        }

        .App.dark-mode .multi-select-item:hover {
          background: #1e3a8a;
        }

        .App.dark-mode .multi-select-text {
          color: #e1e4e8;
        }

        .App.dark-mode .original-badge {
          background: #3730a3;
          color: #a5b4fc;
        }

        /* Custom input styles */
        .custom-input-container {
          display: flex;
          align-items: center;
          padding: 12px 15px;
          border-bottom: 2px solid #e5e7eb;
          background: #f8fafc;
          border-radius: 8px 8px 0 0;
        }

        .custom-identnr-input {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #d1d5db;
          border-radius: 6px;
          font-size: 14px;
          background: #ffffff;
          color: #374151;
        }

        .custom-identnr-input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
        }

        .add-custom-btn {
          margin-left: 8px;
          padding: 6px 10px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          transition: background-color 0.2s ease;
        }

        .add-custom-btn:hover {
          background: #059669;
        }

        .dropdown-separator {
          padding: 8px 15px;
          background: #f3f4f6;
          border-bottom: 1px solid #e5e7eb;
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          text-align: center;
        }

        .no-results {
          padding: 15px;
          text-align: center;
          color: #6b7280;
          font-size: 14px;
          border-bottom: 1px solid #e5e7eb;
        }

        .no-results small {
          color: #9ca3af;
          font-size: 12px;
        }

        /* Dark mode styles for custom input */
        .App.dark-mode .custom-input-container {
          background: #374151;
          border-color: #4b5563;
        }

        .App.dark-mode .custom-identnr-input {
          background: #2d2d2d;
          border-color: #4b5563;
          color: #e1e4e8;
        }

        .App.dark-mode .custom-identnr-input::placeholder {
          color: #9ca3af;
        }

        .App.dark-mode .custom-identnr-input:focus {
          border-color: #3b82f6;
        }

        .App.dark-mode .dropdown-separator {
          background: #4b5563;
          border-color: #6b7280;
          color: #d1d5db;
        }

        .App.dark-mode .no-results {
          color: #9ca3af;
          border-color: #4b5563;
        }

        .App.dark-mode .no-results small {
          color: #6b7280;
        }

        /* Selected items summary styles */
        .selected-summary {
          padding: 12px 15px;
          background: #f8fafc;
          border-bottom: 1px solid #e5e7eb;
          font-size: 13px;
        }

        .selected-items {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-top: 8px;
        }

        .selected-tag {
          display: inline-flex;
          align-items: center;
          background: #dbeafe;
          color: #1e40af;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 500;
          gap: 4px;
        }

        .remove-tag-btn {
          background: none;
          border: none;
          color: #1e40af;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          padding: 0;
          width: 16px;
          height: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 2px;
          transition: background-color 0.2s ease;
        }

        .remove-tag-btn:hover {
          background: #bfdbfe;
        }

        /* Dark mode styles for selected summary */
        .App.dark-mode .selected-summary {
          background: #374151;
          border-color: #4b5563;
          color: #d1d5db;
        }

        .App.dark-mode .selected-tag {
          background: #1e3a8a;
          color: #bfdbfe;
        }

        .App.dark-mode .remove-tag-btn {
          color: #bfdbfe;
        }

        .App.dark-mode .remove-tag-btn:hover {
          background: #1e40af;
        }

        /* Inline-Bearbeitungsformular Stile */
        .inline-edit-row {
          background: var(--pastel-blue) !important;
          border: 2px solid #6b7280;
          animation: slideInDown 0.4s ease-out;
          transform-origin: top;
        }

        .inline-edit-row td {
          position: relative;
          overflow: visible;
        }

        .inline-edit-form {
          padding: 20px;
          background: #ffffff;
          border-radius: 12px;
          margin: 10px;
          box-shadow: var(--medium-shadow);
          border: 1px solid #e1e4e8;
          animation: fadeInUp 0.5s ease-out;
          animation-fill-mode: both;
          position: relative;
          overflow: visible;
        }

        .inline-form-header {
          margin-bottom: 16px;
          text-align: center;
        }

        .inline-form-header h4 {
          color: var(--text-primary);
          margin: 0;
          font-size: 1.1em;
          font-weight: 500;
          animation: fadeInUp 0.4s ease-out;
          animation-fill-mode: both;
          animation-delay: 0.1s;
        }

        .inline-form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 12px;
          margin-bottom: 16px;
        }

        .inline-form-input {
          padding: 10px 12px;
          border: 2px solid #e1e4e8;
          border-radius: 6px;
          font-size: 14px;
          transition: all 0.3s ease;
          background: #ffffff;
          color: var(--text-primary);
          animation: fadeInUp 0.5s ease-out;
          animation-fill-mode: both;
        }

        /* Sıralı animasyon gecikmesi için input alanları */
        .inline-form-input:nth-child(1) { animation-delay: 0.1s; }
        .inline-form-input:nth-child(2) { animation-delay: 0.15s; }
        .inline-form-input:nth-child(3) { animation-delay: 0.2s; }
        .inline-form-input:nth-child(4) { animation-delay: 0.25s; }
        .inline-form-input:nth-child(5) { animation-delay: 0.3s; }
        .inline-form-input:nth-child(6) { animation-delay: 0.35s; }
        .inline-form-input:nth-child(7) { animation-delay: 0.4s; }

        .inline-form-input:focus {
          outline: none;
          border-color: #a5b4fc;
          box-shadow: 0 0 0 3px rgba(165, 180, 252, 0.1);
        }

        .inline-form-input::placeholder {
          color: var(--text-muted);
        }

        .inline-form-buttons {
          display: flex;
          gap: 10px;
          justify-content: center;
          flex-wrap: wrap;
          animation: fadeInUp 0.6s ease-out;
          animation-fill-mode: both;
          animation-delay: 0.3s;
        }

        /* Dark mode Stile für Inline-Bearbeitung */
        .App.dark-mode .inline-edit-row {
          background: #374151 !important;
          border-color: #6b7280;
        }

        .App.dark-mode .inline-edit-form {
          background: #2d2d2d;
          border-color: #444;
        }

        .App.dark-mode .inline-form-header h4 {
          color: #e1e4e8;
        }

        .App.dark-mode .inline-form-input {
          background: #3a3a3a;
          border-color: #555;
          color: #e1e4e8;
        }

        .App.dark-mode .inline-form-input::placeholder {
          color: #888;
        }

        .App.dark-mode .inline-form-input:focus {
          border-color: #3b82f6;
        }

        /* Responsive Design für Inline-Form */
        @media (max-width: 768px) {
          .inline-form-grid {
            grid-template-columns: 1fr;
          }
          
          .inline-form-buttons {
            flex-direction: column;
            align-items: center;
          }
        }
      `}</style>
    </div>
  );
}