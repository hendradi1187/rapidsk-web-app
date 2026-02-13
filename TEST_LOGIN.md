# How to Test Login (Once Backend is Fixed)

## Quick Test Steps

1. **Open Browser:**
   ```
   http://localhost:8283/login
   ```

2. **Enter Credentials:**
   - Username: `superadmin`
   - Password: `SuperAdmin123!`

3. **Click "Sign in"**

4. **Expected Result:**
   - ✅ Loading spinner appears
   - ✅ Success toast: "Welcome back!"
   - ✅ Redirect to dashboard
   - ✅ Token saved in localStorage
   - ✅ User menu shows "Super Admin"

---

## Test Scenarios

### ✅ Scenario 1: Successful Login
**Steps:**
1. Go to `/login`
2. Enter: `superadmin` / `SuperAdmin123!`
3. Click "Sign in"

**Expected:**
- Success message
- Redirect to `/`
- Token in localStorage
- Can access all pages

---

### ✅ Scenario 2: Invalid Password
**Steps:**
1. Go to `/login`
2. Enter: `superadmin` / `WrongPassword`
3. Click "Sign in"

**Expected:**
- Error toast: "Invalid email or password"
- Stay on login page
- No token saved

---

### ✅ Scenario 3: Empty Fields
**Steps:**
1. Go to `/login`
2. Click "Sign in" without entering anything

**Expected:**
- Validation errors appear
- "Username is required"
- "Password is required"

---

### ✅ Scenario 4: Remember Me
**Steps:**
1. Go to `/login`
2. Enter credentials
3. Check "Remember me"
4. Login successfully
5. Logout
6. Go to `/login` again

**Expected:**
- Username field is pre-filled

---

### ✅ Scenario 5: Protected Routes
**Steps:**
1. Clear localStorage (logout if logged in)
2. Try to access `/organizations`

**Expected:**
- Auto-redirect to `/login`
- After login, redirect back to `/organizations`

---

### ✅ Scenario 6: Logout
**Steps:**
1. Login successfully
2. Click user avatar in header
3. Click "Log out"

**Expected:**
- Toast: "You have been logged out"
- Redirect to `/login`
- Token cleared from localStorage
- Cannot access protected routes

---

## Browser Console Tests

Open DevTools (F12) and run:

### Check if logged in:
```javascript
localStorage.getItem('auth_token')
// Should show token if logged in, null if not
```

### Manual login test:
```javascript
fetch('http://45.158.126.171:8181/api/v1/identity-provider/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'superadmin',
    password: 'SuperAdmin123!'
  })
})
.then(r => r.json())
.then(console.log)
```

### Check token:
```javascript
const token = localStorage.getItem('auth_token');
if (token) {
  // Decode JWT (basic - not verifying signature)
  const payload = JSON.parse(atob(token.split('.')[1]));
  console.log('Token payload:', payload);
}
```

---

## Current Status

⚠️ **Backend returning 500 error**
- Frontend is ready and configured correctly
- Waiting for backend team to fix authentication service
- All code changes are complete and tested (UI flow)

✅ **Frontend Ready:**
- Login page created
- Protected routes configured
- Logout implemented
- Token management ready
- Error handling in place

