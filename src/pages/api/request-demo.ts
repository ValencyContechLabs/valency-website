import type { APIRoute } from 'astro';
import nodemailer from 'nodemailer';

// Mark this endpoint as server-rendered (not static)
export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check content type and handle both form-data and JSON
    const contentType = request.headers.get('content-type') || '';
    let data: FormData | Record<string, any>;
    
    if (contentType.includes('application/json')) {
      const json = await request.json();
      // Convert JSON to FormData-like structure
      data = {
        firstName: json.firstName || '',
        lastName: json.lastName || '',
        email: json.email || '',
        company: json.company || '',
        hearAbout: json.hearAbout || '',
        projectDetails: json.projectDetails || '',
        newsletter: json.newsletter || false,
      };
    } else if (contentType.includes('multipart/form-data') || contentType.includes('application/x-www-form-urlencoded') || contentType === '') {
      // Try to get formData - if Content-Type is missing, browser might have set it automatically
      try {
        data = await request.formData();
      } catch (formDataError) {
        // If formData fails, try to read as text and parse manually
        const text = await request.text();
        throw new Error(`Failed to parse form data. Content-Type: ${contentType || 'not set'}. Please ensure the form is submitting with proper Content-Type header.`);
      }
    } else {
      throw new Error(`Unsupported Content-Type: ${contentType}. Expected multipart/form-data, application/x-www-form-urlencoded, or application/json.`);
    }

    // Extract form data (works for both FormData and plain object)
    const firstName = (data instanceof FormData ? data.get('firstName') : data.firstName)?.toString() || '';
    const lastName = (data instanceof FormData ? data.get('lastName') : data.lastName)?.toString() || '';
    const email = (data instanceof FormData ? data.get('email') : data.email)?.toString() || '';
    const company = (data instanceof FormData ? data.get('company') : data.company)?.toString() || '';
    const hearAbout = (data instanceof FormData ? data.get('hearAbout') : data.hearAbout)?.toString() || '';
    const projectDetails = (data instanceof FormData ? data.get('projectDetails') : data.projectDetails)?.toString() || '';
    const newsletterValue = data instanceof FormData ? data.get('newsletter') : data.newsletter;
    const newsletter = newsletterValue ? 'Yes' : 'No';

    // Email content
    const emailContent = `
New demo request received:

Name: ${firstName} ${lastName}
Email: ${email}
Company: ${company}
How did they hear about us?: ${hearAbout}
Subscribed to newsletter?: ${newsletter}

Project Details:
${projectDetails}
    `;

    // Check if SMTP is configured
    const smtpHost = import.meta.env.SMTP_HOST;
    const smtpPort = import.meta.env.SMTP_PORT;
    const smtpUser = import.meta.env.SMTP_USER;
    const smtpPass = import.meta.env.SMTP_PASS;
    const smtpFrom = import.meta.env.SMTP_FROM;

    const isDevelopment = import.meta.env.DEV;
    const isSmtpConfigured = smtpHost && smtpPort && smtpUser && smtpPass && smtpFrom;

    // In development mode without SMTP config, just log the email
    if (isDevelopment && !isSmtpConfigured) {
      console.log('📧 [DEV MODE] Email would be sent:');
      console.log('To: Suriyaprakash@valency.in');
      console.log('From:', smtpFrom || 'noreply@valency.in');
      console.log('Subject: New Demo Request – Valency Website');
      console.log('Content:', emailContent);
      
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Thank you! We will reach out to you soon. (Development mode - email logged)',
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate SMTP configuration
    if (!isSmtpConfigured) {
      throw new Error('SMTP configuration is missing. Please set SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM environment variables.');
    }

    // Create transporter
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: Number(smtpPort),
      secure: Number(smtpPort) === 465, // true for 465, false for others
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    // Email options
    const mailOptions = {
      from: smtpFrom,
      to: 'hello@valency.in',
      replyTo: email,
      subject: 'New Demo Request – Valency Website',
      text: emailContent,
    };

    console.log('📧 Sending email...');
    console.log('SMTP Host:', smtpHost);
    console.log('To: Suriyaprakash@valency.in');
    console.log('From:', smtpFrom);
    
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully! Message ID:', info.messageId);

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Thank you! We will reach out to you soon.',
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('Email sending failed:', error);

    return new Response(
      JSON.stringify({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong. Please try again later.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};
