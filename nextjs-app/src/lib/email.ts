
export const sendEmail = async (to: string, subject: string, html: string) => {
    console.log(`[EMAIL MOCK] Sending email to ${to}`);
    console.log(`[EMAIL MOCK] Subject: ${subject}`);
    console.log(`[EMAIL MOCK] Body length: ${html.length}`);
    
    // Check for configured email provider
    // if (process.env.SMTP_HOST) { ... implementation ... }
    
    return true;
};
