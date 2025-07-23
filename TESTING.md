# Testing Guide - ISW Offering Assistant

## Test Plan

### Manual Testing Checklist

#### 🔐 Authentication Tests
- [ ] Login with valid credentials (admin/admin123)
- [ ] Login with invalid credentials
- [ ] Session timeout handling
- [ ] Logout functionality
- [ ] Token refresh on API calls

#### 👥 User Management Tests (Admin only)
- [ ] Create new user
- [ ] Edit existing user
- [ ] Activate/deactivate user
- [ ] Delete user
- [ ] Reset user password
- [ ] Role assignment (admin/user)

#### 👨‍💼 Client Management Tests
- [ ] Create new client
- [ ] Edit existing client
- [ ] Search/filter clients
- [ ] Activate/deactivate client
- [ ] Delete client
- [ ] View client details

#### 📦 Product Management Tests
- [ ] Create new product
- [ ] Edit existing product
- [ ] Create product group
- [ ] Assign product to group
- [ ] Search products by code/name
- [ ] Activate/deactivate product
- [ ] Delete product/group

#### 💼 Offer Management Tests
- [ ] Create new offer
- [ ] Add products to offer
- [ ] Calculate totals correctly
- [ ] Generate PDF offer
- [ ] Send offer (change status)
- [ ] Create offer revision
- [ ] Lock/unlock offer
- [ ] Convert offer to sale

#### 💰 Sales Management Tests
- [ ] View sales list
- [ ] Filter sales by status/date
- [ ] View sale details
- [ ] Complete pending sale
- [ ] Cancel sale
- [ ] Generate invoice from sale

#### 📄 Document Management Tests
- [ ] Upload new document
- [ ] Categorize document type
- [ ] Update document status
- [ ] Download/view document
- [ ] Archive document
- [ ] Delete document

#### 🏢 Company Settings Tests
- [ ] Update company information
- [ ] Upload company logo
- [ ] Create database backup
- [ ] Restore from backup
- [ ] Export data (clients, products, offers, sales)

### API Integration Tests

#### Backend Communication
- [ ] All API endpoints respond correctly
- [ ] Error handling for network issues
- [ ] JWT token validation
- [ ] File upload functionality
- [ ] PDF generation
- [ ] Database operations

#### Data Validation
- [ ] Form validation on frontend
- [ ] API validation responses
- [ ] Required field checking
- [ ] Data type validation
- [ ] Business logic validation

### UI/UX Tests

#### Navigation
- [ ] Main menu navigation
- [ ] Sidebar collapse/expand
- [ ] Modal dialogs open/close
- [ ] Form submission feedback
- [ ] Loading indicators

#### Responsiveness
- [ ] Window resize handling
- [ ] Table responsiveness
- [ ] Modal dialog sizing
- [ ] Form layout adaptation

#### Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader compatibility
- [ ] Color contrast
- [ ] Focus indicators

### Performance Tests

#### Application Performance
- [ ] Startup time acceptable
- [ ] Menu switching responsive
- [ ] Large data sets loading
- [ ] File upload performance
- [ ] PDF generation speed

#### Memory Usage
- [ ] No memory leaks
- [ ] Efficient DOM updates
- [ ] Image optimization
- [ ] Data caching

### Security Tests

#### Authentication Security
- [ ] Password requirements enforced
- [ ] Session management secure
- [ ] Token expiration handling
- [ ] Role-based access control

#### Data Security
- [ ] Input sanitization
- [ ] SQL injection prevention
- [ ] File upload restrictions
- [ ] Sensitive data protection

### Error Handling Tests

#### Network Errors
- [ ] API server down
- [ ] Network connectivity issues
- [ ] Timeout handling
- [ ] Retry mechanisms

#### Application Errors
- [ ] Invalid data handling
- [ ] File system errors
- [ ] Database errors
- [ ] User-friendly error messages

### Integration Tests

#### Database Integration
- [ ] CRUD operations work correctly
- [ ] Foreign key constraints
- [ ] Transaction handling
- [ ] Data consistency

#### File System Integration
- [ ] File upload/download
- [ ] PDF generation and storage
- [ ] Logo upload and display
- [ ] Backup/restore operations

## Test Data

### Default Test Users
```
Admin User:
- Username: admin
- Password: admin123
- Role: admin

Regular User:
- Username: user
- Password: user123
- Role: user
```

### Sample Test Data
- 5 test clients with complete information
- 10 test products in different categories
- 3 test offers in different statuses
- 2 test sales (completed and pending)
- Various document types for testing

## Test Environment Setup

### Prerequisites
1. MariaDB running with test database
2. Backend API running on localhost:3000
3. Test data loaded via init script
4. Desktop application built and running

### Test Database Reset
```sql
-- Reset to clean state
DROP DATABASE IF EXISTS isw_offering_test;
CREATE DATABASE isw_offering_test;
-- Run init script
```

## Bug Reporting Template

```
**Bug Title**: [Short description]

**Environment**: 
- OS: Windows 10/11
- App Version: 1.0.0
- Backend Version: 1.0.0

**Steps to Reproduce**:
1. Step one
2. Step two
3. Step three

**Expected Result**: What should happen

**Actual Result**: What actually happened

**Screenshots**: [Attach if applicable]

**Additional Info**: Any other relevant information
```

## Test Results Documentation

### Test Execution Log
- Date: [Test Date]
- Tester: [Name]
- Environment: [Test Environment]
- Overall Status: [Pass/Fail]

### Test Cases Results
| Test Case | Status | Notes |
|-----------|--------|-------|
| Login | ✅ Pass | - |
| Create Client | ✅ Pass | - |
| Generate PDF | ❌ Fail | PDF path issue |

### Issues Found
1. **High Priority**: List critical issues
2. **Medium Priority**: List important issues  
3. **Low Priority**: List minor issues

### Recommendations
- List improvements
- Performance optimizations
- UX enhancements
- Security considerations
