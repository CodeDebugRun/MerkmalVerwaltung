import React, { useEffect } from 'react';

const FilterPanel = ({
  showFilters,
  filterData,
  selectedFilterIdentnrs,
  showFilterIdentnrDropdown,
  customFilterIdentnr,
  filteredFilterIdentnrs,
  loading,
  onFilterChange,
  onDropdownToggle,
  onCustomFilterIdentnrChange,
  onToggleFilterIdentnrSelection,
  onRemoveFilterIdentnr,
  onSearch,
  onClearFilters
}) => {
  // Note: Click outside handling is now done in the main page component

  if (!showFilters) {
    return null;
  }

  return (
    <section className="form-section">
      <h3>🔍 Datensätze Filter</h3>
      <div className="data-form">
        <div className="form-row">
          {/* Multi-Select Ident-Nr Filter */}
          <div className="filter-group">
            <label>Ident-Nr</label>
            <div className="multi-select-container">
              <div
                className="multi-select-header filter-input filter-identnr-dropdown-trigger"
                onClick={onDropdownToggle}
              >
              {selectedFilterIdentnrs.length === 0
                ? 'Ident-Nr. auswählen'
                : `${selectedFilterIdentnrs[0]}`
              }
              <span className="dropdown-arrow">{showFilterIdentnrDropdown ? '▲' : '▼'}</span>
            </div>

            {showFilterIdentnrDropdown && (
              <div className="multi-select-dropdown filter-identnr-dropdown-menu">
                {/* Filter input for search */}
                <div className="custom-input-container">
                  <input
                    type="text"
                    placeholder="Ident-Nr suchen..."
                    value={customFilterIdentnr}
                    onChange={(e) => onCustomFilterIdentnrChange(e.target.value)}
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
                            onRemoveFilterIdentnr();
                          }}
                          className="remove-tag-btn"
                          title={`${selectedFilterIdentnrs[0]} entfernen`}
                        >
                          ×
                        </button>
                      </span>
                    </div>
                    <small style={{ color: '#8b949e', marginTop: '4px', display: 'block' }}>
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
                        onChange={() => onToggleFilterIdentnrSelection(identnr)}
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
          </div>

          {/* Other filter inputs */}
          <div className="filter-group">
            <label>Merkmal</label>
            <input
              type="text"
              placeholder="Merkmal eingeben..."
              value={filterData.merkmal}
              onChange={(e) => onFilterChange('merkmal', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="filter-input"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="filter-group">
            <label>Ausprägung</label>
            <input
              type="text"
              placeholder="Ausprägung eingeben..."
              value={filterData.auspraegung}
              onChange={(e) => onFilterChange('auspraegung', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Drucktext</label>
            <input
              type="text"
              placeholder="Drucktext eingeben..."
              value={filterData.drucktext}
              onChange={(e) => onFilterChange('drucktext', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="filter-input"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="filter-group">
            <label>Sondermerkmal</label>
            <input
              type="text"
              placeholder="Sondermerkmal eingeben..."
              value={filterData.sondermerkmal}
              onChange={(e) => onFilterChange('sondermerkmal', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="filter-input"
            />
          </div>

          <div className="filter-group">
            <label>Position</label>
            <input
              type="number"
              placeholder="Position eingeben..."
              value={filterData.position}
              onChange={(e) => onFilterChange('position', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="filter-input"
            />
          </div>
        </div>

        <div className="form-row">
          <div className="filter-group">
            <label>Sonder Abt</label>
            <select
              value={filterData.sonderAbt}
              onChange={(e) => onFilterChange('sonderAbt', e.target.value)}
              className="filter-input"
            >
              <option value="">Alle</option>
              <option value="0">Keine</option>
              <option value="1">1 - schwarz</option>
              <option value="2">2 - blau</option>
              <option value="3">3 - rot</option>
              <option value="4">4 - orange</option>
              <option value="5">5 - grün</option>
              <option value="6">6 - weiss</option>
              <option value="7">7 - gelb</option>
            </select>
          </div>

          <div className="filter-group">
            <label>Fertigungsliste</label>
            <select
              value={filterData.fertigungsliste}
              onChange={(e) => onFilterChange('fertigungsliste', e.target.value)}
              className="filter-input"
            >
              <option value="">Alle</option>
              <option value="1">Ja</option>
              <option value="0">Nein</option>
            </select>
          </div>
        </div>

        <div className="form-buttons">
          <button
            type="button"
            className="btn btn-primary"
            onClick={onSearch}
            disabled={loading}
          >
            {loading ? '⏳ Suche läuft...' : '🔍 Suchen'}
          </button>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onClearFilters}
          >
            🗑️ Löschen
          </button>
        </div>
      </div>

    </section>
  );
};

export default FilterPanel;