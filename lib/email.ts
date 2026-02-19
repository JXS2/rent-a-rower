import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY || 'placeholder');

// Use a simple from address — Resend's free tier lets you send from onboarding@resend.dev
const FROM_EMAIL = 'Rent-a-Rower <onboarding@resend.dev>';

export async function sendBookingConfirmation(to: string, booking: { date: string; numRowers: number; total: number; paymentMethod: string }) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Rent-a-Rower Booking Confirmation — ${booking.date}`,
      html: `
        <h2>Booking Confirmed!</h2>
        <p><strong>Date:</strong> ${booking.date}</p>
        <p><strong>Rowers:</strong> ${booking.numRowers}</p>
        <p><strong>Total:</strong> $${booking.total / 100}</p>
        <p><strong>Payment:</strong> ${booking.paymentMethod === 'stripe' ? 'Paid online' : 'Cash/check — please deliver payment'}</p>
      `
    });
  } catch (error) {
    console.error('Failed to send booking confirmation:', error);
  }
}

export async function sendAssignmentNotification(to: string, assignment: { date: string; customerName: string; address: string; crewMembers: string[]; portalUrl: string }) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Rent-a-Rower Assignment — ${assignment.date}`,
      html: `
        <h2>You've been assigned a Rent-a-Rower job!</h2>
        <p><strong>Date:</strong> ${assignment.date}</p>
        <p><strong>Customer:</strong> ${assignment.customerName}</p>
        <p><strong>Address:</strong> ${assignment.address}</p>
        <p><strong>Your crew:</strong> ${assignment.crewMembers.join(', ')}</p>
        <p><a href="${assignment.portalUrl}">View your assignments</a></p>
      `
    });
  } catch (error) {
    console.error('Failed to send assignment notification:', error);
  }
}

export async function sendSwapRequest(to: string, swap: { requesterName: string; date: string; customerName: string; address: string; acceptUrl: string; declineUrl: string }) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to,
      subject: `Swap Request — Rent-a-Rower on ${swap.date}`,
      html: `
        <h2>${swap.requesterName} needs you to cover a Rent-a-Rower</h2>
        <p><strong>Date:</strong> ${swap.date}</p>
        <p><strong>Customer:</strong> ${swap.customerName}</p>
        <p><strong>Address:</strong> ${swap.address}</p>
        <p><a href="${swap.acceptUrl}" style="display: inline-block; padding: 10px 20px; background: green; color: white; text-decoration: none; margin-right: 10px;">Accept</a></p>
        <p><a href="${swap.declineUrl}" style="display: inline-block; padding: 10px 20px; background: red; color: white; text-decoration: none;">Decline</a></p>
      `
    });
  } catch (error) {
    console.error('Failed to send swap request:', error);
  }
}

export async function sendSwapAcceptedNotification(originalRowerEmail: string, replacementRowerName: string, jobDetails: { date: string; customerName: string }) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: originalRowerEmail,
      subject: `Swap Accepted — ${jobDetails.date}`,
      html: `
        <h2>Your swap request has been accepted!</h2>
        <p><strong>${replacementRowerName}</strong> has agreed to cover your Rent-a-Rower job.</p>
        <p><strong>Date:</strong> ${jobDetails.date}</p>
        <p><strong>Customer:</strong> ${jobDetails.customerName}</p>
        <p>You are no longer assigned to this job.</p>
      `
    });
  } catch (error) {
    console.error('Failed to send swap accepted notification:', error);
  }
}

export async function sendSwapDeclinedNotification(originalRowerEmail: string, replacementRowerName: string, jobDetails: { date: string; customerName: string }) {
  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: originalRowerEmail,
      subject: `Swap Declined — ${jobDetails.date}`,
      html: `
        <h2>Your swap request was declined</h2>
        <p><strong>${replacementRowerName}</strong> has declined to cover your Rent-a-Rower job.</p>
        <p><strong>Date:</strong> ${jobDetails.date}</p>
        <p><strong>Customer:</strong> ${jobDetails.customerName}</p>
        <p>You remain assigned to this job. Please find another replacement or contact the admin.</p>
      `
    });
  } catch (error) {
    console.error('Failed to send swap declined notification:', error);
  }
}
