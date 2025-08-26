# Google Secret Manager Setup Guide

This guide explains how to use Google Secret Manager for secure key management in the Myl.Zip backend service.

## Why Use Secret Manager?

Instead of storing sensitive environment variables directly in Cloud Run, we use Google Secret Manager to:

- **Secure Storage**: Secrets are encrypted at rest and in transit
- **Access Control**: Fine-grained IAM permissions for secret access
- **Audit Logging**: Track who accessed what secrets when
- **Versioning**: Keep track of secret changes over time
- **Rotation**: Easy secret rotation without code changes

## Quick Start

### 1. Check Existing Secrets

Your project already has secrets stored in Google Secret Manager. Check what's available:

```powershell
.\scripts\setup-secrets.ps1 -Action check
```

The existing secrets are:
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `INTERNAL_API_KEY` - API key for service communication
- `DATABASE_URL` - Database connection string
- `REDIS_PASSWORD` - Redis password

### 2. Update Database URL (if needed)

**IMPORTANT**: Update the database URL with your actual connection string if needed:

```powershell
.\scripts\setup-secrets.ps1 -Action update -SecretName "DATABASE_URL" -SecretValue "postgresql://username:password@host:port/database"
```

### 3. Deploy with Secret Manager

Deploy the service using the integrated deployment script:

```powershell
.\scripts\deploy-with-secrets.ps1
```

## Secret Manager Commands

### List All Secrets

```powershell
.\scripts\setup-secrets.ps1 -Action list
```

### Get Secret Value

```powershell
.\scripts\setup-secrets.ps1 -Action get -SecretName "JWT_SECRET"
```

### Update Secret Value

```powershell
.\scripts\setup-secrets.ps1 -Action update -SecretName "JWT_SECRET" -SecretValue "new-secret-value"
```

### Grant Access to Service Account

```powershell
.\scripts\setup-secrets.ps1 -Action grant-access -ServiceAccount "zip-myl-backend@zip-myl-backend.iam.gserviceaccount.com"
```

### Delete Secret

```powershell
.\scripts\setup-secrets.ps1 -Action delete -SecretName "JWT_SECRET"
```

## How It Works

### 1. Secret Storage

Secrets are stored in Google Secret Manager with the following names:
- `JWT_SECRET` - JWT signing secret
- `JWT_REFRESH_SECRET` - JWT refresh token secret
- `INTERNAL_API_KEY` - API key for service communication
- `DATABASE_URL` - Database connection string
- `REDIS_PASSWORD` - Redis password

### 2. Cloud Run Integration

The deployment script uses `--set-secrets` to map secrets to environment variables:

```bash
--set-secrets="JWT_SECRET=JWT_SECRET:latest"
--set-secrets="JWT_REFRESH_SECRET=JWT_REFRESH_SECRET:latest"
--set-secrets="SERVICE_API_KEY=INTERNAL_API_KEY:latest"
--set-secrets="DATABASE_URL=DATABASE_URL:latest"
--set-secrets="REDIS_PASSWORD=REDIS_PASSWORD:latest"
```

### 3. Service Account Access

The Cloud Run service account needs the `roles/secretmanager.secretAccessor` role to access secrets.

### 4. Backend Integration

The backend service includes a `SecretManagerService` that can retrieve secrets programmatically if needed.

## Security Best Practices

### 1. Least Privilege Access

Only grant secret access to the specific service accounts that need it:

```powershell
.\scripts\setup-secrets.ps1 -Action grant-access -ServiceAccount "your-service@project.iam.gserviceaccount.com"
```

### 2. Regular Secret Rotation

Rotate secrets regularly, especially JWT secrets and encryption keys:

```powershell
# Generate new JWT secret
$newJwtSecret = [System.Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(64))
.\scripts\setup-secrets.ps1 -Action update -SecretName "JWT_SECRET" -SecretValue $newJwtSecret
```

### 3. Monitor Secret Access

Enable audit logging to monitor who accesses secrets:

```bash
gcloud logging read "resource.type=secretmanager.googleapis.com/Secret" --limit=50
```

### 4. Use Secret Versions

Always use `:latest` version in Cloud Run deployments to get the most recent secret value.

## Troubleshooting

### Secret Not Found

If you get "Secret not found" errors:

1. Check if the secret exists:
   ```powershell
   .\scripts\setup-secrets.ps1 -Action list
   ```

2. Check what secrets are available:
   ```powershell
   .\scripts\setup-secrets.ps1 -Action check
   ```

### Access Denied

If you get access denied errors:

1. Check service account permissions:
   ```bash
   gcloud projects get-iam-policy zip-myl-backend --flatten="bindings[].members" --format="table(bindings.role)" --filter="bindings.members:zip-myl-backend@zip-myl-backend.iam.gserviceaccount.com"
   ```

2. Grant secret access:
   ```powershell
   .\scripts\setup-secrets.ps1 -Action grant-access -ServiceAccount "zip-myl-backend@zip-myl-backend.iam.gserviceaccount.com"
   ```

### Deployment Issues

If deployment fails:

1. Check if Secret Manager API is enabled:
   ```bash
   gcloud services list --enabled --filter="name:secretmanager.googleapis.com"
   ```

2. Enable the API if needed:
   ```bash
   gcloud services enable secretmanager.googleapis.com
   ```

## Environment Variables vs Secrets

### Environment Variables (Not Recommended for Production)
```bash
--set-env-vars="JWT_SECRET=your-secret-here"
```

### Secret Manager (Recommended)
```bash
--set-secrets="JWT_SECRET=JWT_SECRET:latest"
```

## Migration from Environment Variables

If you're migrating from environment variables to Secret Manager:

1. Create secrets in Secret Manager
2. Update deployment script to use `--set-secrets` instead of `--set-env-vars`
3. Remove sensitive environment variables from your deployment configuration
4. Test the deployment to ensure secrets are accessible

## Cost Considerations

Google Secret Manager pricing:
- **Secret versions**: $0.06 per 10,000 operations
- **Secret storage**: $0.06 per 10,000 secrets per month

For most applications, the cost is minimal compared to the security benefits.

## Next Steps

1. **Set up monitoring**: Monitor secret access and rotation
2. **Implement rotation**: Set up automated secret rotation
3. **Backup strategy**: Ensure secrets are backed up
4. **Documentation**: Document secret management procedures for your team

## Support

For issues with Secret Manager setup:

1. Check the [Google Cloud Secret Manager documentation](https://cloud.google.com/secret-manager/docs)
2. Review the deployment logs in Cloud Run
3. Check IAM permissions for your service account
4. Verify that the Secret Manager API is enabled
