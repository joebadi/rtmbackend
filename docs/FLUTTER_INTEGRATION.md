# Flutter App Integration Guide

**Date:** January 23, 2026  
**Backend API:** https://rtmadmin.e-clicks.net/api  
**Status:** Ready for Integration

---

## 🎯 Integration Strategy

### Phase 1: Authentication (START HERE) ⭐
**Why First?** Everything depends on auth. Once this works, all other features can follow.

**Steps:**
1. Update API base URL
2. Test login/register
3. Implement token storage
4. Test token refresh
5. Verify protected routes

**Estimated Time:** 2-3 hours

### Phase 2: Core Features
1. Profile Management
2. Matching System
3. Messaging
4. Premium Features

### Phase 3: Advanced Features
1. Notifications
2. Payments
3. Geolocation
4. Real-time updates

---

## 📁 Recommended Folder Structure

```
flutter_app/
├── lib/
│   ├── config/
│   │   └── api_config.dart          # API URLs and constants
│   ├── models/
│   │   ├── user.dart
│   │   ├── profile.dart
│   │   ├── match.dart
│   │   └── message.dart
│   ├── services/
│   │   ├── api_service.dart         # HTTP client wrapper
│   │   ├── auth_service.dart        # Authentication
│   │   ├── profile_service.dart
│   │   ├── match_service.dart
│   │   └── message_service.dart
│   ├── providers/                   # State management (if using Provider/Riverpod)
│   │   ├── auth_provider.dart
│   │   └── user_provider.dart
│   ├── screens/
│   │   ├── auth/
│   │   │   ├── login_screen.dart
│   │   │   └── register_screen.dart
│   │   ├── home/
│   │   ├── profile/
│   │   └── messages/
│   └── main.dart
```

---

## 🚀 Step-by-Step Integration

### STEP 1: Install Required Packages

Add to `pubspec.yaml`:

```yaml
dependencies:
  flutter:
    sdk: flutter
  
  # HTTP & API
  http: ^1.1.0
  dio: ^5.4.0  # Alternative to http, better for complex APIs
  
  # State Management
  provider: ^6.1.1  # or riverpod, bloc, getx
  
  # Storage
  shared_preferences: ^2.2.2
  flutter_secure_storage: ^9.0.0
  
  # JSON Serialization
  json_annotation: ^4.8.1
  
  # Socket.IO for real-time messaging
  socket_io_client: ^2.0.3
  
  # Image Handling
  image_picker: ^1.0.7
  cached_network_image: ^3.3.1
  
  # Location
  geolocator: ^11.0.0
  geocoding: ^2.1.1
  
  # Payments (add later)
  # flutter_paystack: ^1.0.7
  # pay: ^2.0.0  # For Google Pay

dev_dependencies:
  build_runner: ^2.4.8
  json_serializable: ^6.7.1
```

Run:
```bash
flutter pub get
```

---

### STEP 2: Create API Configuration

**File:** `lib/config/api_config.dart`

```dart
class ApiConfig {
  // Base URLs
  static const String baseUrl = 'https://rtmadmin.e-clicks.net/api';
  static const String socketUrl = 'https://rtmadmin.e-clicks.net';
  
  // API Endpoints
  static const String auth = '/auth';
  static const String users = '/users';
  static const String profiles = '/profiles';
  static const String matches = '/matches';
  static const String messages = '/messages';
  static const String payments = '/payments';
  
  // Full URLs
  static String get register => '$baseUrl$auth/register';
  static String get login => '$baseUrl$auth/login';
  static String get sendOtp => '$baseUrl$auth/send-otp';
  static String get verifyOtp => '$baseUrl$auth/verify-otp';
  static String get refreshToken => '$baseUrl$auth/refresh-token';
  static String get logout => '$baseUrl$auth/logout';
  
  // Timeouts
  static const Duration connectionTimeout = Duration(seconds: 30);
  static const Duration receiveTimeout = Duration(seconds: 30);
}
```

---

### STEP 3: Create API Service (HTTP Client Wrapper)

**File:** `lib/services/api_service.dart`

