import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';
import { sendEmail, sendSMS } from './notificationService';

const prisma = new PrismaClient();

export interface StaffNotificationData {
  staffId: number;
  staffName: string;
  staffEmail: string;
  staffPhone: string;
  appointments: Array<{
    id: number;
    dateTime: Date;
    customerName: string;
    customerPhone: string;
    appointmentType: string;
    notes?: string;
    partyName?: string;
    weddingDate?: string;
  }>;
}

/**
 * Send daily staff notifications at 9am for appointments
 */
export async function sendDailyStaffNotifications(): Promise<void> {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get all appointments for today and tomorrow
    const appointments = await prisma.appointment.findMany({
      where: {
        dateTime: {
          gte: today,
          lt: tomorrow
        },
        status: {
          in: ['scheduled', 'confirmed']
        }
      },
      include: {
        tailor: true,
        individualCustomer: true,
        member: {
          include: {
            party: true
          }
        },
        party: true
      }
    });

    // Group appointments by staff member
    const staffAppointments = new Map<number, StaffNotificationData>();

    for (const appointment of appointments) {
      if (!appointment.tailor) continue;

      const staffId = appointment.tailor.id;
      
      if (!staffAppointments.has(staffId)) {
        staffAppointments.set(staffId, {
          staffId: appointment.tailor.id,
          staffName: appointment.tailor.name,
          staffEmail: appointment.tailor.email,
          staffPhone: '', // Add phone field to User model if needed
          appointments: []
        });
      }

      const staffData = staffAppointments.get(staffId)!;
      
      // Get customer info
      let customerName = '';
      let customerPhone = '';
      
      if (appointment.individualCustomer) {
        customerName = `${appointment.individualCustomer.first_name || ''} ${appointment.individualCustomer.last_name || ''}`.trim();
        customerPhone = appointment.individualCustomer.phone || '';
      } else if (appointment.member) {
        customerName = appointment.member.notes || `Party Member (${appointment.member.role})`;
        // Get phone from party if available
        if (appointment.member.party) {
          // You might need to add phone to Party model or get from anchor member
        }
      }

      staffData.appointments.push({
        id: appointment.id,
        dateTime: appointment.dateTime,
        customerName,
        customerPhone,
        appointmentType: appointment.type || 'fitting',
        notes: appointment.notes || undefined
      });
    }

    // Send notifications to each staff member
    for (const [staffId, staffData] of staffAppointments) {
      if (staffData.appointments.length > 0) {
        await sendStaffDailyNotification(staffData);
      }
    }

    logger.info(`Sent daily notifications to ${staffAppointments.size} staff members`);
  } catch (error) {
    logger.error('Error sending daily staff notifications:', error);
  }
}

/**
 * Send daily notification to a specific staff member
 */
async function sendStaffDailyNotification(staffData: StaffNotificationData): Promise<void> {
  try {
    const emailSubject = `Your Appointments Today - ${new Date().toLocaleDateString()}`;
    const emailBody = generateStaffEmailBody(staffData);
    const smsBody = generateStaffSmsBody(staffData);

    // Send email
    if (staffData.staffEmail) {
      await sendEmail({
        to: staffData.staffEmail,
        subject: emailSubject,
        html: emailBody
      });
    }

    // Send SMS (if phone is available)
    if (staffData.staffPhone) {
      await sendSMS({
        to: staffData.staffPhone,
        body: smsBody
      });
    }

    logger.info(`Sent daily notification to staff member ${staffData.staffName}`);
  } catch (error) {
    logger.error(`Error sending daily notification to staff ${staffData.staffName}:`, error);
  }
}

/**
 * Generate email body for staff daily notification
 */
