# Esnyca App Password Reset Email Template Customization

## Firebase Email Template Setup

To customize the password reset email template for Esnyca App, follow these steps:

### 1. Access Firebase Console
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your Esnyca project
3. Navigate to **Authentication** > **Templates**

### 2. Customize Password Reset Email

In the **Password reset** template:

#### Subject Line:
```
Reset your Esnyca App password
```

#### Email Body (HTML):
```html
<p>Hello,</p>
<p>Follow this link to reset your Esnyca App password for your %EMAIL% account.</p>
<p><a href='%LINK%'>Reset Your Esnyca App Password</a></p>
<p>If you didn't ask to reset your password, you can ignore this email.</p>
<p>Thanks,</p>
<p>Your Esnyca App team</p>
```

#### Email Body (Text):
```
Hello,

Follow this link to reset your Esnyca App password for your %EMAIL% account.

%LINK%

If you didn't ask to reset your password, you can ignore this email.

Thanks,

Your Esnyca App team
```

### 3. Sender Information
- **From email**: Update to your custom domain (e.g., `noreply@esnyca.com`)
- **From name**: `Esnyca App`

### 4. Action URL Configuration
The action URL is automatically configured through the `actionCodeSettings` in the backend code to redirect users to:
```
http://localhost:4000/confirm-password-reset
```
(or your production domain)

## Web Pages Created

Two web pages have been created to match your mobile app's design:

### 1. Password Reset Request Page
- **URL**: `/reset-password`
- **File**: `backend/public/reset-password.html`
- **Purpose**: Allows users to enter their email to request a password reset

### 2. Password Reset Confirmation Page
- **URL**: `/confirm-password-reset`
- **File**: `backend/public/confirm-password-reset.html`
- **Purpose**: Allows users to set a new password using the Firebase action code

## Features

- **Mobile-responsive design** matching your app's gradient theme
- **Password strength validation** on the confirmation page
- **Error handling** for network issues and invalid links
- **Consistent branding** with "Esnyca App" throughout
- **Automatic redirects** after successful password updates

## Testing

1. Start your backend server: `npm start`
2. Visit `http://localhost:4000/reset-password` to test the request page
3. Use a real email to test the full flow
4. The Firebase email will contain a link to the confirmation page

## Environment Variables

Add these to your `.env` file for production:

```
FRONTEND_URL=https://yourdomain.com
```

This ensures password reset links point to your production domain instead of localhost.