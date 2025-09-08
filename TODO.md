# TODO List - Frontend Improvements

## 🔧 Bug Fixes (High Priority)

- [ ] **Fix frontend TypeError: toLowerCase() is not a function**
  - Issue: Filter function calls toLowerCase() on integer/null values
  - Location: `client/src/App.js` line ~117
  - Fix: Add `.toString()` before `.toLowerCase()` for numeric fields

- [ ] **Update frontend to use correct field names (fListe -> fertigungsliste)**
  - Issue: Frontend still uses old field name `fListe`
  - Locations: formData, handleEdit, filter function, table display
  - Fix: Replace all `fListe` references with `fertigungsliste`

- [ ] **Fix filter function to handle integer/null values properly**
  - Issue: Search filter crashes on numeric/null fields
  - Fix: Convert numeric fields to string before filtering

## 🎨 UX Improvements (Medium Priority)

- [ ] **Add placeholders to form inputs for better UX**
  - Add helpful placeholder text to all form fields
  - Examples: "T0001", "Merkmal eingeben...", "Ausprägung eingeben..."

- [ ] **Implement form validation for required fields**
  - Add client-side validation for required fields
  - Required fields: identnr, merkmal, auspraegung, drucktext

- [ ] **Prevent form from closing when required fields are empty**
  - Block form submission/closure if required fields are missing
  - Show validation errors before allowing form to close

- [ ] **Add error messages for invalid/empty required fields**
  - Display clear error messages for each validation failure
  - Red borders/text for invalid fields
  - Success feedback when validation passes

- [ ] **Test form validation and error handling**
  - Test all validation scenarios
  - Ensure proper error handling
  - Verify UX flow is smooth

## 🚀 Current Status

- ✅ Backend POST endpoint working (records 220534, 220535 created successfully)
- ✅ Server running on port 3001
- ✅ Frontend running on port 3002
- ❌ Frontend crashes due to TypeError in filter function

## 📝 Notes

- Backend is fully functional
- Database field mapping is correct
- Main issue is frontend field handling
- Priority: Fix crashes first, then improve UX