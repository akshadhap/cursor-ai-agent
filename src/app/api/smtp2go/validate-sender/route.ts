// src/app/api/smtp2go/validate-sender/route.ts
import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import prisma from "@/lib/db"; // 👈 your prisma wrapper

const SMTP2GO_API_KEY = process.env.SMTP2GO_API_KEY;
const SMTP2GO_BASE_URL = "https://api.smtp2go.com/v3";

function json(data: any, status = 200) {
  return NextResponse.json(data, { status });
}

export async function POST(req: NextRequest) {
  try {
    if (!SMTP2GO_API_KEY) {
      console.error("Missing SMTP2GO_API_KEY env variable");
      return json(
        {
          valid: false,
          message:
            "SMTP2GO API key is not configured. Please contact the administrator.",
        },
        500,
      );
    }

    const { email } = await req.json();
    const trimmed = (email ?? "").trim().toLowerCase();

    if (!trimmed) {
      return json(
        { valid: false, message: "Sender email is required." },
        400,
      );
    }

    // simple sanity check
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      return json(
        { valid: false, message: "Please enter a valid email address." },
        400,
      );
    }

    //
    // 1) Check in SMTP2GO if this email is already a verified single sender
    //    Response sample:
    //    {
    //      "request_id": "...",
    //      "data": {
    //        "senders": [
    //          { "email_address": "x@y.com", "verified": false }
    //        ]
    //      }
    //    }
    //
    let isVerifiedInSmtp2Go = false;
    let hasExistingPending = false; 

    try {
      const viewRes = await fetch(
        `${SMTP2GO_BASE_URL}/single_sender_emails/view`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            accept: "application/json",
            "X-Smtp2go-Api-Key": SMTP2GO_API_KEY,
          },
          body: JSON.stringify({}), // view does not require parameters
        },
      );

      const viewJson = await viewRes.json().catch(() => ({} as any));

      if (!viewRes.ok) {
        console.error(
          "Failed to fetch single sender emails from SMTP2GO",
          viewRes.status,
          viewJson,
        );
      } else {
        const senders = (viewJson as any)?.data?.senders ?? [];
if (Array.isArray(senders)) {
  const existing = senders.find(
    (s: any) =>
      typeof s.email_address === "string" &&
      s.email_address.toLowerCase() === trimmed,
  );

  if (existing) {
    if (existing.verified === true) {
      isVerifiedInSmtp2Go = true;
    } else if (existing.verified === false) {
      // 👇 handle this:
      // {
      //   "data": {
      //     "senders": [
      //       { "email_address": "...", "verified": false }
      //     ]
      //   }
      // }
      hasExistingPending = true;
    }
  }
}

      }
    } catch (err) {
      console.error("Error while calling single_sender_emails/view:", err);
    }

    //
    // 2) If verified in SMTP2GO → mark VERIFIED in our DB and return valid:true
    //
    if (isVerifiedInSmtp2Go) {
      await prisma.smtpSender.upsert({
        where: { email: trimmed },
        update: {
          status: "VERIFIED",
          verifiedAt: new Date(),
        },
        create: {
          email: trimmed,
          status: "VERIFIED",
          verifiedAt: new Date(),
          // if your model has token as required, we still fill it
          token: randomUUID(),
        },
      });

      return json({
        valid: true,
        message: "Sender email is verified and ready to use.",
      });
    }

// 2b) If SMTP2GO knows this sender but verified === false
//     → don't call add() again, just tell user to check email
// 2b) If SMTP2GO knows this sender but verified === false
//     → re-send SMTP2GO verification email + mark as PENDING in our DB
if (hasExistingPending) {
  try {
    const resendRes = await fetch(
      `${SMTP2GO_BASE_URL}/single_sender_emails/add`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          "X-Smtp2go-Api-Key": SMTP2GO_API_KEY,
        },
        body: JSON.stringify({
          email_address: trimmed,
          message:
            "Please verify your email to start using Spinabot for outbound sequences.",
        }),
      },
    );

    const resendJson = await resendRes.json().catch(() => ({} as any));

    if (!resendRes.ok) {
      console.error(
        "Failed to re-send single sender verification via SMTP2GO",
        resendRes.status,
        resendJson,
      );
      // we still fall through to telling user to check email
    }
  } catch (err) {
    console.error("Error while re-sending SMTP2GO verification:", err);
  }

  await prisma.smtpSender.upsert({
    where: { email: trimmed },
    update: {
      status: "PENDING",
    },
    create: {
      email: trimmed,
      status: "PENDING",
      token: randomUUID(),
    },
  });

  return json({
    valid: false,
    pending: true,
    message:
      "We re-sent a verification email to this address via SMTP2GO. Please click the link in that email, then click Validate again.",
  });
}


    //
    // 3) Not verified yet → trigger SMTP2GO verification email
    //    Using your WORKING pattern + custom message
    //
    const addRes = await fetch(
      `${SMTP2GO_BASE_URL}/single_sender_emails/add`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          accept: "application/json",
          "X-Smtp2go-Api-Key": SMTP2GO_API_KEY,
        },
        body: JSON.stringify({
          email_address: trimmed,
          message: "Please verify your email to services from spinabot", // 👈 custom message shown in SMTP2GO email
        }),
      },
    );

    const addJson = await addRes.json().catch(() => ({} as any));

    if (!addRes.ok) {
      console.error(
        "Failed to call single_sender_emails/add",
        addRes.status,
        addJson,
      );

      return json(
        {
          valid: false,
          message:
            "Failed to start sender verification in SMTP2GO. Please check the email or try again.",
        },
        502,
      );
    }

    // 4) Save/update in our DB as PENDING
    await prisma.smtpSender.upsert({
      where: { email: trimmed },
      update: {
        status: "PENDING",
        // keep verifiedAt as-is or null
      },
      create: {
        email: trimmed,
        status: "PENDING",
        token: randomUUID(), // still store a token if your schema expects it
      },
    });

    // In normal flow, SMTP2GO will send the verification email now
    return json({
      valid: false,
      pending: true,
      message:
        "A verification email has been sent to this address by SMTP2GO. Please click the link in that email, then click Validate again.",
    });
  } catch (err) {
    console.error("Unexpected error in /api/smtp2go/validate-sender:", err);
    return json(
      {
        valid: false,
        message: "Unexpected error while validating sender email.",
      },
      500,
    );
  }
}
