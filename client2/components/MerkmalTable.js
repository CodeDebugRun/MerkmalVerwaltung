import React from 'react';

const MerkmalTable = ({
  data,
  loading,
  hasData,
  sortConfig,
  editingItem,
  formData,
  columnFilters,
  selectedIdentnrs,
  showInlineDropdown,
  allIdentnrs,
  customIdentnr,
  operationLoading,
  showIdentnrColumn = false,
  onSort,
  onEdit,
  onDelete,
  onCopyToClipboard,
  onInputChange,
  onResetForm,
  onColumnFilterChange,
  onInlineDropdownToggle,
  onCustomIdentnrChange,
  onToggleIdentnrSelection,
  onAddCustomIdentnr,
  onUpdateRecord,
  getSonderAbtDisplay
}) => {
  if (!hasData || loading) {
    return null;
  }

  const getSortIndicator = (key) => {
    if (sortConfig.key === key) {
      return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
    }
    return '';
  };

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            {showIdentnrColumn && (
              <th onClick={() => onSort('identnr')} className="sortable">
                Ident-Nr {getSortIndicator('identnr')}
              </th>
            )}
            <th onClick={() => onSort('merkmal')} className="sortable">
              Merkmal {getSortIndicator('merkmal')}
            </th>
            <th onClick={() => onSort('auspraegung')} className="sortable">
              Ausprägung {getSortIndicator('auspraegung')}
            </th>
            <th onClick={() => onSort('drucktext')} className="sortable">
              Drucktext {getSortIndicator('drucktext')}
            </th>
            <th onClick={() => onSort('sondermerkmal')} className="sortable">
              Sondermerkmal {getSortIndicator('sondermerkmal')}
            </th>
            <th onClick={() => onSort('position')} className="sortable">
              Position {getSortIndicator('position')}
            </th>
            <th onClick={() => onSort('sonderAbt')} className="sortable">
              Sonder-Abt {getSortIndicator('sonderAbt')}
            </th>
            <th onClick={() => onSort('fertigungsliste')} className="sortable">
              Fertigungsliste {getSortIndicator('fertigungsliste')}
            </th>
            <th>Aktionen</th>
          </tr>
          {/* Column Filter Row */}
          <tr>
            {showIdentnrColumn && (
              <th>
                <input
                  type="text"
                  placeholder="Filter Ident-Nr..."
                  value={columnFilters.identnr || ''}
                  onChange={(e) => onColumnFilterChange('identnr', e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && onColumnFilterChange('apply', 'all')}
                  style={{
                    width: '100%',
                    padding: '4px',
                    fontSize: '12px',
                    border: '1px solid #ddd',
                    borderRadius: '3px'
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              </th>
            )}
            <th>
              <input
                type="text"
                placeholder="Filter Merkmal..."
                value={columnFilters.merkmal}
                onChange={(e) => onColumnFilterChange('merkmal', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onColumnFilterChange('apply', 'all')}
                style={{
                  width: '100%',
                  padding: '4px',
                  fontSize: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </th>
            <th>
              <input
                type="text"
                placeholder="Filter Ausprägung..."
                value={columnFilters.auspraegung}
                onChange={(e) => onColumnFilterChange('auspraegung', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onColumnFilterChange('apply', 'all')}
                style={{
                  width: '100%',
                  padding: '4px',
                  fontSize: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </th>
            <th>
              <input
                type="text"
                placeholder="Filter Drucktext..."
                value={columnFilters.drucktext}
                onChange={(e) => onColumnFilterChange('drucktext', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onColumnFilterChange('apply', 'all')}
                style={{
                  width: '100%',
                  padding: '4px',
                  fontSize: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </th>
            <th>
              <input
                type="text"
                placeholder="Filter Sondermerkmal..."
                value={columnFilters.sondermerkmal}
                onChange={(e) => onColumnFilterChange('sondermerkmal', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onColumnFilterChange('apply', 'all')}
                style={{
                  width: '100%',
                  padding: '4px',
                  fontSize: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </th>
            <th>
              <input
                type="text"
                placeholder="Filter Position..."
                value={columnFilters.position}
                onChange={(e) => onColumnFilterChange('position', e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && onColumnFilterChange('apply', 'all')}
                style={{
                  width: '100%',
                  padding: '4px',
                  fontSize: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
                onClick={(e) => e.stopPropagation()}
              />
            </th>
            <th>
              <select
                value={columnFilters.sonderAbt}
                onChange={(e) => onColumnFilterChange('sonderAbt', e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px',
                  fontSize: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Alle Sonder-Abt</option>
                <option value="0">Keine</option>
                <option value="1">1 - schwarz</option>
                <option value="2">2 - blau</option>
                <option value="3">3 - rot</option>
                <option value="4">4 - orange</option>
                <option value="5">5 - grün</option>
                <option value="6">6 - weiss</option>
                <option value="7">7 - gelb</option>
              </select>
            </th>
            <th>
              <select
                value={columnFilters.fertigungsliste}
                onChange={(e) => onColumnFilterChange('fertigungsliste', e.target.value)}
                style={{
                  width: '100%',
                  padding: '4px',
                  fontSize: '12px',
                  border: '1px solid #ddd',
                  borderRadius: '3px'
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <option value="">Alle</option>
                <option value="0">Nein (✗)</option>
                <option value="1">Ja (✓)</option>
              </select>
            </th>
            <th>
              <div style={{display: 'flex', gap: '4px', justifyContent: 'center'}}>
                <button
                  onClick={() => onColumnFilterChange && onColumnFilterChange('apply', 'all')}
                  className="table-filter-btn table-filter-apply"
                  title="Filter anwenden"
                >
                  🔍
                </button>
                <button
                  onClick={() => onColumnFilterChange && onColumnFilterChange('clear', 'all')}
                  className="table-filter-btn table-filter-reset"
                  title="Filter zurücksetzen"
                >
                  🔄
                </button>
              </div>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((item) => (
            <React.Fragment key={item.id}>
              <tr>
                {showIdentnrColumn && (
                  <td>{item.identnr}</td>
                )}
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
                      onClick={() => onEdit(item)}
                      title="Bearbeiten"
                    >
                      {editingItem && editingItem.id === item.id ? '❌' : '✏️'}
                    </button>
                    <button
                      className="btn-small btn-delete"
                      onClick={() => onDelete(item)}
                      title="Löschen"
                    >
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>

              {/* Inline Edit Form - Simplified */}
              {editingItem && editingItem.id === item.id && (
                <tr className="inline-edit-row">
                  <td colSpan={showIdentnrColumn ? 9 : 8}>
                    <div className="inline-edit-form">
                      <div className="inline-form-header">
                        <h4 style={{lineHeight: '1.5'}}>
                          Datensatz bearbeiten: {(() => {
                            const identnrList = item._groupData?.identnr_list || item.identnr;
                            // Remove duplicates, clean up, and sort
                            const cleanAndSorted = identnrList.split(',')
                              .map(id => id.trim())
                              .filter((id, index, arr) => arr.indexOf(id) === index)
                              .sort((a, b) => {
                                // Natural sort for alphanumeric identnrs (T0001, T0002, etc.)
                                return a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' });
                              });

                            // Break into lines with max 20 identnrs per line
                            const lines = [];
                            for (let i = 0; i < cleanAndSorted.length; i += 20) {
                              lines.push(cleanAndSorted.slice(i, i + 20).join(','));
                            }

                            return (
                              <div style={{display: 'inline'}}>
                                {lines.map((line, index) => (
                                  <div key={index} style={{marginTop: index > 0 ? '4px' : '0'}}>
                                    {line}
                                  </div>
                                ))}
                              </div>
                            );
                          })()}
                        </h4>
                      </div>
                      <div className="inline-form-grid">
                        {/* Identnr Dropdown */}
                        <div className="inline-form-input" style={{position: 'relative'}}>
                          <div
                            className="identnr-dropdown-trigger"
                            onClick={onInlineDropdownToggle}
                            style={{
                              padding: '8px 12px',
                              border: '1px solid #ddd',
                              borderRadius: '4px',
                              backgroundColor: '#fff',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                            }}
                          >
                            <span>
                              {(() => {
                                // Remove duplicates from selectedIdentnrs for count
                                const uniqueIdentnrs = [...new Set(selectedIdentnrs)];
                                if (uniqueIdentnrs.length === 0) {
                                  return 'Ident-Nr. auswählen...';
                                } else if (uniqueIdentnrs.length <= 3) {
                                  // Show actual identnrs if 3 or fewer
                                  return uniqueIdentnrs.join(', ');
                                } else {
                                  // Show count if more than 3
                                  return `${uniqueIdentnrs.length} Ident-Nr ausgewählt`;
                                }
                              })()}
                            </span>
                            <span className="dropdown-arrow">{showInlineDropdown ? '▲' : '▼'}</span>
                          </div>

                          {showInlineDropdown && (
                            <div
                              className="identnr-dropdown-menu"
                              style={{
                                position: 'absolute',
                                top: '100%',
                                left: '0',
                                right: '0',
                                backgroundColor: '#fff',
                                border: '1px solid #ddd',
                                borderTop: 'none',
                                borderRadius: '0 0 4px 4px',
                                maxHeight: '200px',
                                overflowY: 'auto',
                                zIndex: 1000,
                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                              }}
                            >
                              {/* Custom input */}
                              <div style={{padding: '8px', borderBottom: '1px solid #eee'}}>
                                <input
                                  type="text"
                                  placeholder="Neue Ident-Nr eingeben..."
                                  value={customIdentnr}
                                  onChange={(e) => onCustomIdentnrChange(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && customIdentnr.trim()) {
                                      e.preventDefault();
                                      onAddCustomIdentnr();
                                    }
                                  }}
                                  style={{
                                    width: '100%',
                                    padding: '4px 8px',
                                    border: '1px solid #ddd',
                                    borderRadius: '3px',
                                    fontSize: '12px'
                                  }}
                                />
                              </div>

                              {/* Existing identnrs */}
                              {allIdentnrs.map(identnr => (
                                <label
                                  key={identnr}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    padding: '6px 12px',
                                    cursor: 'pointer',
                                    fontSize: '12px'
                                  }}
                                  onMouseEnter={(e) => e.target.style.backgroundColor = '#f5f5f5'}
                                  onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                >
                                  <input
                                    type="checkbox"
                                    checked={selectedIdentnrs.includes(identnr)}
                                    onChange={() => onToggleIdentnrSelection(identnr)}
                                    style={{marginRight: '8px'}}
                                  />
                                  {identnr}
                                </label>
                              ))}
                            </div>
                          )}
                        </div>

                        <input
                          type="text"
                          placeholder="Merkmal *"
                          value={formData.merkmal}
                          onChange={(e) => onInputChange('merkmal', e.target.value)}
                          className="inline-form-input"
                        />
                        <input
                          type="text"
                          placeholder="Ausprägung *"
                          value={formData.auspraegung}
                          onChange={(e) => onInputChange('auspraegung', e.target.value)}
                          className="inline-form-input"
                        />
                        <input
                          type="text"
                          placeholder="Drucktext *"
                          value={formData.drucktext}
                          onChange={(e) => onInputChange('drucktext', e.target.value)}
                          className="inline-form-input"
                        />
                        <input
                          type="text"
                          placeholder="Sondermerkmal"
                          value={formData.sondermerkmal}
                          onChange={(e) => onInputChange('sondermerkmal', e.target.value)}
                          className="inline-form-input"
                        />
                        <input
                          type="number"
                          placeholder="Position"
                          value={formData.position}
                          onChange={(e) => onInputChange('position', e.target.value)}
                          className="inline-form-input"
                        />
                        <select
                          value={formData.sonderAbt}
                          onChange={(e) => onInputChange('sonderAbt', e.target.value)}
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
                          onChange={(e) => onInputChange('fertigungsliste', e.target.value)}
                          className="inline-form-input"
                        >
                          <option value="0">Fertigungsliste: Nein</option>
                          <option value="1">Fertigungsliste: Ja</option>
                        </select>
                      </div>
                      <div className="inline-form-buttons">
                        <button
                          type="button"
                          className="btn btn-success btn-small"
                          onClick={onUpdateRecord}
                          disabled={operationLoading?.update}
                        >
                          {operationLoading?.update ? '⏳ Speichert...' : '💾 Speichern'}
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-small"
                          onClick={onResetForm}
                        >
                          ❌ Abbrechen
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default MerkmalTable;