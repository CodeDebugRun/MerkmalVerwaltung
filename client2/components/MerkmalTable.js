import React from 'react';

const MerkmalTable = ({
  data,
  loading,
  hasData,
  showIdentnrColumn,
  sortConfig,
  editingItem,
  formData,
  onSort,
  onEdit,
  onDelete,
  onCopyToClipboard,
  onInputChange,
  onResetForm,
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
              <th className="sortable" onClick={() => onSort('identnr')}>
                Ident-Nr. {getSortIndicator('identnr')}
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
        </thead>
        <tbody>
          {data.map((item) => (
            <React.Fragment key={item.id}>
              <tr>
                {showIdentnrColumn && <td>{item.identnr}</td>}
                <td>
                  <div className="merkmal-cell">
                    <span className="merkmal-text">{item.merkmal}</span>
                    <button
                      className="copy-id-btn"
                      onClick={() => onCopyToClipboard(item.id, 'ID')}
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
                      onClick={() => onEdit(item)}
                      title="Bearbeiten"
                    >
                      {editingItem && editingItem.id === item.id ? '❌' : '✏️'}
                    </button>
                    <button
                      className="btn-small btn-delete"
                      onClick={() => onDelete(item.id, item.identnr)}
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
                        <h4>✏️ Datensatz bearbeiten: {item.identnr}</h4>
                      </div>
                      <div className="inline-form-grid">
                        <input
                          type="text"
                          placeholder="Ident-Nr. *"
                          value={formData.identnr}
                          onChange={(e) => onInputChange('identnr', e.target.value)}
                          className="inline-form-input"
                        />
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
                          onClick={() => console.log('Update functionality will be added later')}
                        >
                          💾 Speichern (Demo)
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