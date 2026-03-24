import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

/**
 * POST /api/email/send
 * Sends email using SMTP2GO service
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { to, subject, body: emailBody, from } = body;

        // Validate inputs
        if (!to || !subject || !emailBody) {
            return NextResponse.json(
                { error: "Missing required fields: to, subject, body" },
                { status: 400 }
            );
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(to)) {
            return NextResponse.json(
                { error: "Invalid email address format" },
                { status: 400 }
            );
        }

        // Get SMTP2GO configuration from environment
        const smtpHost = process.env.SMTP2GO_SMTP_HOST;
        const smtpPort = parseInt(process.env.SMTP2GO_SMTP_PORT || "2525");
        const smtpUser = process.env.SMTP2GO_SMTP_USER;
        const smtpPass = process.env.SMTP2GO_SMTP_PASS;

        // Validate SMTP configuration
        if (!smtpHost || !smtpUser || !smtpPass) {
            return NextResponse.json(
                { error: "SMTP2GO configuration is incomplete. Please check environment variables." },
                { status: 500 }
            );
        }

        try {
            // Create nodemailer transporter with SMTP2GO
            const transporter = nodemailer.createTransport({
                host: smtpHost,
                port: smtpPort,
                secure: false, // SMTP2GO uses STARTTLS
                auth: {
                    user: smtpUser,
                    pass: smtpPass,
                },
                tls: {
                    rejectUnauthorized: false // For development; set to true in production
                }
            });

            // Verify transporter configuration
            await transporter.verify();

            // Send email
            const info = await transporter.sendMail({
                from: from || smtpUser, // Use provided from or default to SMTP user
                to: to,
                subject: subject,
                text: emailBody,
                html: emailBody.replace(/\n/g, '<br>'), // Basic HTML conversion
            });

            return NextResponse.json({
                success: true,
                messageId: info.messageId,
                message: "Email sent successfully",
                sentAt: new Date().toISOString()
            });

        } catch (smtpError: any) {
            console.error("SMTP error:", smtpError);

            // Provide helpful error messages
            let errorMessage = "Failed to send email";
            let suggestion = "";

            if (smtpError.code === 'EAUTH') {
                errorMessage = "SMTP authentication failed";
                suggestion = "Please check your SMTP2GO username and password.";
            } else if (smtpError.code === 'ECONNECTION') {
                errorMessage = "Could not connect to SMTP server";
                suggestion = "Please check your network connection and SMTP host configuration.";
            } else if (smtpError.responseCode === 550) {
                errorMessage = "Email rejected by server";
                suggestion = "The recipient email address may be invalid or blocked.";
            }

            return NextResponse.json(
                {
                    error: errorMessage,
                    details: smtpError.message,
                    suggestion,
                    code: smtpError.code
                },
                { status: 500 }
            );
        }

    } catch (error: any) {
        console.error("Email sending error:", error);
        return NextResponse.json(
            {
                error: "Failed to process email request",
                details: error.message || "Unknown error"
            },
            { status: 500 }
        );
    }
}

// Handle OPTIONS for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, { status: 200 });
}
