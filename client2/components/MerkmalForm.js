import React, { useEffect } from 'react';

const MerkmalForm = ({
  showForm,
  editingItem,
  formData,
  selectedIdentnrs,
  showIdentnrDropdown,
  customIdentnr,
  filteredIdentnrs,
  originalRecord,
  operationLoading,
  copiedGroupData,
  onSubmit,
  onInputChange,
  onDropdownToggle,
  onCustomIdentnrChange,
  onCustomIdentnrKeyDown,
  onAddCustomIdentnr,
  onToggleIdentnrSelection,
  onCancel
}) => {
  // Note: Click outside handling is now done in the main page component

  if (!showForm) {
    return null;
  }

  return (
    <section className="form-section">
      <div className="form-header">
        <h3>{editingItem ? '✏️ Datensatz bearbeiten' : '➕ Neuen Datensatz hinzufügen'}</h3>
      </div>
      <form onSubmit={onSubmit} className="data-form">
        <div className="form-row">
          {/* Multi-Select Ident-Nr Dropdown */}
          <div className="multi-select-container">
            <div
              className="multi-select-header form-input form-identnr-dropdown-trigger"
              onClick={onDropdownToggle}
            >
              {selectedIdentnrs.length === 0
                ? 'Ident-Nr. auswählen oder eingeben *'
                : `${selectedIdentnrs.length} Ident-Nr ausgewählt (${selectedIdentnrs.join(', ')})`
              }
              <span className="dropdown-arrow">{showIdentnrDropdown ? '▲' : '▼'}</span>
            </div>

            {showIdentnrDropdown && (
              <div className="multi-select-dropdown form-identnr-dropdown-menu">
                {/* Custom input field */}
                <div className="custom-input-container">
                  <input
                    type="text"
                    placeholder="Neue Ident-Nr eingeben..."
                    value={customIdentnr}
                    onChange={(e) => onCustomIdentnrChange(e.target.value)}
                    onKeyDown={onCustomIdentnrKeyDown}
                    className="custom-identnr-input"
                    autoFocus
                  />
                  {customIdentnr.trim() && (
                    <button
                      type="button"
                      onClick={onAddCustomIdentnr}
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
                      onChange={(e) => {
                        e.stopPropagation();
                        onToggleIdentnrSelection(identnr);
                      }}
                      onClick={(e) => e.stopPropagation()}
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

          {/* Merkmal Input */}
          <input
            type="text"
            placeholder="Merkmal *"
            value={formData.merkmal}
            onChange={(e) => onInputChange('merkmal', e.target.value)}
            required
            className="form-input"
          />
        </div>

        <div className="form-row">
          <input
            type="text"
            placeholder="Ausprägung *"
            value={formData.auspraegung}
            onChange={(e) => onInputChange('auspraegung', e.target.value)}
            required
            className="form-input"
          />
          <input
            type="text"
            placeholder="Drucktext *"
            value={formData.drucktext}
            onChange={(e) => onInputChange('drucktext', e.target.value)}
            required
            className="form-input"
          />
        </div>

        <div className="form-row">
          <input
            type="text"
            placeholder="Sondermerkmal"
            value={formData.sondermerkmal}
            onChange={(e) => onInputChange('sondermerkmal', e.target.value)}
            className="form-input"
          />
          <input
            type="number"
            placeholder="Position"
            value={formData.position}
            onChange={(e) => {
              const value = e.target.value;
              // Only allow positive integers
              if (value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0)) {
                onInputChange('position', value);
              }
            }}
            min="0"
            step="1"
            className="form-input"
          />
        </div>

        <div className="form-row">
          <select
            value={formData.sonderAbt}
            onChange={(e) => onInputChange('sonderAbt', e.target.value)}
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
            onChange={(e) => onInputChange('fertigungsliste', e.target.value)}
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
            onClick={onCancel}
            disabled={operationLoading.create || operationLoading.update}
          >
            ❌ Abbrechen
          </button>
        </div>
      </form>
    </section>
  );
};

export default MerkmalForm;