function generateStaffEmailBody(staffData: StaffNotificationData): string {
  const appointmentList = staffData.appointments
    .map(apt => {
      const time = apt.dateTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${time}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${apt.customerName}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${apt.appointmentType}</td>
          <td style="padding: 8px; border-bottom: 1px solid #eee;">${apt.customerPhone || 'N/A'}</td>
        </tr>
      `;
    })
    .join('');

  return `
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <h2>Good Morning ${staffData.staffName}!</h2>
        <p>You have <strong>${staffData.appointments.length}</strong> appointment(s) today:</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Time</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Customer</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Type</th>
              <th style="padding: 12px; text-align: left; border-bottom: 2px solid #dee2e6;">Phone</th>
            </tr>
          </thead>
          <tbody>
            ${appointmentList}
          </tbody>
        </table>
        
        <p>Please ensure all necessary preparations are made for these appointments.</p>
        <p>Best regards,<br>Riverside Men's Shop<br>716-833-8401</p>
      </body>
    </html>
  `;
}

/**
 * Generate SMS body for staff daily notification
 */
function generateStaffSmsBody(staffData: StaffNotificationData): string {
  const appointmentSummary = staffData.appointments
    .map(apt => {
      const time = apt.dateTime.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      let appointmentInfo = `${time} - ${apt.customerName} (${apt.appointmentType})`;
      if (apt.partyName && apt.weddingDate) {
        appointmentInfo += ` - ${apt.partyName} (Wedding: ${apt.weddingDate})`;
      }
      return appointmentInfo;
    })
    .join('\n');

  return `Good morning ${staffData.staffName}! You have ${staffData.appointments.length} appointment(s) today:\n\n${appointmentSummary}\n\nRiverside Men's Shop (716-833-8401)`;
}

/**
 * Send appointment confirmation notification to customer
 */
export async function sendAppointmentConfirmationNotification(appointmentId: number): Promise<void> {
  try {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        individualCustomer: true,
        member: {
          include: {
            party: true
          }
        },
        tailor: true
      }
    });

    if (!appointment) {
      throw new Error('Appointment not found');
    }

    // Get customer contact info
    let customerName = '';
    let customerEmail = '';
    let customerPhone = '';
    let partyName = '';
    let weddingDate = '';

    if (appointment.individualCustomer) {
      customerName = `${appointment.individualCustomer.first_name || ''} ${appointment.individualCustomer.last_name || ''}`.trim();
      customerEmail = appointment.individualCustomer.email || '';
      customerPhone = appointment.individualCustomer.phone || '';
    } else if (appointment.member) {
      customerName = appointment.member.notes || `Party Member (${appointment.member.role})`;
      // Get contact info from party if available
      if (appointment.member.party) {
        partyName = appointment.member.party.name || '';
        weddingDate = appointment.member.party.eventDate ? new Date(appointment.member.party.eventDate).toLocaleDateString() : '';
      }
    }

    if (!customerEmail && !customerPhone) {
      logger.warn(`No contact info available for appointment ${appointmentId}`);
      return;
    }

    const appointmentTime = appointment.dateTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const staffName = appointment.tailor?.name || 'our staff';
    const staffFirstName = appointment.tailor?.name?.split(' ')[0] || 'our staff';

    // Send email confirmation
    if (customerEmail) {
      const emailSubject = 'Appointment Confirmation - Riverside Men\'s Shop';
      const emailBody = `
        <html>
          <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2>Appointment Confirmed!</h2>
            <p>Dear ${customerName},</p>
            <p>Your appointment has been confirmed for:</p>
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 5px; margin: 20px 0;">
              <p><strong>Date & Time:</strong> ${appointmentTime}</p>
              <p><strong>Type:</strong> ${appointment.type || 'Fitting'}</p>
              <p><strong>Staff:</strong> ${staffFirstName}</p>
              ${partyName ? `<p><strong>Party:</strong> ${partyName}</p>` : ''}
              ${weddingDate ? `<p><strong>Wedding Date:</strong> ${weddingDate}</p>` : ''}
              ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
            </div>
            <p>We look forward to seeing you!</p>
            <p>Best regards,<br>Riverside Men's Shop<br>716-833-8401</p>
          </body>
        </html>
      `;

      await sendEmail({
        to: customerEmail,
        subject: emailSubject,
        html: emailBody
      });
    }

    // Send SMS confirmation
    if (customerPhone) {
      let smsBody = `Your appointment is confirmed for ${appointmentTime} with ${staffFirstName}`;
      if (partyName && weddingDate) {
        smsBody += ` for ${partyName} (Wedding: ${weddingDate})`;
      }
      smsBody += `. Riverside Men's Shop (716-833-8401)`;
      
      await sendSMS({
        to: customerPhone,
        body: smsBody
      });
    }

    logger.info(`Sent appointment confirmation to customer for appointment ${appointmentId}`);
  } catch (error) {
    logger.error(`Error sending appointment confirmation for appointment ${appointmentId}:`, error);
  }
} 

/**
 * Send cancellation notification to staff
 */
export async function sendCancellationNotificationToStaff(appointment: any): Promise<void> {
  try {
    if (!appointment.tailor) {
      logger.warn(`No staff assigned to appointment ${appointment.id} for cancellation notification`);
      return;
    }

    const customerName = appointment.individualCustomer 
      ? `${appointment.individualCustomer.first_name || ''} ${appointment.individualCustomer.last_name || ''}`.trim()
      : appointment.member 
        ? `${appointment.member.notes || `Party Member (${appointment.member.role})`}`
        : 'Customer';

    const appointmentTime = appointment.dateTime.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    const emailSubject = `Appointment Cancellation - ${customerName}`;
    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Appointment Cancellation Notice</h2>
          <p>The following appointment has been canceled:</p>
          
          <div style="background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Customer:</strong> ${customerName}</p>
            <p><strong>Original Date & Time:</strong> ${appointmentTime}</p>
            <p><strong>Type:</strong> ${appointment.type || 'Fitting'}</p>
            ${appointment.notes ? `<p><strong>Notes:</strong> ${appointment.notes}</p>` : ''}
          </div>
          
          <p>This time slot is now available for other appointments.</p>
          
          <p>Best regards,<br>Riverside Men's Shop System<br>716-833-8401</p>
        </body>
      </html>
    `;

    const smsBody = `Appointment canceled: ${customerName} for ${appointmentTime}. Time slot now available.`;

    // Send email notification
    if (appointment.tailor.email) {
      await sendEmail({
        to: appointment.tailor.email,
        subject: emailSubject,
        html: emailBody
      });
    }

    // Send SMS notification (if phone is available)
    if (appointment.tailor.phone) {
      await sendSMS({
        to: appointment.tailor.phone,
        body: smsBody
      });
    }

    logger.info(`Sent cancellation notification to staff member ${appointment.tailor.name} for appointment ${appointment.id}`);
  } catch (error) {
    logger.error(`Error sending cancellation notification to staff for appointment ${appointment.id}:`, error);
  }
} 