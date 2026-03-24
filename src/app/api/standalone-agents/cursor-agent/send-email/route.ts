import { NextRequest, NextResponse } from "next/server";
import nodemailer from "nodemailer";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { options } = body;
        const { to, subject, body: emailBody } = options || {};

        if (!to || !subject || !emailBody) {
            return NextResponse.json(
                { error: "To, Subject, and Body are required" },
                { status: 400, headers: { "Access-Control-Allow-Origin": "*" } }
            );
        }

        // Validate credentials existence
        if (!process.env.SMTP2GO_SMTP_USER || !process.env.SMTP2GO_SMTP_PASS) {
            return NextResponse.json(
                { error: "SMTP credentials not configured on server" },
                { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
            );
        }

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP2GO_SMTP_HOST || "mail.smtp2go.com",
            port: Number(process.env.SMTP2GO_SMTP_PORT) || 2525,
            auth: {
                user: process.env.SMTP2GO_SMTP_USER,
                pass: process.env.SMTP2GO_SMTP_PASS
            }
        });

        console.log(`Sending email to ${to} via SMTP2GO...`);

        await transporter.sendMail({
            from: process.env.SMTP2GO_SENDER_EMAIL || process.env.SMTP2GO_SMTP_USER || "noreply@example.com",
            to,
            subject,
            text: emailBody,
            html: emailBody.replace(/\n/g, "<br/>")
        });

        return NextResponse.json({
            success: true,
            result: { message: "Email sent successfully" }
        }, { headers: { "Access-Control-Allow-Origin": "*" } });

    } catch (error) {
        console.error("Email send error:", error);
        return NextResponse.json(
            { error: "Failed to send email: " + (error instanceof Error ? error.message : String(error)) },
            { status: 500, headers: { "Access-Control-Allow-Origin": "*" } }
        );
    }
}