```dart
import 'dart:convert';
import 'dart:io';
import 'package:http/http.dart' as http;
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';

class ApiService {
  static final ApiService _instance = ApiService._internal();
  factory ApiService() => _instance;
  ApiService._internal();

  final _storage = const FlutterSecureStorage();
  
  // Get stored token
  Future<String?> getToken() async {
    return await _storage.read(key: 'access_token');
  }
  
  // Save token
  Future<void> saveToken(String token) async {
    await _storage.write(key: 'access_token', value: token);
  }
  
  // Save refresh token
  Future<void> saveRefreshToken(String token) async {
    await _storage.write(key: 'refresh_token', value: token);
  }
  
  // Get refresh token
  Future<String?> getRefreshToken() async {
    return await _storage.read(key: 'refresh_token');
  }
  
  // Clear tokens
  Future<void> clearTokens() async {
    await _storage.delete(key: 'access_token');
    await _storage.delete(key: 'refresh_token');
  }
  
  // Get headers
  Future<Map<String, String>> _getHeaders({bool includeAuth = true}) async {
    final headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    
    if (includeAuth) {
      final token = await getToken();
      if (token != null) {
        headers['Authorization'] = 'Bearer $token';
      }
    }
    
    return headers;
  }
  
  // GET request
  Future<Map<String, dynamic>> get(String url, {bool requiresAuth = true}) async {
    try {
      final headers = await _getHeaders(includeAuth: requiresAuth);
      final response = await http.get(
        Uri.parse(url),
        headers: headers,
      ).timeout(ApiConfig.connectionTimeout);
      
      return _handleResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  // POST request
  Future<Map<String, dynamic>> post(
    String url,
    Map<String, dynamic> body, {
    bool requiresAuth = false,
  }) async {
    try {
      final headers = await _getHeaders(includeAuth: requiresAuth);
      final response = await http.post(
        Uri.parse(url),
        headers: headers,
        body: jsonEncode(body),
      ).timeout(ApiConfig.connectionTimeout);
      
      return _handleResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  // PUT request
  Future<Map<String, dynamic>> put(
    String url,
    Map<String, dynamic> body, {
    bool requiresAuth = true,
  }) async {
    try {
      final headers = await _getHeaders(includeAuth: requiresAuth);
      final response = await http.put(
        Uri.parse(url),
        headers: headers,
        body: jsonEncode(body),
      ).timeout(ApiConfig.connectionTimeout);
      
      return _handleResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  // DELETE request
  Future<Map<String, dynamic>> delete(String url, {bool requiresAuth = true}) async {
    try {
      final headers = await _getHeaders(includeAuth: requiresAuth);
      final response = await http.delete(
        Uri.parse(url),
        headers: headers,
      ).timeout(ApiConfig.connectionTimeout);
      
      return _handleResponse(response);
    } catch (e) {
      throw _handleError(e);
    }
  }
  
  // Handle response
  Map<String, dynamic> _handleResponse(http.Response response) {
    final data = jsonDecode(response.body);
    
    if (response.statusCode >= 200 && response.statusCode < 300) {
      return data;
    } else if (response.statusCode == 401) {
      // Token expired - trigger refresh
      throw UnauthorizedException(data['message'] ?? 'Unauthorized');
    } else {
      throw ApiException(
        data['message'] ?? 'An error occurred',
        response.statusCode,
      );
    }
  }
  
  // Handle errors
  Exception _handleError(dynamic error) {
    if (error is SocketException) {
      return NetworkException('No internet connection');
    } else if (error is HttpException) {
      return NetworkException('Network error occurred');
    } else if (error is FormatException) {
      return ApiException('Invalid response format', 500);
    } else if (error is UnauthorizedException || error is ApiException) {
      return error;
    } else {
      return ApiException('An unexpected error occurred: $error', 500);
    }
  }
}

// Custom Exceptions
class ApiException implements Exception {
  final String message;
  final int statusCode;
  
  ApiException(this.message, this.statusCode);
  
  @override
  String toString() => message;
}

class UnauthorizedException implements Exception {
  final String message;
  
  UnauthorizedException(this.message);
  
  @override
  String toString() => message;
}

class NetworkException implements Exception {
  final String message;
  
  NetworkException(this.message);
  
  @override
  String toString() => message;
}
```

---

### STEP 4: Create Auth Service

**File:** `lib/services/auth_service.dart`

