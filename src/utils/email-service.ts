
import { toast } from "sonner";

interface EmailOptions {
  to: string;
  subject: string;
  body: string;
  attachments?: Array<{
    name: string;
    content: string | Blob;
    contentType: string;
  }>;
}

export const emailService = {
  /**
   * Sends an email with the provided options
   * In a real application, this would connect to an email service API
   */
  async sendEmail(options: EmailOptions): Promise<boolean> {
    console.log("Sending email:", options);
    
    try {
      // This is where you would make an API call to your email service
      // For this demo, we'll simulate a successful email send after a delay
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Log the email details (in a real app, this would be sent via API)
      console.log(`Email sent to: ${options.to}`);
      console.log(`Subject: ${options.subject}`);
      console.log(`Body: ${options.body}`);
      
      if (options.attachments) {
        console.log(`Attachments: ${options.attachments.length}`);
        options.attachments.forEach(attachment => {
          console.log(`- ${attachment.name} (${attachment.contentType})`);
        });
      }
      
      // Show success toast
      toast.success("Email sent successfully", {
        description: `To: ${options.to}`
      });
      
      return true;
    } catch (error) {
      console.error("Error sending email:", error);
      
      // Show error toast
      toast.error("Failed to send email", {
        description: error instanceof Error ? error.message : "Unknown error"
      });
      
      return false;
    }
  },
  
  /**
   * Sends a purchase order to a supplier via email
   */
  async sendPurchaseOrder(
    supplierEmail: string, 
    poReference: string, 
    poContent: string
  ): Promise<boolean> {
    const emailOptions: EmailOptions = {
      to: supplierEmail,
      subject: `Purchase Order: ${poReference}`,
      body: `
        <html>
          <body>
            <h1>Purchase Order: ${poReference}</h1>
            <p>Please find attached our purchase order for your review and processing.</p>
            <p>If you have any questions, please contact us.</p>
            <div>${poContent}</div>
          </body>
        </html>
      `,
      attachments: [
        {
          name: `PO_${poReference}.pdf`,
          content: "PDF_CONTENT_PLACEHOLDER", // In a real app, this would be the actual PDF content
          contentType: "application/pdf"
        }
      ]
    };
    
    return this.sendEmail(emailOptions);
  }
};
