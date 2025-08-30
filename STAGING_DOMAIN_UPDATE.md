# 🚨 Staging Domain Update Notification

## 📢 Important Update: Staging Environment Domain Change

**Date:** December 2024  
**From:** Frontend Development Team  
**Subject:** Staging Domain Migration from `stage.myl.zip` to `zaido.org`

---

## 🔄 What Changed

The frontend staging environment has been migrated from:
- **Old Staging Domain**: `stage.myl.zip` (Hostgator)
- **New Staging Domain**: `zaido.org` (New hosting provider)

## 🎯 Impact on Backend Services

### **Current Backend Configuration**
The backend (`api.myl.zip`) currently has these domain references:

```javascript
// In src/routes/root.js
documentation: {
  human: 'https://api.myl.zip/docs',
  api: 'https://api.myl.zip/api/docs/openapi.json',
  swagger: 'https://api.myl.zip/api/docs/swagger',
},
endpoints: {
  health: 'https://api.myl.zip/health',
  // ... other endpoints
}
```

### **CORS Configuration**
Current CORS settings in `env.example`:
```bash
CORS_ORIGIN=chrome-extension://*,moz-extension://*,https://*.google.com,https://*.github.com,https://*.myl.zip,http://localhost:*,https://localhost:*
```

## 🔧 Required Backend Updates

### **1. CORS Configuration Update**
Add `zaido.org` to the trusted origins:

```bash
# Update env.example and production environment
CORS_ORIGIN=chrome-extension://*,moz-extension://*,https://*.google.com,https://*.github.com,https://*.myl.zip,https://*.zaido.org,http://localhost:*,https://localhost:*
```

### **2. Frontend Integration Points**
Update any hardcoded references to the old staging domain:

- **Chrome Extension**: Update background scripts to use `zaido.org` for staging
- **Google Drive Integration**: Update staging environment URLs
- **Documentation**: Update API documentation to reference new staging domain

### **3. Testing Environment**
Update test configurations to use the new staging domain:

```javascript
// Example test configuration update
const STAGING_URL = 'https://zaido.org';
const PRODUCTION_URL = 'https://myl.zip';
const API_URL = 'https://api.myl.zip';
```

## 📋 Checklist for Backend Team

### **Immediate Actions**
- [ ] Update CORS configuration to include `zaido.org`
- [ ] Review and update any hardcoded `stage.myl.zip` references
- [ ] Update test environment configurations
- [ ] Update API documentation references

### **Integration Points to Check**
- [ ] Chrome extension authentication flows
- [ ] Google Drive integration webhooks
- [ ] SSL certificate provisioning endpoints
- [ ] Device registration endpoints
- [ ] API key generation endpoints

### **Testing Requirements**
- [ ] Test CORS with new staging domain
- [ ] Verify authentication flows work with `zaido.org`
- [ ] Test API endpoints from staging environment
- [ ] Validate SSL certificate integration

## 🔗 New Domain Structure

```
Production Environment:
├── Frontend: https://myl.zip
├── API: https://api.myl.zip
└── Documentation: https://api.myl.zip/docs

Staging Environment:
├── Frontend: https://zaido.org
├── API: https://api.myl.zip (shared)
└── Documentation: https://api.myl.zip/docs (shared)
```

## 🚨 Important Notes

### **No Backend URL Changes**
- **API endpoint remains**: `https://api.myl.zip`
- **Backend deployment unchanged**: Still on Google Cloud Run
- **Database and services**: No changes required

### **Frontend-Only Migration**
- Only the frontend staging environment has moved
- Backend continues to serve both staging and production
- API authentication and device registration unchanged

## 🔄 Migration Timeline

- **Completed**: Frontend staging migration to `zaido.org`
- **In Progress**: Backend configuration updates
- **Next**: Integration testing with new staging domain
- **Future**: Monitor and optimize performance

## 📞 Support

### **For Questions**
- **Frontend Team**: Contact for staging environment details
- **Backend Team**: Contact for API integration questions
- **DevOps Team**: Contact for deployment and configuration

### **Emergency Rollback**
If issues arise with the new staging domain:
1. **Immediate**: Revert CORS changes if needed
2. **Investigation**: Check integration points
3. **Recovery**: Restore previous configuration
4. **Analysis**: Identify root cause

## 🎯 Next Steps

1. **Review this notification** with the backend team
2. **Update CORS configuration** to include `zaido.org`
3. **Test integration** with the new staging domain
4. **Update documentation** to reflect new staging URL
5. **Monitor performance** and error rates

---

**Remember**: This is a frontend-only migration. The backend API remains unchanged at `https://api.myl.zip`.

For immediate assistance, contact the frontend development team.