```dart
import '../config/api_config.dart';
import 'api_service.dart';

class AuthService {
  final ApiService _api = ApiService();
  
  // Register
  Future<Map<String, dynamic>> register({
    required String firstName,
    required String lastName,
    required String email,
    required String password,
    required String phoneNumber,
    String? dateOfBirth, // Optional: Format 'YYYY-MM-DD'
    String? gender, // Optional: 'MALE' or 'FEMALE'
  }) async {
    final body = {
      'firstName': firstName,
      'lastName': lastName,
      'email': email,
      'password': password,
      'phoneNumber': phoneNumber,
    };
    
    // Add optional fields if provided
    if (dateOfBirth != null) body['dateOfBirth'] = dateOfBirth;
    if (gender != null) body['gender'] = gender;
    
    final response = await _api.post(
      ApiConfig.register,
      body,
    );
    
    // Save tokens
    if (response['data']?['tokens'] != null) {
      await _api.saveToken(response['data']['tokens']['accessToken']);
      await _api.saveRefreshToken(response['data']['tokens']['refreshToken']);
    }
    
    return response;
  }
  
  // Login
  Future<Map<String, dynamic>> login({
    required String email,
    required String password,
  }) async {
    final response = await _api.post(
      ApiConfig.login,
      {
        'email': email,
        'password': password,
      },
    );
    
    // Save tokens
    if (response['data']?['tokens'] != null) {
      await _api.saveToken(response['data']['tokens']['accessToken']);
      await _api.saveRefreshToken(response['data']['tokens']['refreshToken']);
    }
    
    return response;
  }
  
  // Send OTP
  Future<Map<String, dynamic>> sendOtp({
    required String phoneNumber,
  }) async {
    return await _api.post(
      ApiConfig.sendOtp,
      {'phoneNumber': phoneNumber},
    );
  }
  
  // Verify OTP
  Future<Map<String, dynamic>> verifyOtp({
    required String phoneNumber,
    required String otp,
  }) async {
    final response = await _api.post(
      ApiConfig.verifyOtp,
      {
        'phoneNumber': phoneNumber,
        'otp': otp,
      },
    );
    
    // Save tokens if provided
    if (response['data']?['tokens'] != null) {
      await _api.saveToken(response['data']['tokens']['accessToken']);
      await _api.saveRefreshToken(response['data']['tokens']['refreshToken']);
    }
    
    return response;
  }
  
  // Refresh Token
  Future<Map<String, dynamic>> refreshToken() async {
    final refreshToken = await _api.getRefreshToken();
    
    if (refreshToken == null) {
      throw UnauthorizedException('No refresh token available');
    }
    
    final response = await _api.post(
      ApiConfig.refreshToken,
      {'refreshToken': refreshToken},
    );
    
    // Save new tokens
    if (response['data']?['accessToken'] != null) {
      await _api.saveToken(response['data']['accessToken']);
    }
    
    return response;
  }
  
  // Logout
  Future<void> logout() async {
    try {
      await _api.post(ApiConfig.logout, {}, requiresAuth: true);
    } finally {
      await _api.clearTokens();
    }
  }
  
  // Check if logged in
  Future<bool> isLoggedIn() async {
    final token = await _api.getToken();
    return token != null;
  }
}
```

---

### STEP 5: Test Authentication

**File:** `lib/screens/auth/login_screen.dart` (Simple Test)

```dart
import 'package:flutter/material.dart';
import '../../services/auth_service.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({Key? key}) : super(key: key);

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _authService = AuthService();
  bool _isLoading = false;

  Future<void> _login() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isLoading = true);

    try {
      final response = await _authService.login(
        email: _emailController.text.trim(),
        password: _passwordController.text,
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Login successful!')),
        );
        
        // Navigate to home screen
        // Navigator.pushReplacementNamed(context, '/home');
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Login failed: $e')),
        );
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Login')),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Form(
          key: _formKey,
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              TextFormField(
                controller: _emailController,
                decoration: const InputDecoration(
                  labelText: 'Email',
                  border: OutlineInputBorder(),
                ),
                keyboardType: TextInputType.emailAddress,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your email';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              TextFormField(
                controller: _passwordController,
                decoration: const InputDecoration(
                  labelText: 'Password',
                  border: OutlineInputBorder(),
                ),
                obscureText: true,
                validator: (value) {
                  if (value == null || value.isEmpty) {
                    return 'Please enter your password';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 24),
              SizedBox(
                width: double.infinity,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _login,
                  child: _isLoading
                      ? const CircularProgressIndicator()
                      : const Text('Login'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  @override
  void dispose() {
    _emailController.dispose();
    _passwordController.dispose();
    super.dispose();
  }
}
```

