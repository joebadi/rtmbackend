# 🔄 Seamless Development Workflow: Backend + Flutter

## 📁 Recommended Workspace Setup

### Option 1: VS Code Multi-Root Workspace (RECOMMENDED)

Create a workspace file that includes both projects:

**File:** `rtm-dating-app.code-workspace`

```json
{
  "folders": [
    {
      "name": "Backend API",
      "path": "/home/joeey/rtmadmin.e-clicks.net/backend"
    },
    {
      "name": "Admin Dashboard",
      "path": "/home/joeey/rtmadmin.e-clicks.net/admin"
    },
    {
      "name": "Flutter App",
      "path": "/path/to/your/flutter/app"
    }
  ],
  "settings": {
    "files.exclude": {
      "**/node_modules": true,
      "**/.next": true,
      "**/build": true,
      "**/.dart_tool": true
    }
  }
}
```

**Benefits:**
- See all 3 projects in one window
- Easy file switching
- Integrated terminal for each project
- Git operations across projects

---

### Option 2: Separate Windows with Sync

**Terminal 1 (Backend):**
```bash
cd /home/joeey/rtmadmin.e-clicks.net/backend
code .
```

**Terminal 2 (Flutter):**
```bash
cd /path/to/flutter/app
code .
```

---

## 🔄 Development Workflow

### Daily Workflow

```bash
# Morning Setup (5 minutes)
# ========================

# 1. Check backend status
pm2 status

# 2. Check logs for any overnight errors
pm2 logs rtm-backend --lines 20
pm2 logs rtm-admin --lines 20

# 3. Pull latest changes (if working with team)
cd /home/joeey/rtmadmin.e-clicks.net
git pull

# 4. Start Flutter app
cd /path/to/flutter/app
flutter run
```

---

### When Adding New API Endpoint

**Step 1: Backend** (10-15 min)
```bash
cd /home/joeey/rtmadmin.e-clicks.net/backend

# 1. Create/update route
nano src/routes/your.routes.ts

# 2. Create/update controller
nano src/controllers/your.controller.ts

# 3. Create/update service (if needed)
nano src/services/your.service.ts

# 4. Test locally
npm run dev

# 5. Build and restart
npm run build
pm2 restart rtm-backend
pm2 save

# 6. Test endpoint
curl -X POST https://rtmadmin.e-clicks.net/api/your/endpoint \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

**Step 2: Flutter** (10-15 min)
```dart
// 1. Add endpoint to api_config.dart
static String get yourEndpoint => '$baseUrl/your/endpoint';

// 2. Add method to service
Future<Map<String, dynamic>> yourMethod() async {
  return await _api.post(ApiConfig.yourEndpoint, {...});
}

// 3. Use in UI
final result = await yourService.yourMethod();

// 4. Test
flutter run
```

---

## 🧪 Testing Workflow

### Test New Feature End-to-End

```bash
# 1. Test Backend Endpoint
curl -X POST https://rtmadmin.e-clicks.net/api/your/endpoint \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'

# 2. Check Backend Logs
pm2 logs rtm-backend --lines 50

# 3. Test in Flutter
flutter run
# Then test the feature in app

# 4. Check Flutter Logs
# Look at console output in VS Code or terminal
```

---

## 📝 Code Changes Checklist

### When You Change Backend API

- [ ] Update route file
- [ ] Update controller
- [ ] Update service (if needed)
- [ ] Update Prisma schema (if database changes)
- [ ] Run migrations (if database changes)
- [ ] Build backend: `npm run build`
- [ ] Restart PM2: `pm2 restart rtm-backend`
- [ ] Test endpoint with curl/Postman
- [ ] Update Flutter service
- [ ] Test in Flutter app

### When You Change Flutter App

- [ ] Update models (if API response changed)
- [ ] Update services
- [ ] Update UI
- [ ] Test on emulator
- [ ] Test on real device
- [ ] Check for errors in console

---

## 🔍 Debugging Workflow

### Backend Issues

```bash
# 1. Check if backend is running
pm2 status

# 2. Check logs
pm2 logs rtm-backend --lines 100

# 3. Check specific errors
pm2 logs rtm-backend --err

# 4. Restart if needed
pm2 restart rtm-backend

# 5. Check database connection
cd /home/joeey/rtmadmin.e-clicks.net/backend
npx prisma studio
```

### Flutter Issues

```dart
// 1. Enable detailed logging
import 'package:http/http.dart' as http;

// Add logging interceptor
print('Request: ${request.url}');
print('Headers: ${request.headers}');
print('Body: ${request.body}');
print('Response: ${response.statusCode}');
print('Response Body: ${response.body}');

// 2. Check network connectivity
// 3. Verify API URL is correct
// 4. Check if token is being sent
// 5. Test endpoint with curl first
```

---

## 🚀 Deployment Workflow

### Deploy Backend Changes

```bash
cd /home/joeey/rtmadmin.e-clicks.net/backend

# 1. Test locally
npm run dev

# 2. Build
npm run build

# 3. Restart
pm2 restart rtm-backend

# 4. Save PM2 state
pm2 save

# 5. Verify
curl https://rtmadmin.e-clicks.net/api/health

