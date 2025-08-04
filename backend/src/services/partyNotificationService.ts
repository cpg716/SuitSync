import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { sendEmail, sendSMS } from './notificationService';

const prisma = new PrismaClient();

interface PartyMember {
  id: number;
  fullName: string;
  phone: string;
  email?: string;
  role: string;
}

/**
 * Send invitation notifications to party members with appointment scheduling links
 */
export async function sendPartyMemberInvitations(
  partyId: number, 
  members: PartyMember[], 
  eventDate: Date
): Promise<void> {
  try {
    const party = await prisma.party.findUnique({
      where: { id: partyId },
      include: {
        salesPerson: true,
        customer: true
      }
    });

    if (!party) {
      throw new Error('Party not found');
    }

    // Calculate the 3-month mark (90 days before wedding)
    const threeMonthMark = new Date(eventDate);
    threeMonthMark.setDate(threeMonthMark.getDate() - 90);

    // Calculate scheduling window (1 week before to 1 week after 3-month mark)
    const schedulingStart = new Date(threeMonthMark);
    schedulingStart.setDate(schedulingStart.getDate() - 7);
    
    const schedulingEnd = new Date(threeMonthMark);
    schedulingEnd.setDate(schedulingEnd.getDate() + 7);

    const salesPersonName = party.salesPerson?.name || 'our staff';
    const weddingDate = eventDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send notifications to each member
    for (const member of members) {
      try {
        await sendMemberInvitation(member, party, {
          weddingDate,
          salesPersonName,
          schedulingStart,
          schedulingEnd,
          threeMonthMark
        });
      } catch (error) {
        logger.error(`Failed to send invitation to member ${member.fullName}:`, error);
        // Continue with other members even if one fails
      }
    }

    logger.info(`Sent invitation notifications to ${members.length} party members for party ${partyId}`);
  } catch (error) {
    logger.error('Error sending party member invitations:', error);
    throw error;
  }
}

/**
 * Send invitation to a specific party member
 */
async function sendMemberInvitation(
  member: PartyMember,
  party: any,
  schedulingInfo: {
    weddingDate: string;
    salesPersonName: string;
    schedulingStart: Date;
    schedulingEnd: Date;
    threeMonthMark: Date;
  }
): Promise<void> {
  const { weddingDate, salesPersonName, schedulingStart, schedulingEnd, threeMonthMark } = schedulingInfo;

  // Generate unique scheduling link
  const schedulingToken = generateSchedulingToken(member.id, party.id);
  const schedulingUrl = `https://www.riversidemens.com/appointments?token=${schedulingToken}&member=${member.id}&party=${party.id}`;

  const schedulingWindow = `${schedulingStart.toLocaleDateString()} - ${schedulingEnd.toLocaleDateString()}`;
  const threeMonthDate = threeMonthMark.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  // Send email invitation
  if (member.email) {
    const emailSubject = `Wedding Party Invitation - Schedule Your First Fitting`;
    const emailBody = generateInvitationEmail(member, party, {
      weddingDate,
      salesPersonName,
      schedulingUrl,
      schedulingWindow,
      threeMonthDate
    });

    await sendEmail({
      to: member.email,
      subject: emailSubject,
      html: emailBody
    });
  }

  // Send SMS invitation
  if (member.phone) {
    const smsBody = generateInvitationSms(member, {
      weddingDate,
      salesPersonName,
      schedulingUrl,
      schedulingWindow
    });

    await sendSMS({
      to: member.phone,
      body: smsBody
    });
  }
}

/**
 * Generate unique scheduling token for member
 */
function generateSchedulingToken(memberId: number, partyId: number): string {
  const timestamp = Date.now();
  const data = `${memberId}-${partyId}-${timestamp}`;
  // In production, use a proper JWT or crypto library
  return Buffer.from(data).toString('base64');
}

/**
 * Generate email body for party member invitation
 */
function generateInvitationEmail(
  member: PartyMember,
  party: any,
  info: {
    weddingDate: string;
    salesPersonName: string;
    schedulingUrl: string;
    schedulingWindow: string;
    threeMonthDate: string;
  }
): string {
  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center;">
          <h1 style="color: #2c3e50; margin: 0;">Riverside Men's Shop</h1>
          <p style="margin: 10px 0 0 0; color: #7f8c8d;">Wedding Party Invitation</p>
        </div>
        
        <div style="padding: 30px 20px;">
          <h2 style="color: #2c3e50;">Hello ${member.fullName}!</h2>
          
          <p>You've been invited to be part of a wedding party with a wedding date of <strong>${info.weddingDate}</strong>.</p>
          
          <div style="background-color: #e8f5e8; border-left: 4px solid #27ae60; padding: 15px; margin: 20px 0;">
            <h3 style="margin: 0 0 10px 0; color: #27ae60;">📅 Schedule Your First Fitting</h3>
            <p style="margin: 0;"><strong>When to schedule:</strong> ${info.schedulingWindow}</p>
            <p style="margin: 5px 0 0 0;"><strong>Target date:</strong> ${info.threeMonthDate} (3 months before wedding)</p>
            <p style="margin: 5px 0 0 0;"><strong>Your sales person:</strong> ${info.salesPersonName}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${info.schedulingUrl}" 
               style="background-color: #3498db; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
              📋 Schedule My First Fitting
            </a>
          </div>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <h4 style="margin: 0 0 10px 0; color: #856404;">Important Notes:</h4>
            <ul style="margin: 0; padding-left: 20px;">
              <li>You must schedule within the specified window</li>
              <li>Only ${info.salesPersonName}'s availability will be shown</li>
              <li>This is your first fitting appointment</li>
              <li>Please bring any style preferences or inspiration photos</li>
            </ul>
          </div>
          
          <p>If you have any questions, please contact us at Riverside Men's Shop (716-833-8401).</p>
          
          <p>Best regards,<br>
          <strong>Riverside Men's Shop Team</strong><br>716-833-8401</p>
        </div>
        
        <div style="background-color: #f8f9fa; padding: 20px; text-align: center; font-size: 12px; color: #7f8c8d;">
          <p>This invitation is for ${member.fullName} as ${member.role} in the wedding party.</p>
        </div>
      </body>
    </html>
  `;
}

/**
 * Generate SMS body for party member invitation
 */
function generateInvitationSms(
  member: PartyMember,
  info: {
    weddingDate: string;
    salesPersonName: string;
    schedulingUrl: string;
    schedulingWindow: string;
  }
): string {
  return `Hi ${member.fullName}! You're invited to the wedding party (${info.weddingDate}). Schedule your first fitting with ${info.salesPersonName} between ${info.schedulingWindow} at: ${info.schedulingUrl} - Riverside Men's Shop (716-833-8401)`;
}

/**
 * Schedule daily staff notifications at 9am
 */
export async function scheduleDailyStaffNotifications(): Promise<void> {
  try {
    // This would be called by a cron job or scheduler
    // For now, we'll just log that it should be scheduled
    logger.info('Daily staff notifications should be scheduled for 9am daily');
    
    // In production, you would use a proper scheduler like node-cron
    // Example: cron.schedule('0 9 * * *', sendDailyStaffNotifications);
  } catch (error) {
    logger.error('Error scheduling daily staff notifications:', error);
  }
} 