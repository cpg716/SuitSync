import { PrismaClient } from '@prisma/client';
import { createLightspeedClient } from '../lightspeedClient';
import logger from '../utils/logger';

const prisma = new PrismaClient();

interface CustomFieldDefinition {
  name: string;
  label: string;
  type: 'text' | 'textarea' | 'number' | 'date' | 'boolean' | 'select';
  options?: string[];
  required?: boolean;
}

// SuitSync custom fields for Lightspeed customers
const SUITSYNC_CUSTOM_FIELDS: CustomFieldDefinition[] = [
  {
    name: 'suitsync_next_appointment',
    label: 'Next Appointment',
    type: 'text'
  },
  {
    name: 'suitsync_party_name',
    label: 'Wedding Party',
    type: 'text'
  },
  {
    name: 'suitsync_measurements_status',
    label: 'Measurements Status',
    type: 'select',
    options: ['Not Taken', 'Initial', 'Final', 'Complete']
  },
  {
    name: 'suitsync_alteration_status',
    label: 'Alteration Status',
    type: 'select',
    options: ['Not Started', 'In Progress', 'Complete', 'Picked Up']
  },
  {
    name: 'suitsync_wedding_date',
    label: 'Wedding Date',
    type: 'date'
  },
  {
    name: 'suitsync_role',
    label: 'Wedding Role',
    type: 'select',
    options: ['Groom', 'Best Man', 'Groomsman', 'Father of Bride', 'Father of Groom', 'Other']
  },
  {
    name: 'suitsync_appointments_history',
    label: 'Appointments History',
    type: 'textarea'
  },
  {
    name: 'suitsync_measurements_json',
    label: 'Measurements Data',
    type: 'textarea'
  }
];

class LightspeedCustomFieldsService {
  private customFieldCache: Map<string, any> = new Map();

  /**
   * Initialize all SuitSync custom fields in Lightspeed
   */
  async initializeCustomFields(req: any): Promise<void> {
    try {
      const client = createLightspeedClient(req);
      
      for (const fieldDef of SUITSYNC_CUSTOM_FIELDS) {
        await this.getOrCreateCustomField(client, fieldDef);
      }
      
      logger.info('Successfully initialized all SuitSync custom fields in Lightspeed');
    } catch (error) {
      logger.error('Error initializing custom fields:', error);
      throw error;
    }
  }

  /**
   * Get or create a custom field in Lightspeed
   */
  private async getOrCreateCustomField(client: any, fieldDef: CustomFieldDefinition): Promise<any> {
    try {
      // Check cache first
      if (this.customFieldCache.has(fieldDef.name)) {
        return this.customFieldCache.get(fieldDef.name);
      }

      // Search for existing field
      const existingFields = await client.get('/CustomFields', {
        name: fieldDef.name,
        resource: 'Customer'
      });

      let customField;
      if (existingFields.data && existingFields.data.length > 0) {
        customField = existingFields.data[0];
      } else {
        // Create new custom field
        const fieldData = {
          name: fieldDef.name,
          label: fieldDef.label,
          type: fieldDef.type,
          resource: 'Customer',
          required: fieldDef.required || false,
          ...(fieldDef.options && { options: fieldDef.options.join(',') })
        };

        const response = await client.post('/CustomFields', fieldData);
        customField = response.data;
        logger.info(`Created custom field: ${fieldDef.name}`);
      }

      // Cache the field
      this.customFieldCache.set(fieldDef.name, customField);
      return customField;
    } catch (error) {
      logger.error(`Error creating custom field ${fieldDef.name}:`, error);
      throw error;
    }
  }

  /**
   * Sync customer data to Lightspeed custom fields
   */
  async syncCustomerToLightspeed(req: any, customerId: number): Promise<void> {
    try {
      const client = createLightspeedClient(req);
      
      // Get customer with all related data
      const customer = await prisma.customer.findUnique({
        where: { id: customerId },
        include: {
          parties: {
            include: {
              appointments: {
                orderBy: { dateTime: 'asc' },
                include: { tailor: true }
              }
            }
          },
          individualAppointments: {
            orderBy: { dateTime: 'asc' },
            include: { tailor: true }
          },
          alterationJobs: {
            include: { jobParts: true }
          },
          measurements: true
        }
      });

      if (!customer || !customer.lightspeedId) {
        logger.warn(`Customer ${customerId} not found or missing Lightspeed ID`);
        return;
      }

      // Prepare custom field updates
      const customFieldUpdates = await this.prepareCustomFieldUpdates(customer);
      
      // Update each custom field
      for (const [fieldName, value] of Object.entries(customFieldUpdates)) {
        await this.updateCustomFieldValue(client, customer.lightspeedId, fieldName, value);
      }

      logger.info(`Successfully synced customer ${customerId} to Lightspeed custom fields`);
    } catch (error) {
      logger.error(`Error syncing customer ${customerId} to Lightspeed:`, error);
      throw error;
    }
  }

