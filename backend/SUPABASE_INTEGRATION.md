# Supabase Integration with Service Key

This document explains how the backend is configured to use Supabase with the service role key for full admin access.

## Configuration

### Environment Variables

The following Supabase environment variables are configured in `backend/.env`:

```env
SUPABASE_URL="https://ryzwnbukdykmmpcirqlv.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5enduYnVrZHlrbW1wY2lycWx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2MjU5MDUsImV4cCI6MjA2NjIwMTkwNX0.J0IdBpy2TRatTSjuhESLq0StgOi6U26vcGJfl6FpQiY"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
SUPABASE_JWT_SECRET="your-jwt-secret"
```

### Supabase Clients

Two Supabase clients are available in `src/config/supabase.ts`:

#### 1. `supabaseAdmin` (Service Role Key)
- **Full admin access** - bypasses Row Level Security (RLS)
- Use for backend operations, admin tasks, and server-side data processing
- Configured with `SUPABASE_SERVICE_ROLE_KEY`

```typescript
import { supabaseAdmin } from '../config/supabase';

// Example: Query data with admin access
const { data, error } = await supabaseAdmin
  .from('users')
  .select('*');
```

#### 2. `supabaseClient` (Anon Key)
- **Respects RLS policies** - for user-level operations
- Use for operations that should respect security policies
- Configured with `SUPABASE_ANON_KEY`

```typescript
import { supabaseClient } from '../config/supabase';

// Example: Query data with RLS applied
const { data, error } = await supabaseClient
  .from('users')
  .select('*');
```

## Supabase Storage Integration

The storage service has been extended to support **Supabase Storage** using the service role key:

### Available Methods

#### Upload File to Supabase Storage
```typescript
import { storageService } from '../services/storage.service';

const result = await storageService.uploadFileToSupabase(
  buffer,           // File buffer
  'document.pdf',   // Filename
  'board-123',      // Board ID
  'node-456',       // Node ID
  'raw',           // Prefix: 'raw' | 'preview' | 'audio' | 'screenshot'
  'application/pdf' // Content type (optional)
);

console.log(result.key);  // Storage key
console.log(result.url);  // Public URL
console.log(result.size); // File size
```

#### Download File from Supabase Storage
```typescript
const buffer = await storageService.downloadFileFromSupabase('boards/123/raw/456/file.pdf');
```

#### Delete File from Supabase Storage
```typescript
await storageService.deleteFileFromSupabase('boards/123/raw/456/file.pdf');
```

#### Get Signed URL (Temporary Access)
```typescript
const signedUrl = await storageService.getSupabaseSignedUrl(
  'boards/123/raw/456/file.pdf',
  3600  // Expires in 1 hour
);
```

#### Upload Base64 Data
```typescript
const result = await storageService.uploadBase64ToSupabase(
  base64String,
  'image.png',
  'board-123',
  'node-456',
  'preview',
  'image/png'
);
```

## Storage Bucket

The default Supabase Storage bucket is configured as:
```typescript
export const SUPABASE_BUCKET = 'bizwiz-neuroboard';
```

**Make sure this bucket exists in your Supabase project!**

### Creating the Bucket

1. Go to your Supabase Dashboard
2. Navigate to **Storage**
3. Create a new bucket named `bizwiz-neuroboard`
4. Configure bucket policies as needed

## Usage in Controllers/Services

### Example: Using Supabase Admin for Database Operations
```typescript
import { supabaseAdmin } from '../config/supabase';

export class MyService {
  async getAllUsers() {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*');
    
    if (error) throw error;
    return data;
  }

  async createUser(userData: any) {
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert(userData)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
}
```

### Example: Using Supabase Storage in Controllers
```typescript
import { storageService } from '../services/storage.service';

export class FileController {
  async uploadFile(req: Request, res: Response) {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const result = await storageService.uploadFileToSupabase(
      file.buffer,
      file.originalname,
      req.params.boardId,
      req.params.nodeId,
      'raw',
      file.mimetype
    );

    return res.json(result);
  }
}
```

## Key Benefits

1. **Full Admin Access**: Service role key bypasses all RLS policies
2. **Direct Database Access**: Query and modify data without restrictions
3. **Storage Management**: Upload, download, and delete files with full permissions
4. **Authentication Control**: Manage users and authentication
5. **Security**: Service key is only used on the backend, never exposed to clients

## Security Notes

⚠️ **IMPORTANT**: 
- Never expose the `SUPABASE_SERVICE_ROLE_KEY` to the frontend
- Keep it secure in environment variables
- Use the anon key (`SUPABASE_ANON_KEY`) for client-side operations
- The service role key grants full access to your database and storage

## Migration from MinIO/S3

The storage service maintains backward compatibility:
- Original S3 methods still work: `uploadFile()`, `downloadFile()`, `deleteFile()`
- New Supabase methods: `uploadFileToSupabase()`, `downloadFileFromSupabase()`, etc.
- Choose which storage backend to use based on your needs

## Next Steps

1. ✅ Supabase SDK installed
2. ✅ Environment variables configured
3. ✅ Service role client created
4. ✅ Storage service extended
5. 📝 Create `bizwiz-neuroboard` bucket in Supabase Storage
6. 📝 Update controllers to use Supabase methods
7. 📝 Configure RLS policies if needed
8. 📝 Test the integration

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