# 6. Check logs
pm2 logs rtm-backend --lines 20
```

### Deploy Flutter App

```bash
cd /path/to/flutter/app

# For Android
flutter build apk --release
# APK at: build/app/outputs/flutter-apk/app-release.apk

# For iOS
flutter build ios --release
# Then open in Xcode and archive

# For Testing
flutter build apk --debug
adb install build/app/outputs/flutter-apk/app-debug.apk
```

---

## 📊 Monitoring Both Systems

### Real-time Monitoring

**Terminal 1: Backend Logs**
```bash
pm2 logs rtm-backend --lines 0
```

**Terminal 2: Flutter App**
```bash
flutter run
```

**Terminal 3: Database**
```bash
cd /home/joeey/rtmadmin.e-clicks.net/backend
npx prisma studio
# Opens at http://localhost:5555
```

---

## 🔧 Common Tasks

### Add New Model/Table

**Backend:**
```bash
cd /home/joeey/rtmadmin.e-clicks.net/backend

# 1. Update schema
nano prisma/schema.prisma

# 2. Create migration
npx prisma migrate dev --name add_your_model

# 3. Generate Prisma client
npx prisma generate

# 4. Restart backend
pm2 restart rtm-backend
```

**Flutter:**
```dart
// Create corresponding model class
class YourModel {
  final String id;
  final String name;
  
  YourModel({required this.id, required this.name});
  
  factory YourModel.fromJson(Map<String, dynamic> json) {
    return YourModel(
      id: json['id'],
      name: json['name'],
    );
  }
}
```

### Add New API Endpoint

**Backend:**
```typescript
// 1. Route (src/routes/your.routes.ts)
router.post('/endpoint', authenticate, yourController.method);

// 2. Controller (src/controllers/your.controller.ts)
export const method = async (req: Request, res: Response) => {
  // Implementation
};

// 3. Restart
pm2 restart rtm-backend
```

**Flutter:**
```dart
// 1. Config (lib/config/api_config.dart)
static String get yourEndpoint => '$baseUrl/your/endpoint';

// 2. Service (lib/services/your_service.dart)
Future<Map<String, dynamic>> yourMethod() async {
  return await _api.post(ApiConfig.yourEndpoint, data);
}

// 3. Use in UI
final result = await yourService.yourMethod();
```

---

## 💡 Pro Tips

### 1. Use Git Branches

```bash
# Backend
cd /home/joeey/rtmadmin.e-clicks.net
git checkout -b feature/new-endpoint
# Make changes
git add .
git commit -m "Add new endpoint"
git push origin feature/new-endpoint

# Flutter
cd /path/to/flutter/app
git checkout -b feature/new-screen
# Make changes
git add .
git commit -m "Add new screen"
git push origin feature/new-screen
```

### 2. Keep API Documentation Updated

Create a simple API doc file:
```markdown
# API Endpoints

## Authentication
- POST /api/auth/login - Login user
- POST /api/auth/register - Register user

## Profiles
- GET /api/profiles/me - Get my profile
- PUT /api/profiles/me - Update my profile

... etc
```

### 3. Use Environment Variables

**Backend (.env):**
```env
NODE_ENV=production
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret
```

**Flutter (lib/config/env.dart):**
```dart
class Env {
  static const String apiUrl = String.fromEnvironment(
    'API_URL',
    defaultValue: 'https://rtmadmin.e-clicks.net/api',
  );
}
```

### 4. Automate Common Tasks

Create shell scripts:

**backend-restart.sh:**
```bash
#!/bin/bash
cd /home/joeey/rtmadmin.e-clicks.net/backend
npm run build
pm2 restart rtm-backend
pm2 save
pm2 logs rtm-backend --lines 20
```

**flutter-test.sh:**
```bash
#!/bin/bash
cd /path/to/flutter/app
flutter clean
flutter pub get
flutter run
```

---

## 📱 Mobile Development Tips

### Testing on Real Device

```bash
# Android
flutter run -d <device-id>

# iOS
flutter run -d <device-id>

# List devices
flutter devices
```

### Hot Reload vs Hot Restart

- **Hot Reload (r):** Quick UI changes
- **Hot Restart (R):** State changes, new dependencies
- **Full Restart:** Major changes, native code

### Debugging Network Issues

```dart
// Add this to see all HTTP requests
import 'package:http/http.dart' as http;

class LoggingClient extends http.BaseClient {
  final http.Client _inner = http.Client();

  @override
  Future<http.StreamedResponse> send(http.BaseRequest request) async {
    print('${request.method} ${request.url}');
    print('Headers: ${request.headers}');
    return _inner.send(request);
  }
}
```

---

## ✅ Daily Checklist

### Morning
- [ ] Check PM2 status
- [ ] Check backend logs
- [ ] Pull latest changes
- [ ] Start Flutter app

### Before Committing
- [ ] Test backend endpoints
- [ ] Test Flutter features
- [ ] Check for console errors
- [ ] Run `flutter analyze`
- [ ] Commit with clear message

### End of Day
- [ ] Push changes to Git
- [ ] Document new endpoints
- [ ] Update TODO list
- [ ] Check PM2 is running

---

**Happy Coding! 🚀**