---

## 🧪 Testing Checklist

### Phase 1: Authentication Testing

- [ ] **Register New User**
  - Endpoint: `POST /api/auth/register`
  - Required fields: firstName, lastName, email, password, phoneNumber
  - Optional fields: dateOfBirth (YYYY-MM-DD), gender (MALE/FEMALE)
  - Expected: User created with profile, tokens returned

- [ ] **Login**
  - Endpoint: `POST /api/auth/login`
  - Test with: email, password
  - Expected: Tokens returned

- [ ] **Send OTP**
  - Endpoint: `POST /api/auth/send-otp`
  - Test with: phoneNumber
  - Expected: OTP sent (check logs)

- [ ] **Verify OTP**
  - Endpoint: `POST /api/auth/verify-otp`
  - Test with: phoneNumber, otp
  - Expected: Phone verified

- [ ] **Refresh Token**
  - Endpoint: `POST /api/auth/refresh-token`
  - Test with: refreshToken
  - Expected: New accessToken

- [ ] **Logout**
  - Endpoint: `POST /api/auth/logout`
  - Test with: Bearer token
  - Expected: Success

---

## 📋 Available API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `POST /api/auth/send-otp` - Send OTP
- `POST /api/auth/verify-otp` - Verify OTP
- `POST /api/auth/refresh-token` - Refresh access token
- `POST /api/auth/logout` - Logout
- `POST /api/auth/forgot-password` - Request password reset
- `POST /api/auth/reset-password` - Reset password

### Profile
- `GET /api/profiles/me` - Get my profile
- `PUT /api/profiles/me` - Update my profile
- `POST /api/profiles/photos` - Upload photo
- `DELETE /api/profiles/photos/:photoId` - Delete photo
- `PUT /api/profiles/preferences` - Update match preferences

### Matching
- `GET /api/matches/explore` - Get potential matches
- `POST /api/matches/like/:userId` - Like a user
- `POST /api/matches/pass/:userId` - Pass on a user
- `GET /api/matches` - Get my matches
- `POST /api/matches/unmatch/:matchId` - Unmatch

### Messages
- `GET /api/messages/conversations` - Get all conversations
- `GET /api/messages/:conversationId` - Get messages in conversation
- `POST /api/messages` - Send message
- `PUT /api/messages/:messageId/read` - Mark as read

### Payments
- `POST /api/payments/initialize` - Initialize payment
- `POST /api/payments/verify` - Verify payment
- `GET /api/payments/transactions` - Get my transactions

---

## 🔧 Troubleshooting

### Common Issues

**1. Network Error / Connection Refused**
```dart
// Check if backend is running
// Verify URL: https://rtmadmin.e-clicks.net/api
// Test in browser: https://rtmadmin.e-clicks.net/api/health
```

**2. 401 Unauthorized**
```dart
// Token expired - implement auto-refresh
// Or token not being sent - check headers
```

**3. CORS Error** (if testing on web)
```dart
// Backend already configured for CORS
// Should work fine
```

**4. SSL Certificate Error**
```dart
// Production uses Let's Encrypt SSL
// Should work fine
```

---

## 📞 Next Steps After Auth Works

1. **Profile Management** - Create/update user profiles
2. **Photo Upload** - Implement image picker and upload
3. **Matching System** - Swipe UI and match logic
4. **Real-time Messaging** - Socket.IO integration
5. **Push Notifications** - Firebase Cloud Messaging
6. **Payments** - Paystack/PayPal integration

---

## 💡 Pro Tips

1. **Use Dio instead of HTTP** for better error handling and interceptors
2. **Implement Token Refresh Interceptor** to auto-refresh expired tokens
3. **Use Provider/Riverpod** for state management
4. **Test on Real Device** for location and camera features
5. **Enable Logging** during development to see API requests/responses

---

## 🎯 START HERE: Quick Test

1. Install packages: `flutter pub get`
2. Create `api_config.dart` with base URL
3. Create `api_service.dart` for HTTP client
4. Create `auth_service.dart` for authentication
5. Create simple login screen
6. Test login with existing user or register new one
7. Check if token is saved and can make authenticated requests

**Test User (if needed):**
- Email: test@example.com
- Password: Test@123

---

**Ready to start?** Begin with authentication, then we'll move to the next features step by step! 🚀
