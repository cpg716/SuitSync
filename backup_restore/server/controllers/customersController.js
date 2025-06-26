const prisma = require('../prismaClient');

exports.listCustomers = async (req, res) => {
  try {
    const customers = await prisma.customer.findMany({
      include: { parties: true, alterationJobs: true }
    });
    res.json(customers);
  } catch (err) {
    console.error('Error listing customers:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
};

exports.getCustomer = async (req, res) => {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: parseInt(req.params.id) },
      include: { parties: true, alterationJobs: true }
    });
    if (!customer) return res.status(404).json({ error: 'Customer not found' });
    res.json(customer);
  } catch (err) {
    console.error('Error getting customer:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
}; 