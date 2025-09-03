# Contact Form Email Setup Guide

The Video Caption Generator now includes a contact form that can automatically send emails when users submit feedback, questions, or reports. This guide explains how to configure the email functionality.

## Overview

The contact form uses [EmailJS](https://www.emailjs.com/) to send emails directly from the client-side without requiring a backend server. This maintains the application's architecture as a static web app while providing email functionality.

## Features

- ✅ **Automatic form submission handling**
- ✅ **Email validation and form validation**
- ✅ **Browser information auto-collection**
- ✅ **Multiple subject categories**
- ✅ **Responsive design**
- ✅ **Loading states and user feedback**
- ✅ **Demo mode when EmailJS is not configured**

## Setup Instructions

### 1. Create EmailJS Account

1. Visit [EmailJS.com](https://www.emailjs.com/) and create a free account
2. You get 200 free emails per month on the free plan

### 2. Configure Email Service

1. In your EmailJS dashboard, go to **Email Services**
2. Click **Add New Service**
3. Choose your email provider (Gmail, Outlook, etc.)
4. Follow the setup instructions to connect your email account
5. Note the **Service ID** (e.g., `service_abc123`)

### 3. Create Email Template

1. Go to **Email Templates** in your EmailJS dashboard
2. Click **Create New Template**
3. Use this template structure:

```html
Subject: {{subject}} - Video Caption Generator Contact

From: {{name}} <{{email}}>

Message:
{{message}}

---
Browser Information:
{{browser}}

Submitted: {{timestamp}}
App Version: {{app_version}}
```

4. Note the **Template ID** (e.g., `template_xyz789`)

### 4. Get Public Key

1. Go to **API Keys** in your EmailJS dashboard
2. Find your **Public Key** (e.g., `your_public_key_here`)

### 5. Update Configuration

In the file `js/contact-form.js`, update the EmailJS configuration around line 14:

```javascript
// EmailJS configuration (Replace with your own values)
this.emailjsConfig = {
    serviceId: 'your_service_id',     // Replace with your EmailJS service ID
    templateId: 'your_template_id',   // Replace with your EmailJS template ID  
    publicKey: 'your_public_key'      // Replace with your EmailJS public key
};
```

### 6. Test the Configuration

1. Open the Video Caption Generator
2. Go to the **Contact** tab
3. Fill out the form and submit
4. Check your configured email address for the message

## Email Template Variables

The contact form sends these variables to your email template:

- `{{name}}` - User's name
- `{{email}}` - User's email address
- `{{subject}}` - Selected subject category
- `{{message}}` - User's message
- `{{browser}}` - Detailed browser information
- `{{timestamp}}` - Submission timestamp
- `{{app_version}}` - Application version
- `{{user_agent}}` - Raw user agent string

## Demo Mode

When EmailJS is not configured or fails to load, the form operates in **demo mode**:

- Form validation still works
- Loading states are shown
- Success message appears
- Form data is logged to browser console
- No actual email is sent

This ensures the form remains functional even without email setup.

## Subject Categories

The form includes predefined subject categories:

- **General Feedback** - User comments and suggestions
- **Bug Report** - Technical issues and problems
- **Feature Request** - New feature suggestions
- **Business Inquiry** - Commercial and enterprise questions
- **Technical Support** - Help with using the application
- **Other** - Miscellaneous topics

## Security Considerations

- EmailJS public keys are safe to include in client-side code
- Never include private keys in the frontend
- Set up domain restrictions in EmailJS dashboard for security
- Consider rate limiting in EmailJS settings

## Troubleshooting

### EmailJS not loading
- Check internet connection
- Verify EmailJS CDN is accessible
- Check browser console for errors

### Emails not sending
- Verify ServiceID, TemplateID, and Public Key are correct
- Check EmailJS dashboard for quota limits
- Ensure email service is properly connected

### Form validation issues
- Check required fields are filled
- Verify email format is valid
- Look for JavaScript errors in console

## Cost Considerations

**EmailJS Free Plan:**
- 200 emails per month
- Basic support
- Perfect for small to medium usage

**EmailJS Paid Plans:**
- Higher email limits
- Priority support
- Advanced features
- Starting from $15/month

## Alternative Solutions

If EmailJS doesn't meet your needs, consider:

- **FormSubmit** - Simple form submission service
- **Netlify Forms** - If hosting on Netlify
- **Custom backend** - Full control but requires server setup

## Support

If you need help setting up the contact form:

1. Check the browser console for error messages
2. Verify EmailJS configuration is correct
3. Test in demo mode first
4. Refer to [EmailJS documentation](https://www.emailjs.com/docs/)

The contact form will gracefully degrade to demo mode if email services are unavailable, ensuring users can always interact with the form interface.