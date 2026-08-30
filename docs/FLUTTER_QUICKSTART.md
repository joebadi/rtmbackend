# 🚀 Quick Start: Flutter Integration

## 📍 You Are Here
✅ Backend API: **LIVE** at `https://rtmadmin.e-clicks.net/api`  
✅ Admin Dashboard: **COMPLETE** (7 pages)  
🔄 Flutter App: **READY TO CONNECT**

---

## 🎯 START HERE (5 Minutes)

### 1. Update Your Flutter App's API URL

**File:** `lib/config/api_config.dart` (or wherever you store config)

```dart
class ApiConfig {
  static const String baseUrl = 'https://rtmadmin.e-clicks.net/api';
  static const String socketUrl = 'https://rtmadmin.e-clicks.net';
}
```

### 2. Test Connection (Quick Test)

```dart
import 'package:http/http.dart' as http;

// Test if backend is reachable
Future<void> testConnection() async {
  try {
    final response = await http.get(
      Uri.parse('https://rtmadmin.e-clicks.net/api/health'),
    );
    print('Backend Status: ${response.statusCode}');
    print('Response: ${response.body}');
  } catch (e) {
    print('Error: $e');
  }
}
```

### 3. Test Login (Real Test)

```dart
import 'dart:convert';
import 'package:http/http.dart' as http;

Future<void> testLogin() async {
  try {
    final response = await http.post(
      Uri.parse('https://rtmadmin.e-clicks.net/api/auth/login'),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'email': 'test@example.com',  // Use a real user
        'password': 'YourPassword123',
      }),
    );
    
    print('Status: ${response.statusCode}');
    print('Response: ${response.body}');
    
    if (response.statusCode == 200) {
      final data = jsonDecode(response.body);
      final token = data['data']['tokens']['accessToken'];
      print('✅ Login successful! Token: ${token.substring(0, 20)}...');
    }
  } catch (e) {
    print('❌ Error: $e');
  }
}
```

---

## 📚 Integration Order (Recommended)

### Phase 1: Authentication (START HERE) ⭐
**Time:** 2-3 hours  
**Why First:** Everything depends on auth

**Endpoints to implement:**
1. ✅ `POST /api/auth/register` - Register new user
2. ✅ `POST /api/auth/login` - Login
3. ✅ `POST /api/auth/send-otp` - Send OTP for phone verification
4. ✅ `POST /api/auth/verify-otp` - Verify OTP
5. ✅ `POST /api/auth/refresh-token` - Refresh access token
6. ✅ `POST /api/auth/logout` - Logout

**What to build:**
- Login screen
- Register screen
- OTP verification screen
- Token storage (use `flutter_secure_storage`)
- Auto token refresh logic

---

### Phase 2: Profile Management
**Time:** 3-4 hours

**Endpoints:**
- `GET /api/profiles/me` - Get my profile
- `PUT /api/profiles/me` - Update profile
- `POST /api/profiles/photos` - Upload photo
- `DELETE /api/profiles/photos/:photoId` - Delete photo
- `PUT /api/profiles/preferences` - Update match preferences

**What to build:**
- Profile view screen
- Profile edit screen
- Photo upload (use `image_picker`)
- Match preferences screen

---

### Phase 3: Matching System
**Time:** 4-5 hours

**Endpoints:**
- `GET /api/matches/explore` - Get potential matches
- `POST /api/matches/like/:userId` - Like a user
- `POST /api/matches/pass/:userId` - Pass on a user
- `GET /api/matches` - Get my matches
- `POST /api/matches/unmatch/:matchId` - Unmatch

**What to build:**
- Swipe cards UI
- Match list screen
- Match details screen

---

### Phase 4: Messaging
**Time:** 5-6 hours

**Endpoints:**
- `GET /api/messages/conversations` - Get conversations
- `GET /api/messages/:conversationId` - Get messages
- `POST /api/messages` - Send message
- `PUT /api/messages/:messageId/read` - Mark as read

**Socket.IO Events:**
- `message:new` - New message received
- `message:read` - Message read
- `typing:start` - User typing
- `typing:stop` - User stopped typing

**What to build:**
- Conversations list
- Chat screen
- Real-time messaging (Socket.IO)
- Typing indicators

---

### Phase 5: Payments & Premium
**Time:** 3-4 hours

**Endpoints:**
- `POST /api/payments/initialize` - Initialize payment
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/transactions` - Get transactions

**What to build:**
- Premium plans screen
- Payment integration (Paystack/PayPal)
- Transaction history

---

### Phase 6: Notifications & Polish
**Time:** 2-3 hours

**What to build:**
- Push notifications (Firebase)
- Location services
- App polish and testing

---

## 🔧 Essential Packages

```yaml
dependencies:
  # HTTP & API
  http: ^1.1.0
  dio: ^5.4.0  # Better alternative
  
  # Storage
  flutter_secure_storage: ^9.0.0
  shared_preferences: ^2.2.2
  
  # State Management
  provider: ^6.1.1  # or riverpod
  
  # Real-time
  socket_io_client: ^2.0.3
  
  # Images
  image_picker: ^1.0.7
  cached_network_image: ^3.3.1
  
  # Location
  geolocator: ^11.0.0
  
  # Payments (add when needed)
  # flutter_paystack: ^1.0.7
```

---

## 🧪 Testing Your Integration

### 1. Test Backend is Running
```bash
curl https://rtmadmin.e-clicks.net/api/health
# Expected: {"status":"ok","timestamp":"..."}
```

### 2. Test Register
```bash
curl -X POST https://rtmadmin.e-clicks.net/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Test@123",
    "phoneNumber": "+2348012345678"
  }'
```

### 3. Test Login
```bash
curl -X POST https://rtmadmin.e-clicks.net/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "newuser@example.com",
    "password": "Test@123"
  }'
```

### 4. Test Protected Endpoint
```bash
curl https://rtmadmin.e-clicks.net/api/profiles/me \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

---

## 🆘 Common Issues & Solutions

### Issue 1: Connection Refused
**Solution:** Backend might be down. Check:
```bash
pm2 status
pm2 logs rtm-backend
```

### Issue 2: 401 Unauthorized
**Solution:** Token expired or invalid
- Implement token refresh logic
- Check if token is being sent in headers

### Issue 3: CORS Error (Web only)
**Solution:** Backend already configured for CORS. Should work fine.

### Issue 4: SSL Certificate Error
**Solution:** Production uses Let's Encrypt. Should work fine.

---

## 📞 Need Help?

1. **Check logs:**
   ```bash
   pm2 logs rtm-backend --lines 50
   ```

2. **Check API documentation:**
   - See `FLUTTER_INTEGRATION.md` for detailed guide
   - See `implementation_plan.md` for full project overview

3. **Test endpoints:**
   - Use Postman or curl to test endpoints
   - Check response format

---

## ✅ Success Checklist

- [ ] Backend is running (`pm2 status`)
- [ ] Can access API (`curl https://rtmadmin.e-clicks.net/api/health`)
- [ ] Flutter app can connect to backend
- [ ] Can register new user
- [ ] Can login
- [ ] Token is saved securely
- [ ] Can make authenticated requests
- [ ] Token refresh works

---

## 🎯 Your Next 30 Minutes

1. ✅ Read this file (5 min)
2. ✅ Update API URL in Flutter (2 min)
3. ✅ Test connection (5 min)
4. ✅ Test login/register (10 min)
5. ✅ Implement token storage (8 min)

**After that:** Move to full authentication implementation using `FLUTTER_INTEGRATION.md`

---

**Ready? Let's connect your Flutter app! 🚀**