  /**
   * Prepare custom field updates based on customer data
   */
  private async prepareCustomFieldUpdates(customer: any): Promise<Record<string, string>> {
    const updates: Record<string, string> = {};

    // Next appointment
    const allAppointments = [
      ...(customer.parties?.flatMap((p: any) => p.appointments) || []),
      ...(customer.individualAppointments || [])
    ].filter((apt: any) => new Date(apt.dateTime) > new Date())
      .sort((a: any, b: any) => new Date(a.dateTime).getTime() - new Date(b.dateTime).getTime());

    if (allAppointments.length > 0) {
      const nextAppt = allAppointments[0];
      updates.suitsync_next_appointment = `${nextAppt.type} - ${new Date(nextAppt.dateTime).toLocaleDateString()} ${new Date(nextAppt.dateTime).toLocaleTimeString()}`;
    } else {
      updates.suitsync_next_appointment = 'No upcoming appointments';
    }

    // Party information
    if (customer.parties && customer.parties.length > 0) {
      const party = customer.parties[0];
      updates.suitsync_party_name = party.name;
      updates.suitsync_wedding_date = new Date(party.eventDate).toISOString().split('T')[0];
    }

    // Measurements status
    if (customer.measurements) {
      updates.suitsync_measurements_status = 'Complete';
      updates.suitsync_measurements_json = JSON.stringify({
        chest: customer.measurements.chest,
        waistJacket: customer.measurements.waistJacket,
        shoulderWidth: customer.measurements.shoulderWidth,
        sleeveLength: customer.measurements.sleeveLength,
        updatedAt: customer.measurements.updatedAt
      });
    } else {
      updates.suitsync_measurements_status = 'Not Taken';
    }

    // Alteration status
    if (customer.alterationJobs && customer.alterationJobs.length > 0) {
      const latestJob = customer.alterationJobs
        .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
      
      const statusMap = {
        'NOT_STARTED': 'Not Started',
        'IN_PROGRESS': 'In Progress',
        'COMPLETE': 'Complete',
        'PICKED_UP': 'Picked Up'
      };
      
      updates.suitsync_alteration_status = statusMap[latestJob.status as keyof typeof statusMap] || 'Not Started';
    } else {
      updates.suitsync_alteration_status = 'Not Started';
    }

    // Appointments history
    const appointmentHistory = allAppointments.map(apt => 
      `${apt.type} - ${new Date(apt.dateTime).toLocaleDateString()} (${apt.tailor?.name || 'Unassigned'})`
    ).join('\\n');
    
    updates.suitsync_appointments_history = appointmentHistory || 'No appointments';

    return updates;
  }

  /**
   * Update a specific custom field value
   */
  private async updateCustomFieldValue(client: any, lightspeedCustomerId: string, fieldName: string, value: string): Promise<void> {
    try {
      const customField = await this.getCustomFieldByName(client, fieldName);
      if (!customField) {
        logger.warn(`Custom field ${fieldName} not found`);
        return;
      }

      // Update the custom field value for the customer
      await client.put(`/Customers/${lightspeedCustomerId}/CustomFieldValues/${customField.customFieldID}`, {
        value: value
      });

    } catch (error) {
      logger.error(`Error updating custom field ${fieldName}:`, error);
      // Don't throw - continue with other fields
    }
  }

  /**
   * Get custom field by name
   */
  private async getCustomFieldByName(client: any, fieldName: string): Promise<any> {
    if (this.customFieldCache.has(fieldName)) {
      return this.customFieldCache.get(fieldName);
    }

    try {
      const response = await client.get('/CustomFields', {
        name: fieldName,
        resource: 'Customer'
      });

      if (response.data && response.data.length > 0) {
        const field = response.data[0];
        this.customFieldCache.set(fieldName, field);
        return field;
      }
    } catch (error) {
      logger.error(`Error fetching custom field ${fieldName}:`, error);
    }

    return null;
  }

  /**
   * Sync appointment data to Lightspeed when appointment is created/updated
   */
  async syncAppointmentToLightspeed(req: any, appointmentId: number): Promise<void> {
    try {
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          party: { include: { customer: true } },
          individualCustomer: true,
          member: true,
          tailor: true
        }
      });

      if (!appointment) {
        logger.warn(`Appointment ${appointmentId} not found`);
        return;
      }

      // Determine which customer to sync
      let customerId: number | null = null;
      
      if (appointment.individualCustomerId) {
        customerId = appointment.individualCustomerId;
      } else if (appointment.party?.customer) {
        customerId = appointment.party.customer.id;
      }

      if (customerId) {
        await this.syncCustomerToLightspeed(req, customerId);
      }

    } catch (error) {
      logger.error(`Error syncing appointment ${appointmentId} to Lightspeed:`, error);
      throw error;
    }
  }

  /**
   * Bulk sync all customers to Lightspeed
   */
  async bulkSyncCustomersToLightspeed(req: any): Promise<{ success: number; errors: number }> {
    let success = 0;
    let errors = 0;

    try {
      const customers = await prisma.customer.findMany({
        where: {
          lightspeedId: { not: null as any }
        },
        select: { id: true }
      });

      for (const customer of customers) {
        try {
          await this.syncCustomerToLightspeed(req, customer.id);
          success++;
        } catch (error) {
          logger.error(`Error syncing customer ${customer.id}:`, error);
          errors++;
        }
      }

      logger.info(`Bulk sync completed: ${success} success, ${errors} errors`);
    } catch (error) {
      logger.error('Error in bulk sync:', error);
      throw error;
    }

    return { success, errors };
  }
}

export const lightspeedCustomFieldsService = new LightspeedCustomFieldsService();